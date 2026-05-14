from __future__ import annotations

import asyncio
import json
import time
import uuid
from datetime import UTC, date, datetime, timedelta
from typing import Any
from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

from openai import AsyncOpenAI
from pydantic import BaseModel, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.integrations import google_calendar as gcal
from app.models import (
    Appointment,
    Conversation,
    ConversationStatus,
    Handoff,
    HandoffStatus,
    MessageDirection,
    ToolInvocation,
)
from app.services.conversation import list_recent_messages
from app.services.effective_settings import EffectiveSettings, build_effective_settings


def normalize_phone(value: str) -> str:
    return value.removeprefix("whatsapp:").strip()


class GetAvailableSlotsArgs(BaseModel):
    date: str = Field(description="Día a consultar en formato YYYY-MM-DD.")
    slot_duration_minutes: int = Field(default=30, ge=15, le=180)
    time_zone: str = Field(default="America/Lima", description="Zona IANA, ej. America/Lima.")
    window_start_hour: int = Field(default=9, ge=0, le=23)
    window_end_hour: int = Field(default=17, ge=1, le=24)
    service_name: str | None = Field(
        default=None,
        description=(
            "Si el cliente ya eligió un servicio de la lista del panel, pásalo aquí "
            "para alinear la duración del hueco con ese servicio."
        ),
    )


class BookAppointmentArgs(BaseModel):
    start_datetime_iso: str = Field(
        description=(
            "Inicio en ISO 8601. Ideal: copia exacta de book_start_datetime_iso del hueco "
            "elegido en la última respuesta get_available_slots. Si omites zona, se asume "
            "time_zone del negocio."
        ),
    )
    end_datetime_iso: str = Field(
        description=(
            "Fin en ISO 8601. Ideal: copia exacta de book_end_datetime_iso del mismo hueco. "
            "Debe ser el mismo día calendario local que start en time_zone."
        ),
    )
    client_name: str = Field(description="Nombre del cliente que confirma la cita.")
    service_label: str | None = Field(
        default=None,
        description=(
            "Obligatorio si el panel tiene lista de servicios estructurados: el nombre o motivo "
            "que el cliente confirmó (debe coincidir con la conversación)."
        ),
    )
    client_email: str | None = None
    notes: str | None = None
    time_zone: str = Field(
        default="America/Lima",
        description="Zona IANA del negocio para el evento en Calendar.",
    )


class ListMyAppointmentsArgs(BaseModel):
    limit: int = Field(default=8, ge=1, le=20)


class CancelAppointmentArgs(BaseModel):
    appointment_id: str = Field(description="UUID de la cita (devuelto por book_appointment o list_my_appointments).")


class RescheduleAppointmentArgs(BaseModel):
    appointment_id: str
    new_start_datetime_iso: str
    new_end_datetime_iso: str


class HandoffArgs(BaseModel):
    reason: str = ""


TOOL_DEFINITIONS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "get_available_slots",
            "description": (
                "Consulta huecos libres para un día concreto según Google Calendar del negocio "
                "y citas ya registradas. Úsala antes de proponer horarios concretos. "
                "El parámetro date debe ser hoy o una fecha futura en time_zone; fechas pasadas "
                "devuelven error. "
                "Si el negocio tiene servicios en el panel, primero aclara con el usuario "
                "cuál quiere; luego pasa service_name para que la duración del hueco coincida "
                "con ese servicio cuando sea posible. "
                "En la respuesta ok, cada slot incluye book_start_datetime_iso y "
                "book_end_datetime_iso: al reservar, pásalas tal cual a book_appointment. "
                "Si el panel no tiene Calendar configurado, la herramienta lo indicará: "
                "entonces pregunta preferencias y no inventes disponibilidad."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "date": {"type": "string", "description": "YYYY-MM-DD"},
                    "slot_duration_minutes": {"type": "integer", "default": 30},
                    "time_zone": {"type": "string", "default": "America/Lima"},
                    "window_start_hour": {"type": "integer", "default": 9},
                    "window_end_hour": {"type": "integer", "default": 17},
                    "service_name": {
                        "type": "string",
                        "description": (
                            "Nombre del servicio elegido (lista del panel), para ajustar "
                            "slot_duration_minutes automáticamente."
                        ),
                    },
                },
                "required": ["date"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "book_appointment",
            "description": (
                "Registra una cita confirmada por el usuario en esta conversación. "
                "Solo después de acordar inicio y fin claros y de saber qué servicio o motivo "
                "de visita quiere el cliente (si el panel lista servicios, service_label es "
                "obligatorio y debe reflejar lo acordado). Crea evento en Google Calendar "
                "si está configurado. Falla si el hueco ya está ocupado."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "start_datetime_iso": {
                        "type": "string",
                        "description": (
                            "Copia book_start_datetime_iso del slot elegido en get_available_slots "
                            "(misma cadena). No uses otra fecha ni la de «hoy» salvo que el usuario "
                            "haya cambiado de día."
                        ),
                    },
                    "end_datetime_iso": {
                        "type": "string",
                        "description": (
                            "Copia book_end_datetime_iso del mismo slot que start_datetime_iso."
                        ),
                    },
                    "client_name": {"type": "string"},
                    "service_label": {
                        "type": "string",
                        "description": (
                            "Servicio o motivo confirmado por el usuario. Obligatorio cuando "
                            "el panel tiene servicios estructurados."
                        ),
                    },
                    "client_email": {"type": "string"},
                    "notes": {"type": "string"},
                    "time_zone": {"type": "string", "default": "America/Lima"},
                },
                "required": [
                    "start_datetime_iso",
                    "end_datetime_iso",
                    "client_name",
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "list_my_appointments",
            "description": (
                "Lista las citas activas (confirmadas) vinculadas a este chat de WhatsApp, "
                "más recientes primero. Útil para cancelar o reprogramar."
            ),
            "parameters": {
                "type": "object",
                "properties": {"limit": {"type": "integer", "default": 8}},
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "cancel_appointment",
            "description": (
                "Cancela una cita de ESTE chat. Requiere el appointment_id (UUID). "
                "Elimina o actualiza el evento en Google Calendar si existía."
            ),
            "parameters": {
                "type": "object",
                "properties": {"appointment_id": {"type": "string"}},
                "required": ["appointment_id"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "reschedule_appointment",
            "description": (
                "Reprograma una cita existente de ESTE chat a un nuevo rango horario. "
                "Verifica solapes igual que al crear."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "appointment_id": {"type": "string"},
                    "new_start_datetime_iso": {"type": "string"},
                    "new_end_datetime_iso": {"type": "string"},
                },
                "required": [
                    "appointment_id",
                    "new_start_datetime_iso",
                    "new_end_datetime_iso",
                ],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "request_human_handoff",
            "description": (
                "Pasa la conversación a un humano del negocio. Úsalo si piden persona, "
                "reclamo fuerte, caso fuera de políticas o falla repetida de agenda."
            ),
            "parameters": {
                "type": "object",
                "properties": {"reason": {"type": "string"}},
            },
        },
    },
]


def parse_datetime_iso(value: str) -> datetime:
    s = (value or "").strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=UTC)
    return dt.astimezone(UTC)


def parse_datetime_iso_for_calendar(value: str, default_tz: str) -> datetime:
    """ISO 8601 → instante UTC.

    Si el string no trae zona horaria, se interpreta como **hora local del negocio**
    (`default_tz`, p. ej. America/Lima), no como UTC, para no desplazar día/hora al reservar.
    """
    s = (value or "").strip().replace("Z", "+00:00")
    dt = datetime.fromisoformat(s)
    if dt.tzinfo is None:
        try:
            tzinfo = ZoneInfo((default_tz or "America/Lima").strip())
        except ZoneInfoNotFoundError:
            tzinfo = UTC
        dt = dt.replace(tzinfo=tzinfo)
    return dt.astimezone(UTC)


def _iso_utc_z(dt: datetime) -> str:
    return dt.astimezone(UTC).isoformat().replace("+00:00", "Z")


def _match_service_duration_minutes(
    eff: EffectiveSettings, service_name: str | None
) -> tuple[int | None, str | None]:
    """Resuelve duración (minutos) desde la lista estructurada del panel.

    Devuelve (minutos, motivo) donde motivo es None, \"ambiguous\" o \"unknown\" si minutos
    es None.
    """
    raw = (service_name or "").strip()
    if not raw:
        return None, None
    key = raw.lower()
    services = eff.services()
    if not services:
        return None, None
    for s in services:
        nm = (s.name or "").strip()
        if nm.lower() == key:
            return max(15, min(180, int(s.duration_minutes))), None
    contained = [
        s
        for s in services
        if key in s.name.strip().lower() or s.name.strip().lower() in key
    ]
    if len(contained) == 1:
        return max(15, min(180, int(contained[0].duration_minutes))), None
    if len(contained) > 1:
        return None, "ambiguous"
    return None, "unknown"


def _booking_service_label_gate(
    eff: EffectiveSettings, service_label: str | None
) -> dict[str, Any] | None:
    """Si hay servicios estructurados, exige service_label antes de persistir la cita."""
    structured = eff.services()
    if not structured:
        return None
    if (service_label or "").strip():
        return None
    names = [s.name.strip() for s in structured if s.name.strip()]
    return {
        "ok": False,
        "error": "missing_service_label",
        "message": (
            "El negocio tiene servicios en el panel. Primero pregunta al cliente cuál quiere "
            "(nombres de la lista) y solo entonces vuelve a llamar book_appointment con "
            "service_label rellenado con lo que confirmó."
        ),
        "services": names,
    }


def _slot_overlaps(
    slot_start: datetime, slot_end: datetime, busy: list[tuple[datetime, datetime]]
) -> bool:
    for bs, be in busy:
        if slot_start < be and slot_end > bs:
            return True
    return False


def _reject_if_slot_date_in_past(
    d: date, tz: ZoneInfo, *, requested_date: str, tz_name: str
) -> dict[str, Any] | None:
    """None si la fecha es hoy o futura en la zona dada; si no, payload de error para la herramienta."""
    today = datetime.now(tz).date()
    if d >= today:
        return None
    return {
        "ok": False,
        "error": "date_in_past",
        "message": (
            f"No se pueden consultar huecos para una fecha pasada ({requested_date}). "
            f"La fecha mínima es hoy ({today.isoformat()}) en la zona {tz_name}. "
            "Pide al usuario una fecha desde hoy en adelante."
        ),
        "requested_date": requested_date,
        "min_date": today.isoformat(),
        "time_zone": tz_name,
    }


async def _db_confirmed_busy(
    session: AsyncSession, utc_min: datetime, utc_max: datetime
) -> list[tuple[datetime, datetime]]:
    stmt = select(Appointment).where(
        Appointment.status == "confirmed",
        Appointment.start_at < utc_max,
        Appointment.end_at > utc_min,
    )
    rows = (await session.execute(stmt)).scalars().all()
    return [(a.start_at.astimezone(UTC), a.end_at.astimezone(UTC)) for a in rows]


async def _get_available_slots(
    session: AsyncSession,
    eff: EffectiveSettings,
    args: dict[str, Any],
) -> dict[str, Any]:
    parsed = GetAvailableSlotsArgs.model_validate(args)
    service_match_hint: str | None = None
    if (parsed.service_name or "").strip():
        d_m, res = _match_service_duration_minutes(eff, parsed.service_name)
        if d_m is not None:
            parsed = parsed.model_copy(update={"slot_duration_minutes": d_m})
        elif res == "ambiguous":
            service_match_hint = (
                "Varios servicios coinciden con ese nombre: pide al cliente el nombre exacto "
                "de la lista y reintenta con service_name; o fija slot_duration_minutes "
                "manualmente."
            )
        elif res == "unknown":
            service_match_hint = (
                "No se reconoció ese servicio en la lista del panel: usa un nombre de la lista "
                "o indica slot_duration_minutes según lo acordado con el cliente."
            )
    try:
        tz = ZoneInfo(parsed.time_zone)
    except ZoneInfoNotFoundError:
        return {"ok": False, "error": "invalid_time_zone", "time_zone": parsed.time_zone}
    try:
        d = date.fromisoformat(parsed.date.strip()[:10])
    except ValueError:
        return {"ok": False, "error": "invalid_date", "date": parsed.date}

    past_err = _reject_if_slot_date_in_past(
        d, tz, requested_date=parsed.date.strip()[:10], tz_name=parsed.time_zone
    )
    if past_err is not None:
        return past_err

    cal_id = eff.google_calendar_id.strip()
    sa_json = eff.google_service_account_json.strip()
    if not gcal.calendar_credentials_configured(cal_id, sa_json):
        return {
            "ok": False,
            "configured": False,
            "message": (
                "Google Calendar no está configurado en el panel (ID del calendario + JSON de "
                "cuenta de servicio). Sin eso no hay huecos reales: pregunta al usuario "
                "preferencias y confirma con el negocio, o configura Calendar."
            ),
        }
    if parsed.window_end_hour <= parsed.window_start_hour:
        return {"ok": False, "error": "invalid_window_hours"}

    local_day_start = datetime(
        d.year, d.month, d.day, parsed.window_start_hour, 0, tzinfo=tz
    )
    local_day_end = datetime(d.year, d.month, d.day, parsed.window_end_hour, 0, tzinfo=tz)
    utc_min = local_day_start.astimezone(UTC)
    utc_max = local_day_end.astimezone(UTC)

    busy = await _db_confirmed_busy(session, utc_min, utc_max)
    try:
        gbusy = await gcal.freebusy_busy_intervals_utc(
            service_account_json=sa_json,
            calendar_id=cal_id,
            time_min=utc_min,
            time_max=utc_max,
        )
        busy = busy + gbusy
    except Exception as exc:  # noqa: BLE001
        return {"ok": False, "error": "google_freebusy_failed", "detail": str(exc)[:400]}

    duration = timedelta(minutes=parsed.slot_duration_minutes)
    slots: list[dict[str, str]] = []
    cur = local_day_start
    while cur + duration <= local_day_end:
        slot_end = cur + duration
        su = cur.astimezone(UTC)
        eu = slot_end.astimezone(UTC)
        if not _slot_overlaps(su, eu, busy):
            slots.append(
                {
                    "start_local": cur.isoformat(),
                    "end_local": slot_end.isoformat(),
                    "start_utc": su.isoformat(),
                    "end_utc": eu.isoformat(),
                    "book_start_datetime_iso": _iso_utc_z(su),
                    "book_end_datetime_iso": _iso_utc_z(eu),
                }
            )
        cur += duration
        if len(slots) >= 48:
            break

    out: dict[str, Any] = {
        "ok": True,
        "configured": True,
        "date": parsed.date,
        "time_zone": parsed.time_zone,
        "slot_duration_minutes": parsed.slot_duration_minutes,
        "slots": slots,
        "booking_instruction": (
            "Al confirmar con book_appointment, usa exactamente book_start_datetime_iso y "
            "book_end_datetime_iso del objeto en slots que coincida con el horario elegido "
            "(mismas cadenas). Así la fecha en Google Calendar coincide con el día consultado "
            f"({parsed.date}). No sustituyas por la fecha de hoy ni inventes otros ISO."
        ),
    }
    if service_match_hint:
        out["service_match_hint"] = service_match_hint
    return out


async def _overlap_confirmed(
    session: AsyncSession,
    start_utc: datetime,
    end_utc: datetime,
    *,
    exclude_appointment_id: uuid.UUID | None = None,
) -> bool:
    stmt = select(Appointment.id).where(
        Appointment.status == "confirmed",
        Appointment.start_at < end_utc,
        Appointment.end_at > start_utc,
    )
    if exclude_appointment_id is not None:
        stmt = stmt.where(Appointment.id != exclude_appointment_id)
    row = (await session.execute(stmt.limit(1))).scalar_one_or_none()
    return row is not None


async def _google_overlap(
    eff: EffectiveSettings, start_utc: datetime, end_utc: datetime
) -> bool:
    cal_id = eff.google_calendar_id.strip()
    sa_json = eff.google_service_account_json.strip()
    if not gcal.calendar_credentials_configured(cal_id, sa_json):
        return False
    busy = await gcal.freebusy_busy_intervals_utc(
        service_account_json=sa_json,
        calendar_id=cal_id,
        time_min=start_utc - timedelta(seconds=1),
        time_max=end_utc + timedelta(seconds=1),
    )
    return _slot_overlaps(start_utc, end_utc, busy)


async def _book_appointment(
    session: AsyncSession,
    conversation: Conversation,
    eff: EffectiveSettings,
    args: dict[str, Any],
) -> dict[str, Any]:
    parsed = BookAppointmentArgs.model_validate(args)
    gate = _booking_service_label_gate(eff, parsed.service_label)
    if gate is not None:
        return gate
    tz_use = (parsed.time_zone or "America/Lima").strip() or "America/Lima"
    start_utc = parse_datetime_iso_for_calendar(parsed.start_datetime_iso, tz_use)
    end_utc = parse_datetime_iso_for_calendar(parsed.end_datetime_iso, tz_use)
    if end_utc <= start_utc:
        return {"ok": False, "error": "end_before_start"}

    now_utc = datetime.now(UTC)
    if start_utc < now_utc:
        return {
            "ok": False,
            "error": "start_in_past",
            "message": (
                "No se puede confirmar una cita cuyo inicio ya pasó (fecha u hora en el pasado). "
                "Vuelve a consultar get_available_slots con una fecha válida y usa los ISO del "
                "hueco elegido."
            ),
        }

    if await _overlap_confirmed(session, start_utc, end_utc):
        return {"ok": False, "error": "slot_conflict_database"}

    if gcal.calendar_credentials_configured(
        eff.google_calendar_id, eff.google_service_account_json
    ):
        if await _google_overlap(eff, start_utc, end_utc):
            return {"ok": False, "error": "slot_conflict_google_calendar"}

    appt = Appointment(
        conversation_id=conversation.id,
        status="confirmed",
        start_at=start_utc,
        end_at=end_utc,
        time_zone=tz_use,
        client_name=parsed.client_name.strip(),
        client_email=(parsed.client_email or "").strip() or None,
        service_label=(parsed.service_label or "").strip() or None,
        notes=(parsed.notes or "").strip() or None,
        google_event_id=None,
    )
    try:
        async with session.begin_nested():
            session.add(appt)
            await session.flush()
    except IntegrityError:
        return {
            "ok": False,
            "error": "slot_conflict_database",
            "message": (
                "Ese horario acaba de ocuparse. Vuelve a llamar get_available_slots y elige otro hueco."
            ),
        }

    cal_id = eff.google_calendar_id.strip()
    sa_json = eff.google_service_account_json.strip()
    if gcal.calendar_credentials_configured(cal_id, sa_json):
        summary = f"{parsed.service_label or 'Cita'} — {parsed.client_name}"
        desc_parts = [
            f"WhatsApp: {conversation.twilio_from}",
            f"Conversación: {conversation.id}",
        ]
        if parsed.notes:
            desc_parts.append(f"Notas: {parsed.notes}")
        try:
            ev_id = await gcal.insert_calendar_event(
                service_account_json=sa_json,
                calendar_id=cal_id,
                summary=summary[:1020],
                description="\n".join(desc_parts)[:8000],
                start=start_utc,
                end=end_utc,
                time_zone=tz_use,
                attendee_email=appt.client_email,
            )
            appt.google_event_id = ev_id
            await session.flush()
        except Exception as exc:  # noqa: BLE001
            await session.delete(appt)
            await session.flush()
            return {"ok": False, "error": "google_create_failed", "detail": str(exc)[:400]}

    return {
        "ok": True,
        "appointment_id": str(appt.id),
        "start_utc": start_utc.isoformat(),
        "end_utc": end_utc.isoformat(),
        "google_event_id": appt.google_event_id,
    }


async def _list_my_appointments(
    session: AsyncSession, conversation: Conversation, args: dict[str, Any]
) -> dict[str, Any]:
    parsed = ListMyAppointmentsArgs.model_validate(args)
    stmt = (
        select(Appointment)
        .where(
            Appointment.conversation_id == conversation.id,
            Appointment.status == "confirmed",
        )
        .order_by(Appointment.start_at.desc())
        .limit(parsed.limit)
    )
    rows = (await session.execute(stmt)).scalars().all()
    return {
        "ok": True,
        "appointments": [
            {
                "appointment_id": str(a.id),
                "start_utc": a.start_at.astimezone(UTC).isoformat(),
                "end_utc": a.end_at.astimezone(UTC).isoformat(),
                "client_name": a.client_name,
                "service_label": a.service_label,
                "google_event_id": a.google_event_id,
            }
            for a in rows
        ],
    }


async def _cancel_appointment(
    session: AsyncSession,
    conversation: Conversation,
    eff: EffectiveSettings,
    args: dict[str, Any],
) -> dict[str, Any]:
    parsed = CancelAppointmentArgs.model_validate(args)
    try:
        aid = uuid.UUID(parsed.appointment_id.strip())
    except ValueError:
        return {"ok": False, "error": "invalid_appointment_id"}
    stmt = select(Appointment).where(
        Appointment.id == aid, Appointment.conversation_id == conversation.id
    )
    appt = (await session.execute(stmt)).scalar_one_or_none()
    if not appt:
        return {"ok": False, "error": "appointment_not_found"}
    if appt.status != "confirmed":
        return {"ok": False, "error": "already_cancelled"}

    cal_id = eff.google_calendar_id.strip()
    sa_json = eff.google_service_account_json.strip()
    if appt.google_event_id and gcal.calendar_credentials_configured(cal_id, sa_json):
        try:
            await gcal.delete_calendar_event(
                service_account_json=sa_json,
                calendar_id=cal_id,
                event_id=appt.google_event_id,
            )
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": "google_delete_failed", "detail": str(exc)[:400]}

    appt.status = "cancelled"
    await session.flush()
    return {"ok": True, "appointment_id": str(appt.id)}


async def _reschedule_appointment(
    session: AsyncSession,
    conversation: Conversation,
    eff: EffectiveSettings,
    args: dict[str, Any],
) -> dict[str, Any]:
    parsed = RescheduleAppointmentArgs.model_validate(args)
    try:
        aid = uuid.UUID(parsed.appointment_id.strip())
    except ValueError:
        return {"ok": False, "error": "invalid_appointment_id"}
    stmt = select(Appointment).where(
        Appointment.id == aid, Appointment.conversation_id == conversation.id
    )
    appt = (await session.execute(stmt)).scalar_one_or_none()
    if not appt:
        return {"ok": False, "error": "appointment_not_found"}
    if appt.status != "confirmed":
        return {"ok": False, "error": "not_active"}

    tz_res = (appt.time_zone or eff.business_timezone or "America/Lima").strip() or "America/Lima"
    new_start = parse_datetime_iso_for_calendar(parsed.new_start_datetime_iso, tz_res)
    new_end = parse_datetime_iso_for_calendar(parsed.new_end_datetime_iso, tz_res)
    if new_end <= new_start:
        return {"ok": False, "error": "end_before_start"}

    if new_start < datetime.now(UTC):
        return {
            "ok": False,
            "error": "start_in_past",
            "message": (
                "No se puede reprogramar una cita a un instante ya pasado. Elige un hueco futuro."
            ),
        }

    if await _overlap_confirmed(session, new_start, new_end, exclude_appointment_id=appt.id):
        return {"ok": False, "error": "slot_conflict_database"}

    cal_id = eff.google_calendar_id.strip()
    sa_json = eff.google_service_account_json.strip()
    if appt.google_event_id and gcal.calendar_credentials_configured(cal_id, sa_json):
        try:
            await gcal.patch_calendar_event_times(
                service_account_json=sa_json,
                calendar_id=cal_id,
                event_id=appt.google_event_id,
                start=new_start,
                end=new_end,
                time_zone=appt.time_zone or "America/Lima",
            )
        except Exception as exc:  # noqa: BLE001
            return {"ok": False, "error": "google_patch_failed", "detail": str(exc)[:400]}

    appt.start_at = new_start
    appt.end_at = new_end
    await session.flush()
    return {
        "ok": True,
        "appointment_id": str(appt.id),
        "start_utc": new_start.isoformat(),
        "end_utc": new_end.isoformat(),
    }


async def _request_handoff(
    session: AsyncSession, conversation: Conversation, args: dict[str, Any]
) -> dict[str, Any]:
    parsed = HandoffArgs.model_validate(args)
    session.add(
        Handoff(
            conversation_id=conversation.id,
            reason=parsed.reason or "user_requested",
            status=HandoffStatus.pending,
        )
    )
    conversation.status = ConversationStatus.handed_off
    await session.flush()
    return {"ok": True, "status": "handed_off"}


async def _log_tool(
    session: AsyncSession,
    *,
    conversation_id: uuid.UUID,
    tool_name: str,
    arguments: dict | None,
    result: dict | None,
    error: str | None,
    duration_ms: int | None,
) -> None:
    session.add(
        ToolInvocation(
            conversation_id=conversation_id,
            tool_name=tool_name,
            arguments=arguments,
            result=result,
            error=error,
            duration_ms=duration_ms,
        )
    )


async def execute_tool(
    session: AsyncSession,
    *,
    conversation: Conversation,
    tool_name: str,
    raw_arguments: str,
    eff: EffectiveSettings | None = None,
) -> str:
    started = time.perf_counter()
    args: dict[str, Any] = {}
    try:
        args = json.loads(raw_arguments or "{}")
    except json.JSONDecodeError:
        duration_ms = int((time.perf_counter() - started) * 1000)
        await _log_tool(
            session,
            conversation_id=conversation.id,
            tool_name=tool_name,
            arguments=None,
            result=None,
            error="invalid_json_arguments",
            duration_ms=duration_ms,
        )
        return json.dumps({"ok": False, "error": "invalid_json_arguments"})

    eff_r = eff or await build_effective_settings(session, conversation.workspace_id)
    result: dict[str, Any] | None = None
    err: str | None = None
    try:
        if tool_name == "get_available_slots":
            result = await _get_available_slots(session, eff_r, args)
        elif tool_name == "book_appointment":
            result = await _book_appointment(session, conversation, eff_r, args)
        elif tool_name == "list_my_appointments":
            result = await _list_my_appointments(session, conversation, args)
        elif tool_name == "cancel_appointment":
            result = await _cancel_appointment(session, conversation, eff_r, args)
        elif tool_name == "reschedule_appointment":
            result = await _reschedule_appointment(session, conversation, eff_r, args)
        elif tool_name == "request_human_handoff":
            result = await _request_handoff(session, conversation, args)
        else:
            err = f"unknown_tool:{tool_name}"
            result = {"ok": False, "error": err}
    except Exception as exc:  # noqa: BLE001
        err = str(exc)
        result = {"ok": False, "error": err}

    duration_ms = int((time.perf_counter() - started) * 1000)
    await _log_tool(
        session,
        conversation_id=conversation.id,
        tool_name=tool_name,
        arguments=args,
        result=result if err is None else None,
        error=err,
        duration_ms=duration_ms,
    )
    return json.dumps(result or {"ok": False})


SYSTEM_PROMPT_BASE = """Eres el asistente de agendamiento de citas del negocio por WhatsApp
(América Latina). Responde en español salvo que el usuario escriba en otro idioma. Sé breve,
claro y profesional (estilo WhatsApp).

Tu trabajo:
- Flujo de agenda (orden obligatorio):
  1) Si el usuario pide cita u horario y aún no dijo QUÉ SERVICIO o motivo concreto, pregúntalo
     antes de consultar huecos. Si el panel lista servicios, ofrécelos en pocas líneas cortas
     (nombres tal como aparecen en la lista).
  2) Cuando ya sepas el servicio (o un motivo claro si el negocio no lista servicios), usa
     get_available_slots; si puedes, pasa service_name para alinear la duración del hueco con
     ese servicio. Cada hueco trae book_start_datetime_iso y book_end_datetime_iso: son las
     cadenas exactas que debes usar al reservar.
  3) Tras acordar fecha, hora y servicio, llama book_appointment pasando start_datetime_iso y
     end_datetime_iso **iguales** a book_start_datetime_iso y book_end_datetime_iso del hueco
     elegido (no otra fecha: nunca uses «hoy» salvo que el usuario haya elegido hoy). Añade
     service_label con lo confirmado. Si el panel tiene servicios estructurados, sin
     service_label la herramienta fallará: no intentes saltarte este paso.
- Si solo dice «mañana a las 3» sin servicio, no asumas: pregunta primero qué necesita.
- Antes de cerrar una reserva, usa get_available_slots cuando Google Calendar esté operativo;
  si la herramienta dice que no está configurado, no inventes huecos: pregunta preferencias y
  deja claro que el equipo validará o que deben configurar Calendar en el panel.
- Para cancelar o mover una cita, usa list_my_appointments y luego cancel_appointment o
  reschedule_appointment con el UUID correspondiente.
- Si piden persona, hay conflicto grave o políticas ambiguas, usa request_human_handoff.

Exactitud:
- Respeta el catálogo / lista de servicios del panel como referencia de qué se puede agendar
  y duraciones aproximadas; si no está escrito, no asumas duración ni precio.
- No inventes nombres ni correos del cliente.
- Respeta reglas estrictas del panel (horarios, políticas de cancelación, etc.)."""


def _prompt_section(title: str, body: str) -> str:
    text = (body or "").strip()
    if not text:
        return ""
    return f"\n\n## {title}\n{text}"


def _prompt_lines_section(title: str, lines: list[str]) -> str:
    filtered = [ln for ln in lines if ln and ln.strip()]
    if not filtered:
        return ""
    return f"\n\n## {title}\n" + "\n".join(filtered)


def _identity_block(eff: EffectiveSettings) -> str:
    from app.services.booking_config import BUSINESS_TYPE_LABELS

    lines: list[str] = []
    if eff.business_name.strip():
        lines.append(f"- Nombre: {eff.business_name.strip()}")
    if eff.business_type.strip():
        label = BUSINESS_TYPE_LABELS.get(eff.business_type.strip(), eff.business_type.strip())
        lines.append(f"- Tipo de negocio: {label}")
    if eff.business_address.strip():
        lines.append(f"- Dirección: {eff.business_address.strip()}")
    if eff.business_phone_display.strip():
        lines.append(f"- Teléfono visible al cliente: {eff.business_phone_display.strip()}")
    if eff.business_timezone.strip():
        lines.append(f"- Zona horaria operativa: {eff.business_timezone.strip()}")
    return _prompt_lines_section("Identidad del negocio", lines)


def _services_block(eff: EffectiveSettings) -> str:
    services = eff.services()
    if not services:
        # Fallback al campo libre legacy si existe.
        return _prompt_section("Servicios ofrecidos", eff.agent_catalog)
    lines = [s.to_human_line() for s in services]
    return _prompt_lines_section("Servicios ofrecidos (estructurado)", lines)


def _schedule_block(eff: EffectiveSettings) -> str:
    wh = eff.working_hours()
    lines = wh.to_human_lines()
    # Sólo añadir si al menos un día tiene intervalos o hay fechas cerradas.
    if not any(not d.is_closed() for d in wh.days) and not wh.closed_dates:
        return ""
    return _prompt_lines_section("Horarios de atención", lines)


def _policy_block(eff: EffectiveSettings) -> str:
    policy = eff.booking_policy()
    return _prompt_lines_section("Reglas de agendamiento", policy.to_human_lines())


def _welcome_menu_block(eff: EffectiveSettings) -> str:
    menu = eff.welcome_menu()
    if not menu.options and not menu.always_includes_book:
        return ""
    intro: list[str] = []
    if eff.welcome_message.strip():
        intro.append(eff.welcome_message.strip())
    intro.append(
        "Cuando el usuario inicia la conversación o pide opciones, ofrece este menú breve "
        "(usa numeritos, máximo una línea cada uno). Si elige una opción, profundiza con "
        "información clara o usa las herramientas de citas según corresponda:"
    )
    intro.extend(menu.render_lines())
    return _prompt_lines_section("Menú inicial de WhatsApp", intro)


def build_system_prompt(eff: EffectiveSettings) -> str:
    parts: list[str] = [SYSTEM_PROMPT_BASE]
    # 1) Identidad (lo más estable y útil arriba).
    parts.append(_identity_block(eff))
    # 2) Contexto libre del negocio (texto largo opcional).
    parts.append(_prompt_section("Contexto del negocio (panel)", eff.agent_business_summary))
    # 3) Reglas duras (políticas inalterables).
    parts.append(_prompt_section("Límites estrictos y cumplimiento", eff.agent_hard_rules))
    # 4) Horarios estructurados (clave para no proponer huecos imposibles).
    parts.append(_schedule_block(eff))
    # 5) Servicios estructurados (preferidos) o catálogo libre como fallback.
    parts.append(_services_block(eff))
    # 6) Reglas de agendamiento (duración, antelación, etc.).
    parts.append(_policy_block(eff))
    # 7) Pagos / depósitos.
    parts.append(
        _prompt_section("Reglas de precios o depósitos (si aplican)", eff.agent_pricing_rules)
    )
    parts.append(_prompt_section("Medios de pago", eff.agent_payment_methods))
    # 8) Política de cancelación (canal preferido para citas).
    parts.append(
        _prompt_section(
            "Política de cancelación / reprogramación",
            eff.cancellation_policy or eff.agent_returns_warranty,
        )
    )
    # 9) Ubicación, FAQ y fuera-de-horario (texto libre).
    parts.append(_prompt_section("Ubicación / cobertura", eff.agent_shipping_zones))
    parts.append(_prompt_section("Preguntas frecuentes", eff.agent_faq))
    parts.append(
        _prompt_section(
            "Fuera de horario o sin disponibilidad",
            eff.agent_off_hours_message,
        )
    )
    parts.append(_prompt_section("Instrucciones de tono, saludo y estilo", eff.agent_instructions))
    # 10) Captura de datos al confirmar.
    if eff.agent_lead_capture.strip():
        parts.append(
            _prompt_section(
                "Datos a pedir al cliente antes o al confirmar la cita",
                eff.agent_lead_capture
                + "\n\nPide estos datos cuando encaje el flujo; puedes repetirlos en notes "
                "de book_appointment si el usuario los dio.",
            )
        )
    # 11) Menú inicial (al final para que esté “fresco” al primer turno).
    parts.append(_welcome_menu_block(eff))
    parts.append(
        "\n\n## Recordatorio final\n"
        "Las herramientas get_available_slots, book_appointment, list_my_appointments, "
        "cancel_appointment y reschedule_appointment son la fuente de verdad de la agenda. "
        "No confirmes una cita al usuario sin que book_appointment haya respondido ok. "
        "No uses get_available_slots ni book_appointment hasta tener explícito qué servicio "
        "o motivo de visita quiere el cliente (si no hay lista en el panel, acláralo con una "
        "pregunta breve antes de reservar). "
        "Cuando el cliente todavía no ha pedido nada concreto, ofrece el menú inicial antes "
        "de entrar al flujo de agenda."
    )
    return "".join(parts)


async def generate_assistant_reply(
    session: AsyncSession,
    *,
    conversation: Conversation,
    user_text: str,
) -> str:
    eff = await build_effective_settings(session, conversation.workspace_id)
    provider = eff.llm_provider.lower()

    if provider == "gemini":
        if eff.gemini_api_key:
            from app.agent.gemini_agent import generate_with_gemini

            return await generate_with_gemini(
                session,
                conversation=conversation,
                user_text=user_text,
                eff=eff,
            )
        return (
            f"Recibí tu mensaje. Resumen rápido: «{user_text[:500]}»\n\n"
            "Modo sin LLM: el proveedor es **Gemini** pero falta la API key. "
            "En Configuración pega la clave (Google AI Studio → Get API key) y guarda."
        )

    if not eff.openai_api_key:
        if eff.gemini_api_key:
            return (
                f"Recibí tu mensaje. Resumen rápido: «{user_text[:500]}»\n\n"
                "El proveedor de LLM está en **OpenAI**, pero solo tienes clave **Gemini** "
                "guardada. En Configuración cambia el proveedor a **Gemini**, guarda, y "
                "vuelve a escribir."
            )
        return (
            f"Recibí tu mensaje. Resumen rápido: «{user_text[:500]}»\n\n"
            "Modo sin LLM: en Configuración elige proveedor y clave (OpenAI o Gemini), "
            "o variables de entorno / panel."
        )

    history = await list_recent_messages(session, conversation.id, limit=24)
    system_text = build_system_prompt(eff)
    openai_messages: list[dict[str, Any]] = [{"role": "system", "content": system_text}]
    for m in history:
        if m.direction == MessageDirection.inbound:
            openai_messages.append({"role": "user", "content": m.body})
        else:
            openai_messages.append({"role": "assistant", "content": m.body})

    if not history or history[-1].direction != MessageDirection.inbound:
        openai_messages.append({"role": "user", "content": user_text})

    client = AsyncOpenAI(api_key=eff.openai_api_key)
    max_iterations = 8
    llm_timeout = get_settings().llm_timeout_seconds
    for _ in range(max_iterations):
        async with asyncio.timeout(llm_timeout):
            completion = await client.chat.completions.create(
                model=eff.openai_model,
                messages=openai_messages,
                tools=TOOL_DEFINITIONS,
                tool_choice="auto",
            )
        choice = completion.choices[0].message
        if choice.tool_calls:
            openai_messages.append(
                {
                    "role": "assistant",
                    "content": choice.content or "",
                    "tool_calls": [
                        {
                            "id": tc.id,
                            "type": "function",
                            "function": {
                                "name": tc.function.name,
                                "arguments": tc.function.arguments,
                            },
                        }
                        for tc in choice.tool_calls
                    ],
                }
            )
            for tc in choice.tool_calls:
                name = tc.function.name
                payload = await execute_tool(
                    session,
                    conversation=conversation,
                    tool_name=name,
                    raw_arguments=tc.function.arguments,
                    eff=eff,
                )
                openai_messages.append(
                    {
                        "role": "tool",
                        "tool_call_id": tc.id,
                        "content": payload,
                    }
                )
            continue
        text = (choice.content or "").strip()
        return text or "Gracias por tu mensaje. Un agente te contactará pronto."

    return "No pude completar la solicitud en este momento. Intenta de nuevo en unos minutos."
