"""Recordatorios de cita por WhatsApp (Twilio REST), según plantilla y horas antes del inicio."""

from __future__ import annotations

import logging
from datetime import UTC, datetime, timedelta
from zoneinfo import ZoneInfo

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models import Appointment, Conversation
from app.services.effective_settings import build_effective_settings
from app.services.twilio_outbound import send_whatsapp_text_reply

logger = logging.getLogger(__name__)


def _format_local(dt_utc: datetime, tz_name: str) -> str:
    try:
        tz = ZoneInfo((tz_name or "UTC").strip() or "UTC")
    except Exception:
        tz = UTC
    return dt_utc.astimezone(tz).strftime("%Y-%m-%d %H:%M")


def _render_template(
    template: str,
    *,
    client_name: str | None,
    service_label: str | None,
    start_local: str,
    business_name: str,
) -> str:
    t = (template or "").strip()
    if not t:
        t = "Recordatorio: tienes una cita el {start_local}."
    return (
        t.replace("{client_name}", (client_name or "Cliente").strip())
        .replace("{service_label}", (service_label or "").strip())
        .replace("{start_local}", start_local)
        .replace("{business_name}", (business_name or "").strip())
    )[:1550]


async def run_appointment_reminder_tick(session: AsyncSession) -> int:
    """Busca citas confirmadas sin recordatorio y dentro de la ventana; envía y marca envío."""
    now = datetime.now(UTC)
    horizon_end = now + timedelta(hours=72)

    stmt = (
        select(Appointment)
        .options(selectinload(Appointment.conversation))
        .where(
            Appointment.status == "confirmed",
            Appointment.reminder_sent_at.is_(None),
            Appointment.start_at > now,
            Appointment.start_at <= horizon_end,
        )
        .limit(50)
    )
    appts = list((await session.execute(stmt)).scalars().all())
    sent = 0
    for appt in appts:
        conv = appt.conversation
        if conv is None:
            continue
        eff = await build_effective_settings(session, conv.workspace_id)
        hours_before = max(0, int(eff.reminder_hours_before or 24))
        trigger_at = appt.start_at - timedelta(hours=hours_before)
        if now < trigger_at:
            continue
        tz_appt = appt.time_zone or eff.business_timezone or "America/Lima"
        start_local = _format_local(appt.start_at, tz_appt)
        body = _render_template(
            eff.reminder_message_template,
            client_name=appt.client_name,
            service_label=appt.service_label,
            start_local=start_local,
            business_name=eff.business_name,
        )
        try:
            await send_whatsapp_text_reply(eff=eff, conv=conv, body=body)
            appt.reminder_sent_at = now
            await session.commit()
            sent += 1
        except Exception:
            await session.rollback()
            logger.exception(
                "reminder send failed appointment_id=%s conversation_id=%s",
                appt.id,
                conv.id,
            )
    return sent
