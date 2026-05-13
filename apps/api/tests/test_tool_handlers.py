from __future__ import annotations

from dataclasses import replace

from app.agent.tool_handlers import (
    _booking_service_label_gate,
    _match_service_duration_minutes,
    _reject_if_slot_date_in_past,
    build_system_prompt,
    normalize_phone,
    parse_datetime_iso_for_calendar,
)
from app.services.booking_config import parse_services
from app.services.effective_settings import EffectiveSettings


def _minimal_effective() -> EffectiveSettings:
    return EffectiveSettings(
        twilio_account_sid="",
        twilio_auth_token="",
        webhook_base_url="http://localhost:8000",
        twilio_validate_signature=False,
        llm_provider="openai",
        openai_api_key="",
        openai_model="gpt-4o-mini",
        gemini_api_key="",
        gemini_model="gemini-2.5-flash",
        agent_business_summary="Tienda de prueba.",
        agent_instructions="Sé breve.",
        agent_lead_capture="Nombre y ciudad.",
        agent_catalog="",
        agent_pricing_rules="",
        agent_shipping_zones="",
        agent_payment_methods="",
        agent_returns_warranty="",
        agent_faq="",
        agent_off_hours_message="",
        agent_hard_rules="No inventes precios.",
        google_calendar_id="",
        google_service_account_json="",
    )


def test_normalize_phone_strips_whatsapp_prefix() -> None:
    assert normalize_phone("whatsapp:+51999888777") == "+51999888777"


def test_build_system_prompt_includes_sections() -> None:
    text = build_system_prompt(_minimal_effective())
    assert "Tienda de prueba" in text
    assert "No inventes precios" in text
    assert "get_available_slots" in text
    assert "QUÉ SERVICIO" in text
    assert "service_name" in text


def test_match_service_duration_exact_and_substring() -> None:
    raw = '[{"name":"Limpieza dental","duration_minutes":45},{"name":"Ortodoncia","duration_minutes":60}]'
    svcs = parse_services(raw)
    base = _minimal_effective()
    eff = replace(base, services_raw=raw, _services=svcs)
    assert _match_service_duration_minutes(eff, "limpieza dental") == (45, None)
    assert _match_service_duration_minutes(eff, "Limpieza") == (45, None)
    d, res = _match_service_duration_minutes(eff, "noexiste")
    assert d is None and res == "unknown"


def test_match_service_duration_ambiguous() -> None:
    raw = (
        '[{"name":"Limpieza express","duration_minutes":30},'
        '{"name":"Limpieza profunda","duration_minutes":60}]'
    )
    svcs = parse_services(raw)
    eff = replace(_minimal_effective(), services_raw=raw, _services=svcs)
    d, res = _match_service_duration_minutes(eff, "limpieza")
    assert d is None and res == "ambiguous"


def test_booking_service_label_gate_requires_label_when_services() -> None:
    raw = '[{"name":"Corte","duration_minutes":30}]'
    svcs = parse_services(raw)
    base = _minimal_effective()
    eff = replace(base, services_raw=raw, _services=svcs)
    err = _booking_service_label_gate(eff, None)
    assert err is not None
    assert err["error"] == "missing_service_label"
    assert "Corte" in err["services"]
    assert _booking_service_label_gate(eff, "  Corte  ") is None


def test_booking_service_label_gate_skips_when_no_structured_services() -> None:
    eff = _minimal_effective()
    assert _booking_service_label_gate(eff, None) is None


def test_parse_datetime_iso_for_calendar_naive_uses_business_tz() -> None:
    # 16:30 sin zona = pared en Lima, no UTC
    utc = parse_datetime_iso_for_calendar("2026-05-20T16:30:00", "America/Lima")
    assert utc.hour == 21 and utc.minute == 30  # 16:30 -05 = 21:30 UTC
    assert utc.date().isoformat() == "2026-05-20"


def test_parse_datetime_iso_for_calendar_explicit_z_unchanged() -> None:
    utc = parse_datetime_iso_for_calendar("2026-05-20T21:30:00Z", "America/Lima")
    assert utc.hour == 21 and utc.minute == 30


def test_reject_if_slot_date_in_past_yesterday() -> None:
    from datetime import date
    from zoneinfo import ZoneInfo

    z = ZoneInfo("America/Lima")
    err = _reject_if_slot_date_in_past(date(2000, 1, 1), z, requested_date="2000-01-01", tz_name="America/Lima")
    assert err is not None
    assert err["error"] == "date_in_past"
    assert "2000-01-01" in err["message"]


def test_reject_if_slot_date_in_past_none_for_far_future() -> None:
    from datetime import date
    from zoneinfo import ZoneInfo

    z = ZoneInfo("America/Lima")
    assert (
        _reject_if_slot_date_in_past(date(2099, 6, 1), z, requested_date="2099-06-01", tz_name="America/Lima")
        is None
    )
