from __future__ import annotations

from typing import Annotated, Literal

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import verify_internal_api_key
from app.services.booking_config import BUSINESS_TYPES, DEFAULT_TIMEZONE
from app.services.catalog_import import parse_catalog_bytes
from app.services.effective_settings import build_effective_settings, ensure_app_config_row

router = APIRouter(
    prefix="/internal/settings",
    tags=["settings"],
    dependencies=[Depends(verify_internal_api_key)],
)


class SettingsPublic(BaseModel):
    twilio_account_sid: str
    webhook_base_url: str
    twilio_validate_signature: bool
    llm_provider: str
    openai_model: str
    gemini_model: str
    twilio_auth_token_configured: bool
    openai_api_key_configured: bool
    gemini_api_key_configured: bool
    twilio_webhook_full_url: str

    # --- texto libre (legacy, sigue funcionando como fallback) ---
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
    google_service_account_json_configured: bool

    # --- citas: identidad ---
    business_name: str
    business_type: str
    business_timezone: str
    business_address: str
    business_phone_display: str

    # --- citas: menú + horarios + servicios (JSON crudo para el panel) ---
    welcome_message: str
    welcome_menu_options_json: str
    working_hours_json: str
    closed_dates_json: str
    services_json: str
    cancellation_policy: str
    appointment_required_fields_json: str
    reminder_message_template: str

    # --- citas: reglas ---
    default_appointment_duration_minutes: int
    slot_step_minutes: int
    min_lead_time_minutes: int
    max_advance_days: int
    buffer_between_appointments_minutes: int
    reminder_hours_before: int
    requires_id_document: bool

    # --- catálogos para selects del frontend ---
    business_type_choices: list[str] = list(BUSINESS_TYPES)


class CatalogParseOut(BaseModel):
    catalog_fragment: str
    rows_imported: int
    file_type: str


class SettingsUpdate(BaseModel):
    """Solo se actualizan campos enviados. Cadena vacía en secretos borra el valor guardado.

    Cuando un secreto se borra en BD, el valor cae de nuevo al .env.
    """

    twilio_account_sid: str | None = Field(default=None)
    twilio_auth_token: str | None = Field(default=None)
    webhook_base_url: str | None = Field(default=None)
    twilio_validate_signature: bool | None = Field(default=None)
    llm_provider: Literal["openai", "gemini"] | None = Field(default=None)
    openai_api_key: str | None = Field(default=None)
    openai_model: str | None = Field(default=None)
    gemini_api_key: str | None = Field(default=None)
    gemini_model: str | None = Field(default=None)
    agent_business_summary: str | None = Field(default=None)
    agent_instructions: str | None = Field(default=None)
    agent_lead_capture: str | None = Field(default=None)
    agent_catalog: str | None = Field(default=None)
    agent_pricing_rules: str | None = Field(default=None)
    agent_shipping_zones: str | None = Field(default=None)
    agent_payment_methods: str | None = Field(default=None)
    agent_returns_warranty: str | None = Field(default=None)
    agent_faq: str | None = Field(default=None)
    agent_off_hours_message: str | None = Field(default=None)
    agent_hard_rules: str | None = Field(default=None)
    google_calendar_id: str | None = Field(default=None)
    google_service_account_json: str | None = Field(default=None)

    # --- citas: identidad ---
    business_name: str | None = Field(default=None)
    business_type: str | None = Field(default=None)
    business_timezone: str | None = Field(default=None)
    business_address: str | None = Field(default=None)
    business_phone_display: str | None = Field(default=None)

    # --- citas: menú + horarios + servicios ---
    welcome_message: str | None = Field(default=None)
    welcome_menu_options_json: str | None = Field(default=None)
    working_hours_json: str | None = Field(default=None)
    closed_dates_json: str | None = Field(default=None)
    services_json: str | None = Field(default=None)
    cancellation_policy: str | None = Field(default=None)
    appointment_required_fields_json: str | None = Field(default=None)
    reminder_message_template: str | None = Field(default=None)

    # --- citas: reglas ---
    default_appointment_duration_minutes: int | None = Field(default=None, ge=5, le=480)
    slot_step_minutes: int | None = Field(default=None, ge=5, le=120)
    min_lead_time_minutes: int | None = Field(default=None, ge=0, le=20160)
    max_advance_days: int | None = Field(default=None, ge=1, le=365)
    buffer_between_appointments_minutes: int | None = Field(default=None, ge=0, le=240)
    reminder_hours_before: int | None = Field(default=None, ge=0, le=336)
    requires_id_document: bool | None = Field(default=None)


def _public_from_effective(eff) -> SettingsPublic:
    prov = eff.llm_provider.lower()
    if prov not in ("openai", "gemini"):
        prov = "openai"
    return SettingsPublic(
        twilio_account_sid=eff.twilio_account_sid,
        webhook_base_url=eff.webhook_base_url,
        twilio_validate_signature=eff.twilio_validate_signature,
        llm_provider=prov,
        openai_model=eff.openai_model,
        gemini_model=eff.gemini_model,
        twilio_auth_token_configured=bool(eff.twilio_auth_token),
        openai_api_key_configured=bool(eff.openai_api_key),
        gemini_api_key_configured=bool(eff.gemini_api_key),
        twilio_webhook_full_url=eff.twilio_webhook_full_url(),
        agent_business_summary=eff.agent_business_summary,
        agent_instructions=eff.agent_instructions,
        agent_lead_capture=eff.agent_lead_capture,
        agent_catalog=eff.agent_catalog,
        agent_pricing_rules=eff.agent_pricing_rules,
        agent_shipping_zones=eff.agent_shipping_zones,
        agent_payment_methods=eff.agent_payment_methods,
        agent_returns_warranty=eff.agent_returns_warranty,
        agent_faq=eff.agent_faq,
        agent_off_hours_message=eff.agent_off_hours_message,
        agent_hard_rules=eff.agent_hard_rules,
        google_calendar_id=eff.google_calendar_id,
        google_service_account_json_configured=bool(eff.google_service_account_json.strip()),
        business_name=eff.business_name,
        business_type=eff.business_type,
        business_timezone=eff.business_timezone or DEFAULT_TIMEZONE,
        business_address=eff.business_address,
        business_phone_display=eff.business_phone_display,
        welcome_message=eff.welcome_message,
        welcome_menu_options_json=eff.welcome_menu_options_raw,
        working_hours_json=eff.working_hours_raw,
        closed_dates_json=eff.closed_dates_raw,
        services_json=eff.services_raw,
        cancellation_policy=eff.cancellation_policy,
        appointment_required_fields_json=eff.appointment_required_fields_raw,
        reminder_message_template=eff.reminder_message_template,
        default_appointment_duration_minutes=eff.default_appointment_duration_minutes,
        slot_step_minutes=eff.slot_step_minutes,
        min_lead_time_minutes=eff.min_lead_time_minutes,
        max_advance_days=eff.max_advance_days,
        buffer_between_appointments_minutes=eff.buffer_between_appointments_minutes,
        reminder_hours_before=eff.reminder_hours_before,
        requires_id_document=eff.requires_id_document,
    )


@router.get("", response_model=SettingsPublic)
async def get_workspace_settings(db: Annotated[AsyncSession, Depends(get_db)]) -> SettingsPublic:
    eff = await build_effective_settings(db)
    return _public_from_effective(eff)


@router.post("/agent-catalog/parse", response_model=CatalogParseOut)
async def parse_agent_catalog_upload(
    file: UploadFile = File(...),
) -> CatalogParseOut:
    """Convierte CSV o Excel (.xlsx) en líneas «celda | celda | …» para pegar en el catálogo."""
    raw = await file.read()
    try:
        fragment, n, ft = parse_catalog_bytes(raw, file.filename or "")
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    return CatalogParseOut(catalog_fragment=fragment, rows_imported=n, file_type=ft)


# Campos de TEXTO (string libre o JSON-as-string) que se manejan con el mismo patrón:
# cadena vacía → NULL, no enviado → no se toca.
_TEXT_FIELDS: tuple[str, ...] = (
    "twilio_account_sid",
    "twilio_auth_token",
    "webhook_base_url",
    "openai_api_key",
    "openai_model",
    "gemini_api_key",
    "gemini_model",
    "agent_business_summary",
    "agent_instructions",
    "agent_lead_capture",
    "agent_catalog",
    "agent_pricing_rules",
    "agent_shipping_zones",
    "agent_payment_methods",
    "agent_returns_warranty",
    "agent_faq",
    "agent_off_hours_message",
    "agent_hard_rules",
    "google_calendar_id",
    "google_service_account_json",
    "business_name",
    "business_type",
    "business_timezone",
    "business_address",
    "business_phone_display",
    "welcome_message",
    "welcome_menu_options_json",
    "working_hours_json",
    "closed_dates_json",
    "services_json",
    "cancellation_policy",
    "appointment_required_fields_json",
    "reminder_message_template",
)

_INT_FIELDS: tuple[str, ...] = (
    "default_appointment_duration_minutes",
    "slot_step_minutes",
    "min_lead_time_minutes",
    "max_advance_days",
    "buffer_between_appointments_minutes",
    "reminder_hours_before",
)

_BOOL_FIELDS: tuple[str, ...] = ("requires_id_document",)


@router.put("", response_model=SettingsPublic)
async def put_workspace_settings(
    body: SettingsUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SettingsPublic:
    row = await ensure_app_config_row(db)
    data = body.model_dump(exclude_unset=True)

    def norm_opt_str(v: str | None) -> str | None:
        if v is None:
            return None
        s = str(v).strip()
        return s or None

    for f in _TEXT_FIELDS:
        if f in data:
            setattr(row, f, norm_opt_str(data[f]))

    for f in _INT_FIELDS:
        if f in data and data[f] is not None:
            setattr(row, f, int(data[f]))

    for f in _BOOL_FIELDS:
        if f in data and data[f] is not None:
            setattr(row, f, bool(data[f]))

    if "twilio_validate_signature" in data and data["twilio_validate_signature"] is not None:
        row.twilio_validate_signature = bool(data["twilio_validate_signature"])
    if "llm_provider" in data and data["llm_provider"] is not None:
        row.llm_provider = str(data["llm_provider"]).lower()

    # Validación leve para business_type: si llega vacío o desconocido, se guarda tal cual
    # (el frontend muestra el catálogo `business_type_choices`).
    await db.commit()
    eff = await build_effective_settings(db)
    return _public_from_effective(eff)
