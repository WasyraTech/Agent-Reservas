"""Verifica que `build_system_prompt` integra horarios, servicios y menú inicial."""

from __future__ import annotations

from app.agent.tool_handlers import build_system_prompt
from app.services.booking_config import (
    parse_services,
    parse_welcome_menu,
    parse_working_hours,
)
from app.services.effective_settings import EffectiveSettings


def _minimal(**overrides) -> EffectiveSettings:
    base = dict(
        twilio_account_sid="",
        twilio_auth_token="",
        webhook_base_url="http://localhost:8000",
        twilio_validate_signature=False,
        llm_provider="openai",
        openai_api_key="",
        openai_model="gpt-4o-mini",
        gemini_api_key="",
        gemini_model="gemini-2.5-flash",
        agent_business_summary="",
        agent_instructions="",
        agent_lead_capture="",
        agent_catalog="",
        agent_pricing_rules="",
        agent_shipping_zones="",
        agent_payment_methods="",
        agent_returns_warranty="",
        agent_faq="",
        agent_off_hours_message="",
        agent_hard_rules="",
        google_calendar_id="",
        google_service_account_json="",
    )
    base.update(overrides)
    return EffectiveSettings(**base)


def test_system_prompt_includes_identity() -> None:
    eff = _minimal(
        business_name="Clínica Dental Sonrisa",
        business_type="dental",
        business_address="Av. Principal 123, Lima",
        business_phone_display="+51 999 999 999",
    )
    p = build_system_prompt(eff)
    assert "Identidad del negocio" in p
    assert "Clínica Dental Sonrisa" in p
    assert "odontológico" in p  # del catálogo BUSINESS_TYPE_LABELS
    assert "+51 999 999 999" in p


def test_system_prompt_includes_working_hours_block() -> None:
    raw = '{"mon":[{"start":"09:00","end":"13:00"},{"start":"15:00","end":"19:00"}],"sun":[]}'
    wh = parse_working_hours(raw)
    eff = _minimal(working_hours_raw=raw, _working_hours=wh)
    p = build_system_prompt(eff)
    assert "Horarios de atención" in p
    assert "Lunes: 09:00–13:00, 15:00–19:00" in p
    assert "Domingo: cerrado" in p


def test_system_prompt_omits_schedule_when_all_closed() -> None:
    eff = _minimal()
    p = build_system_prompt(eff)
    assert "Horarios de atención" not in p


def test_system_prompt_uses_structured_services_when_present() -> None:
    raw = '[{"name":"Limpieza","duration_minutes":30,"price":"S/ 80"}]'
    svcs = parse_services(raw)
    eff = _minimal(services_raw=raw, _services=svcs, agent_catalog="LEGACY-NO-DEBE-VERSE")
    p = build_system_prompt(eff)
    assert "Servicios ofrecidos (estructurado)" in p
    assert "Limpieza" in p
    assert "S/ 80" in p
    assert "LEGACY-NO-DEBE-VERSE" not in p


def test_system_prompt_falls_back_to_legacy_catalog_when_no_services() -> None:
    eff = _minimal(agent_catalog="Servicio A | 30 min | S/ 50")
    p = build_system_prompt(eff)
    assert "Servicios ofrecidos" in p  # título legacy "Servicios ofrecidos"
    assert "Servicio A" in p


def test_system_prompt_includes_welcome_menu() -> None:
    menu_raw = '[{"label":"Información sobre tratamientos"},{"label":"Horarios"}]'
    menu = parse_welcome_menu(menu_raw)
    eff = _minimal(welcome_menu_options_raw=menu_raw, _welcome_menu=menu)
    p = build_system_prompt(eff)
    assert "Menú inicial de WhatsApp" in p
    assert "1. Información sobre tratamientos" in p
    assert "2. Horarios" in p
    assert "3. Agendar una cita" in p


def test_system_prompt_policy_block_shows_duration_and_lead_time() -> None:
    eff = _minimal(
        default_appointment_duration_minutes=45,
        min_lead_time_minutes=120,
        max_advance_days=14,
    )
    p = build_system_prompt(eff)
    assert "45 minutos" in p
    assert "120 minutos" in p
    assert "14 días de adelanto" in p


def test_system_prompt_cancellation_policy_prefers_new_field() -> None:
    eff = _minimal(
        cancellation_policy="Cancelar mínimo 4 horas antes.",
        agent_returns_warranty="Política antigua",
    )
    p = build_system_prompt(eff)
    assert "Cancelar mínimo 4 horas antes." in p
    assert "Política antigua" not in p
