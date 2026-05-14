from __future__ import annotations

import asyncio
import html
import json
import logging
import uuid
from typing import Any

from openai import RateLimitError
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.agent.gemini_agent import _looks_like_quota_error, gemini_quota_user_message
from app.agent.tool_handlers import generate_assistant_reply
from app.config import get_settings
from app.constants import REPLY_JOB_QUEUE_KEY
from app.models import MessageDirection
from app.services.conversation import (
    add_message,
    get_inbound_by_twilio_sid,
    get_or_create_conversation,
)

logger = logging.getLogger(__name__)


def twiml_message(text: str) -> str:
    trimmed = (text or "")[:1500]
    safe = html.escape(trimmed, quote=True)
    return f'<?xml version="1.0" encoding="UTF-8"?><Response><Message>{safe}</Message></Response>'


def twiml_empty() -> str:
    return '<?xml version="1.0" encoding="UTF-8"?><Response></Response>'


async def _enqueue_reply_job(conversation_id: uuid.UUID) -> None:
    import redis.asyncio as redis_async

    url = get_settings().redis_url.strip()
    if not url:
        raise RuntimeError("REDIS_URL requerido para webhook_async_replies")
    client = redis_async.from_url(url, decode_responses=True)
    try:
        await client.rpush(REPLY_JOB_QUEUE_KEY, json.dumps({"conversation_id": str(conversation_id)}))
    finally:
        await client.aclose()


async def enqueue_inbound_whatsapp_reply(
    session: AsyncSession, form: dict[str, Any], *, workspace_id: uuid.UUID
) -> str:
    """Persiste mensaje entrante y encola generación de respuesta (worker + REST Twilio)."""
    message_sid = str(form.get("MessageSid") or "")
    from_ = str(form.get("From") or "")
    to_ = str(form.get("To") or "")
    body = str(form.get("Body") or "")
    account_sid = str(form.get("AccountSid") or "") or None

    if not from_ or not to_:
        return twiml_empty()

    if message_sid:
        existing = await get_inbound_by_twilio_sid(session, message_sid)
        if existing:
            return twiml_empty()

    conv = await get_or_create_conversation(
        session,
        workspace_id=workspace_id,
        twilio_from=from_,
        twilio_to=to_,
        account_sid=account_sid,
    )

    try:
        await add_message(
            session,
            conversation_id=conv.id,
            direction=MessageDirection.inbound,
            body=body,
            twilio_message_sid=message_sid or None,
        )
    except IntegrityError:
        return twiml_empty()

    await _enqueue_reply_job(conv.id)
    return twiml_empty()


async def process_inbound_whatsapp(
    session: AsyncSession, form: dict[str, Any], *, workspace_id: uuid.UUID
) -> str:
    message_sid = str(form.get("MessageSid") or "")
    from_ = str(form.get("From") or "")
    to_ = str(form.get("To") or "")
    body = str(form.get("Body") or "")
    account_sid = str(form.get("AccountSid") or "") or None

    if not from_ or not to_:
        return twiml_empty()

    if message_sid:
        existing = await get_inbound_by_twilio_sid(session, message_sid)
        if existing:
            return twiml_empty()

    conv = await get_or_create_conversation(
        session,
        workspace_id=workspace_id,
        twilio_from=from_,
        twilio_to=to_,
        account_sid=account_sid,
    )

    try:
        await add_message(
            session,
            conversation_id=conv.id,
            direction=MessageDirection.inbound,
            body=body,
            twilio_message_sid=message_sid or None,
        )
    except IntegrityError:
        return twiml_empty()

    timeout = get_settings().webhook_processing_timeout_seconds
    try:
        async with asyncio.timeout(timeout):
            reply = await generate_assistant_reply(session, conversation=conv, user_text=body)
        conv.last_agent_llm_status = "ok"
        conv.last_agent_llm_error = None
    except TimeoutError:
        logger.warning("webhook LLM timeout conversation_id=%s (%.1fs)", conv.id, timeout)
        reply = (
            "Tu mensaje llegó pero la respuesta automática tardó demasiado. "
            "Intenta de nuevo en un momento o un asesor te contactará."
        )
        conv.last_agent_llm_status = "error"
        conv.last_agent_llm_error = "timeout"
    except RateLimitError as exc:
        logger.warning("OpenAI rate limit conversation_id=%s: %s", conv.id, exc)
        reply = (
            "El servicio de IA está temporalmente saturado. Intenta de nuevo en unos minutos; "
            "un asesor también puede ayudarte."
        )
        conv.last_agent_llm_status = "error"
        conv.last_agent_llm_error = str(exc)[:900]
    except Exception as exc:  # noqa: BLE001
        if _looks_like_quota_error(exc):
            logger.warning("LLM quota conversation_id=%s: %s", conv.id, exc)
            reply = gemini_quota_user_message(exc)
        else:
            logger.exception("generate_assistant_reply failed conversation_id=%s", conv.id)
            reply = (
                "Disculpa, tuvimos un problema técnico al generar la respuesta. "
                "Un asesor humano revisará tu mensaje y te contactará pronto."
            )
        conv.last_agent_llm_status = "error"
        conv.last_agent_llm_error = str(exc)[:900]
    await add_message(
        session,
        conversation_id=conv.id,
        direction=MessageDirection.outbound,
        body=reply,
        twilio_message_sid=None,
    )
    await session.flush()
    return twiml_message(reply)
