"""Consume `REPLY_JOB_QUEUE_KEY` (Redis), genera respuesta y envía por Twilio REST.

Ejecutar desde el directorio de la API:

    python -m app.workers.reply_queue_worker
"""

from __future__ import annotations

import asyncio
import json
import logging
import uuid

import redis.asyncio as redis_async
from sqlalchemy import select

from app.agent.gemini_agent import _looks_like_quota_error
from app.agent.tool_handlers import generate_assistant_reply
from app.config import get_settings
from app.constants import REPLY_JOB_QUEUE_KEY
from app.db.session import SessionLocal
from app.models import Conversation, Message, MessageDirection
from app.services.agent_channel_voice import agent_disruption_message
from app.services.conversation import add_message
from app.services.effective_settings import build_effective_settings
from app.services.twilio_outbound import send_whatsapp_text_reply

logger = logging.getLogger(__name__)


async def _process_job_payload(payload: str) -> None:
    data = json.loads(payload)
    cid = uuid.UUID(str(data["conversation_id"]))
    settings = get_settings()
    timeout = settings.webhook_processing_timeout_seconds

    async with SessionLocal() as session:
        async with session.begin():
            conv = await session.get(Conversation, cid)
            if conv is None:
                logger.warning("reply worker: conversation %s not found", cid)
                return

            stmt = (
                select(Message)
                .where(
                    Message.conversation_id == cid,
                    Message.direction == MessageDirection.inbound,
                )
                .order_by(Message.created_at.desc())
                .limit(1)
            )
            last_in = (await session.execute(stmt)).scalar_one_or_none()
            if last_in is None:
                logger.warning("reply worker: no inbound for conversation %s", cid)
                return

            body = last_in.body
            eff = await build_effective_settings(session, conv.workspace_id)
            try:
                async with asyncio.timeout(timeout):
                    reply = await generate_assistant_reply(
                        session, conversation=conv, user_text=body
                    )
                conv.last_agent_llm_status = "ok"
                conv.last_agent_llm_error = None
            except TimeoutError:
                logger.warning("reply worker timeout conversation_id=%s", cid)
                reply = agent_disruption_message("timeout", eff)
                conv.last_agent_llm_status = "error"
                conv.last_agent_llm_error = "timeout"
            except Exception as exc:  # noqa: BLE001
                if _looks_like_quota_error(exc):
                    reply = agent_disruption_message("quota", eff)
                else:
                    logger.exception("reply worker LLM error conversation_id=%s", cid)
                    reply = agent_disruption_message("technical", eff)
                conv.last_agent_llm_status = "error"
                conv.last_agent_llm_error = str(exc)[:900]

            await add_message(
                session,
                conversation_id=conv.id,
                direction=MessageDirection.outbound,
                body=reply,
                twilio_message_sid=None,
            )

        eff_send = await build_effective_settings(session, conv.workspace_id)
        await send_whatsapp_text_reply(eff=eff_send, conv=conv, body=reply)


async def run_forever() -> None:
    settings = get_settings()
    url = settings.redis_url.strip()
    if not url:
        raise SystemExit("REDIS_URL no configurada; no se puede arrancar el worker.")

    client = redis_async.from_url(url, decode_responses=True)
    logger.info("reply worker listening on %s", REPLY_JOB_QUEUE_KEY)
    try:
        while True:
            item = await client.brpop(REPLY_JOB_QUEUE_KEY, timeout=10)
            if item is None:
                continue
            _, payload = item
            try:
                await _process_job_payload(payload)
            except Exception:
                logger.exception("reply worker job failed payload=%s", payload[:200])
    finally:
        await client.aclose()


def main() -> None:
    logging.basicConfig(level=logging.INFO)
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()
