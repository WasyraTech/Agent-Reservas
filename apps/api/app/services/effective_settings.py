from __future__ import annotations

from dataclasses import dataclass, field
from urllib.parse import urljoin
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants import DEFAULT_WORKSPACE_ID
from app.models import AppConfiguration
from app.services.booking_config import (
    BookingPolicy,
    DEFAULT_DURATION_MINUTES,
    DEFAULT_MAX_ADVANCE_DAYS,
    DEFAULT_MIN_LEAD_TIME_MINUTES,
    DEFAULT_SLOT_STEP_MINUTES,
    DEFAULT_TIMEZONE,
    Service,
    WelcomeMenu,
    WorkingHours,
    parse_services,
    parse_welcome_menu,
    parse_working_hours,
)
from app.services.secret_value import resolve_config_secret

def webhook_path() -> str:
    return "/webhooks/twilio/whatsapp"


@dataclass(frozen=True)
class EffectiveSettings:
    # --- credenciales / infra ---
    twilio_account_sid: str
    twilio_auth_token: str
    webhook_base_url: str
    twilio_validate_signature: bool
    llm_provider: str
    openai_api_key: str
    openai_model: str
    gemini_api_key: str
    gemini_model: str
    # --- texto libre legacy (compat) ---
    agent_business_summary: str
    agent_instructions: str
    agent_lead_capture: str
    agent_catalog: str
    agent_pricing_rules: str
    agent_shipping_zones: str
    agent_payment_methods: str
    agent_returns_warranty: str
    agent_faq: str
    agent_off_hours_message: str
    agent_hard_rules: str
    google_calendar_id: str
    google_service_account_json: str
    # --- citas: identidad ---
    business_name: str = ""
    business_type: str = ""
    business_timezone: str = DEFAULT_TIMEZONE
    business_address: str = ""
    business_phone_display: str = ""
    # --- citas: menú + horarios + servicios (strings JSON crudos) ---
    welcome_message: str = ""
    welcome_menu_options_raw: str = ""
    working_hours_raw: str = ""
    closed_dates_raw: str = ""
    services_raw: str = ""
    cancellation_policy: str = ""
    appointment_required_fields_raw: str = ""
    reminder_message_template: str = ""
    # --- citas: reglas ---
    default_appointment_duration_minutes: int = DEFAULT_DURATION_MINUTES
    slot_step_minutes: int = DEFAULT_SLOT_STEP_MINUTES
    min_lead_time_minutes: int = DEFAULT_MIN_LEAD_TIME_MINUTES
    max_advance_days: int = DEFAULT_MAX_ADVANCE_DAYS
    buffer_between_appointments_minutes: int = 0
    reminder_hours_before: int = 24
    requires_id_document: bool = False
    require_appointment_confirmation: bool = True
    agent_response_language: str = "es"
    agent_tone_style: str = "professional"

    # Caches de parseo (no participan en igualdad porque son derivados).
    _working_hours: WorkingHours = field(
        default_factory=WorkingHours.empty, repr=False, compare=False
    )
    _services: tuple[Service, ...] = field(default=(), repr=False, compare=False)
    _welcome_menu: WelcomeMenu = field(default_factory=WelcomeMenu, repr=False, compare=False)

    def twilio_webhook_full_url(self) -> str:
        base = self.webhook_base_url.rstrip("/") + "/"
        return urljoin(base, webhook_path().lstrip("/"))

    # ---- API conveniente para el resto del backend ----
    def working_hours(self) -> WorkingHours:
        return self._working_hours

    def services(self) -> tuple[Service, ...]:
        return self._services

    def welcome_menu(self) -> WelcomeMenu:
        return self._welcome_menu

    def booking_policy(self) -> BookingPolicy:
        return BookingPolicy(
            duration_minutes=self.default_appointment_duration_minutes,
            slot_step_minutes=self.slot_step_minutes,
            min_lead_time_minutes=self.min_lead_time_minutes,
            max_advance_days=self.max_advance_days,
            buffer_between_appointments_minutes=self.buffer_between_appointments_minutes,
            requires_id_document=self.requires_id_document,
            timezone=self.business_timezone or DEFAULT_TIMEZONE,
        )


def _text(db_val: str | None, env_val: str) -> str:
    if db_val is not None and str(db_val).strip():
        return str(db_val).strip()
    return (env_val or "").strip()


def _bool(db_val: bool | None, env_val: bool) -> bool:
    if db_val is not None:
        return bool(db_val)
    return bool(env_val)


def _int(db_val: int | None, default: int, *, minimum: int = 1, maximum: int | None = None) -> int:
    if db_val is None:
        return default
    try:
        v = int(db_val)
    except Exception:
        return default
    if v < minimum:
        return minimum
    if maximum is not None and v > maximum:
        return maximum
    return v


async def _get_app_config_for_workspace(
    session: AsyncSession, workspace_id: uuid.UUID
) -> AppConfiguration | None:
    stmt = select(AppConfiguration).where(AppConfiguration.workspace_id == workspace_id).limit(1)
    return (await session.execute(stmt)).scalar_one_or_none()


async def ensure_app_config_row(
    session: AsyncSession, workspace_id: uuid.UUID | None = None
) -> AppConfiguration:
    ws = workspace_id or DEFAULT_WORKSPACE_ID
    row = await _get_app_config_for_workspace(session, ws)
    if row is None:
        mid = await session.scalar(select(func.coalesce(func.max(AppConfiguration.id), 0)))
        next_id = int(mid or 0) + 1
        row = AppConfiguration(id=next_id, workspace_id=ws)
        session.add(row)
        await session.flush()
    return row


def _provider(db_val: str | None, env_val: str) -> str:
    raw = _text(db_val, env_val).lower()
    if raw in ("openai", "gemini"):
        return raw
    return "openai"


async def build_effective_settings(
    session: AsyncSession, workspace_id: uuid.UUID | None = None
) -> EffectiveSettings:
    ws = workspace_id or DEFAULT_WORKSPACE_ID
    env = get_settings()
    row = await _get_app_config_for_workspace(session, ws)
    model_default = "gpt-4o-mini"
    openai_model = _text(row.openai_model if row else None, env.openai_model) or model_default
    gemini_default = "gemini-2.5-flash"
    gemini_model = _text(row.gemini_model if row else None, env.gemini_model) or gemini_default

    # --- nuevos campos de citas (todos guardados sólo en BD; sin fallback a env) ---
    business_name = (row.business_name if row else None) or ""
    business_type = (row.business_type if row else None) or ""
    business_tz = (row.business_timezone if row else None) or DEFAULT_TIMEZONE
    business_addr = (row.business_address if row else None) or ""
    business_phone = (row.business_phone_display if row else None) or ""
    welcome_msg = (row.welcome_message if row else None) or ""
    welcome_menu_raw = (row.welcome_menu_options_json if row else None) or ""
    working_hours_raw = (row.working_hours_json if row else None) or ""
    closed_dates_raw = (row.closed_dates_json if row else None) or ""
    services_raw = (row.services_json if row else None) or ""
    cancellation_policy = (row.cancellation_policy if row else None) or ""
    required_fields_raw = (row.appointment_required_fields_json if row else None) or ""
    reminder_tpl = (row.reminder_message_template if row else None) or ""

    duration = _int(
        row.default_appointment_duration_minutes if row else None,
        DEFAULT_DURATION_MINUTES,
        minimum=5,
        maximum=8 * 60,
    )
    slot_step = _int(
        row.slot_step_minutes if row else None,
        DEFAULT_SLOT_STEP_MINUTES,
        minimum=5,
        maximum=120,
    )
    min_lead = _int(
        row.min_lead_time_minutes if row else None,
        DEFAULT_MIN_LEAD_TIME_MINUTES,
        minimum=0,
        maximum=14 * 24 * 60,
    )
    max_adv = _int(
        row.max_advance_days if row else None,
        DEFAULT_MAX_ADVANCE_DAYS,
        minimum=1,
        maximum=365,
    )
    buffer_min = _int(
        row.buffer_between_appointments_minutes if row else None,
        0,
        minimum=0,
        maximum=240,
    )
    reminder_h = _int(
        row.reminder_hours_before if row else None,
        24,
        minimum=0,
        maximum=14 * 24,
    )
    requires_id = bool((row.requires_id_document if row else None) or False)
    require_confirm = _bool(
        row.require_appointment_confirmation if row else None,
        True,
    )
    agent_lang = ((row.agent_response_language if row else None) or "es").strip() or "es"
    agent_tone = ((row.agent_tone_style if row else None) or "professional").strip() or "professional"

    working_hours = parse_working_hours(working_hours_raw, closed_dates_raw)
    services = parse_services(services_raw)
    welcome_menu = parse_welcome_menu(welcome_menu_raw)

    return EffectiveSettings(
        twilio_account_sid=_text(row.twilio_account_sid if row else None, env.twilio_account_sid),
        twilio_auth_token=resolve_config_secret(
            _text(row.twilio_auth_token if row else None, env.twilio_auth_token)
        ),
        webhook_base_url=_text(row.webhook_base_url if row else None, env.webhook_base_url),
        twilio_validate_signature=_bool(
            row.twilio_validate_signature if row else None,
            env.twilio_validate_signature,
        ),
        llm_provider=_provider(row.llm_provider if row else None, env.llm_provider),
        openai_api_key=resolve_config_secret(
            _text(row.openai_api_key if row else None, env.openai_api_key)
        ),
        openai_model=openai_model,
        gemini_api_key=resolve_config_secret(
            _text(row.gemini_api_key if row else None, env.gemini_api_key)
        ),
        gemini_model=gemini_model,
        agent_business_summary=_text(
            row.agent_business_summary if row else None,
            env.agent_business_summary,
        ),
        agent_instructions=_text(row.agent_instructions if row else None, env.agent_instructions),
        agent_lead_capture=_text(row.agent_lead_capture if row else None, env.agent_lead_capture),
        agent_catalog=_text(row.agent_catalog if row else None, env.agent_catalog),
        agent_pricing_rules=_text(
            row.agent_pricing_rules if row else None, env.agent_pricing_rules
        ),
        agent_shipping_zones=_text(
            row.agent_shipping_zones if row else None, env.agent_shipping_zones
        ),
        agent_payment_methods=_text(
            row.agent_payment_methods if row else None, env.agent_payment_methods
        ),
        agent_returns_warranty=_text(
            row.agent_returns_warranty if row else None,
            env.agent_returns_warranty,
        ),
        agent_faq=_text(row.agent_faq if row else None, env.agent_faq),
        agent_off_hours_message=_text(
            row.agent_off_hours_message if row else None,
            env.agent_off_hours_message,
        ),
        agent_hard_rules=_text(row.agent_hard_rules if row else None, env.agent_hard_rules),
        google_calendar_id=resolve_config_secret(
            _text(row.google_calendar_id if row else None, env.google_calendar_id)
        ),
        google_service_account_json=resolve_config_secret(
            _text(row.google_service_account_json if row else None, env.google_service_account_json)
        ),
        business_name=business_name,
        business_type=business_type,
        business_timezone=business_tz,
        business_address=business_addr,
        business_phone_display=business_phone,
        welcome_message=welcome_msg,
        welcome_menu_options_raw=welcome_menu_raw,
        working_hours_raw=working_hours_raw,
        closed_dates_raw=closed_dates_raw,
        services_raw=services_raw,
        cancellation_policy=cancellation_policy,
        appointment_required_fields_raw=required_fields_raw,
        reminder_message_template=reminder_tpl,
        default_appointment_duration_minutes=duration,
        slot_step_minutes=slot_step,
        min_lead_time_minutes=min_lead,
        max_advance_days=max_adv,
        buffer_between_appointments_minutes=buffer_min,
        reminder_hours_before=reminder_h,
        requires_id_document=requires_id,
        require_appointment_confirmation=require_confirm,
        agent_response_language=agent_lang[:16],
        agent_tone_style=agent_tone[:32],
        _working_hours=working_hours,
        _services=services,
        _welcome_menu=welcome_menu,
    )
