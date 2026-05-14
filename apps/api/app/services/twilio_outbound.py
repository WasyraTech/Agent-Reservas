from __future__ import annotations

import asyncio
import logging

from twilio.rest import Client

from app.models import Conversation
from app.services.effective_settings import EffectiveSettings

logger = logging.getLogger(__name__)


async def send_whatsapp_text_reply(*, eff: EffectiveSettings, conv: Conversation, body: str) -> None:
    """Envía un mensaje saliente por la API REST (WhatsApp sandbox / prod)."""
    sid = (eff.twilio_account_sid or "").strip()
    token = (eff.twilio_auth_token or "").strip()
    if not sid or not token:
        logger.warning("Twilio credentials missing; skip REST send conversation_id=%s", conv.id)
        return

    def _send() -> None:
        client = Client(sid, token)
        client.messages.create(from_=conv.twilio_to, to=conv.twilio_from, body=(body or "")[:1600])

    await asyncio.to_thread(_send)
