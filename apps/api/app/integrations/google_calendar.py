"""Google Calendar (cuenta de servicio) — llamadas síncronas envueltas en asyncio.to_thread."""

from __future__ import annotations

import asyncio
import json
import logging
from datetime import UTC, datetime
from typing import Any

logger = logging.getLogger(__name__)


def calendar_credentials_configured(
    calendar_id: str | None, service_account_json: str | None
) -> bool:
    return bool(str(calendar_id or "").strip() and str(service_account_json or "").strip())


def _build_service_blocking(service_account_json: str) -> Any:
    from google.oauth2 import service_account
    from googleapiclient.discovery import build

    info = json.loads(service_account_json)
    creds = service_account.Credentials.from_service_account_info(
        info,
        scopes=["https://www.googleapis.com/auth/calendar"],
    )
    return build("calendar", "v3", credentials=creds, cache_discovery=False)


def _rfc3339_utc_z(dt: datetime) -> str:
    u = dt.astimezone(UTC)
    return u.isoformat().replace("+00:00", "Z")


async def freebusy_busy_intervals_utc(
    *,
    service_account_json: str,
    calendar_id: str,
    time_min: datetime,
    time_max: datetime,
) -> list[tuple[datetime, datetime]]:
    """Intervalos ocupados (inicio, fin) en UTC."""

    def _call() -> list[tuple[datetime, datetime]]:
        service = _build_service_blocking(service_account_json)
        body = {
            "timeMin": _rfc3339_utc_z(time_min),
            "timeMax": _rfc3339_utc_z(time_max),
            "items": [{"id": calendar_id}],
        }
        fb = service.freebusy().query(body=body).execute()
        cal = fb.get("calendars", {}).get(calendar_id, {})
        busy = cal.get("busy", [])
        out: list[tuple[datetime, datetime]] = []
        for b in busy:
            s = datetime.fromisoformat(str(b["start"]).replace("Z", "+00:00"))
            e = datetime.fromisoformat(str(b["end"]).replace("Z", "+00:00"))
            out.append((s.astimezone(UTC), e.astimezone(UTC)))
        return out

    return await asyncio.to_thread(_call)


def _event_datetime_fragment(dt_utc: datetime, time_zone: str) -> dict[str, str]:
    """RFC3339 con offset local (sin mezclar UTC+timeZone), evita desfaces en Calendar."""
    from zoneinfo import ZoneInfo, ZoneInfoNotFoundError

    try:
        tz = ZoneInfo((time_zone or "UTC").strip())
    except ZoneInfoNotFoundError:
        tz = UTC
    local = dt_utc.astimezone(tz)
    return {"dateTime": local.isoformat(timespec="seconds")}


async def insert_calendar_event(
    *,
    service_account_json: str,
    calendar_id: str,
    summary: str,
    description: str,
    start: datetime,
    end: datetime,
    time_zone: str,
    attendee_email: str | None = None,
) -> str:
    def _call() -> str:
        service = _build_service_blocking(service_account_json)
        body: dict[str, Any] = {
            "summary": summary,
            "description": description,
            "start": _event_datetime_fragment(start, time_zone),
            "end": _event_datetime_fragment(end, time_zone),
            "reminders": {"useDefault": True},
        }
        if attendee_email and attendee_email.strip():
            body["attendees"] = [{"email": attendee_email.strip()}]
        ev = (
            service.events()
            .insert(calendarId=calendar_id, body=body, sendUpdates="all")
            .execute()
        )
        return str(ev["id"])

    return await asyncio.to_thread(_call)


async def delete_calendar_event(
    *, service_account_json: str, calendar_id: str, event_id: str
) -> None:
    def _call() -> None:
        service = _build_service_blocking(service_account_json)
        service.events().delete(
            calendarId=calendar_id, eventId=event_id, sendUpdates="all"
        ).execute()

    await asyncio.to_thread(_call)


async def patch_calendar_event_times(
    *,
    service_account_json: str,
    calendar_id: str,
    event_id: str,
    start: datetime,
    end: datetime,
    time_zone: str,
) -> None:
    def _call() -> None:
        service = _build_service_blocking(service_account_json)
        service.events().patch(
            calendarId=calendar_id,
            eventId=event_id,
            body={
                "start": _event_datetime_fragment(start, time_zone),
                "end": _event_datetime_fragment(end, time_zone),
            },
            sendUpdates="all",
        ).execute()

    await asyncio.to_thread(_call)
