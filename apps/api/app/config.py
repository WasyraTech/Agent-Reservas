from functools import lru_cache

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

from app.db.url_utils import normalize_async_url


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # Supabase Session/Transaction pooler. Obligatorio en .env — ver README.
    database_url: str

    # Solo si TLS falla (p. ej. antivirus/proxy con certificado propio). En producción dejar true.
    database_ssl_verify: bool = True

    @field_validator("database_url", mode="before")
    @classmethod
    def database_url_non_empty(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not v.strip()):
            raise ValueError(
                "DATABASE_URL debe estar definida (URI pooler de Supabase, "
                "postgresql://... o postgresql+asyncpg://...). Ver README."
            )
        return v

    @field_validator("database_url", mode="after")
    @classmethod
    def database_url_async_driver(cls, v: str) -> str:
        """Fuerza dialecto +asyncpg y limpia params estilo Prisma (`pgbouncer=true`, etc.)."""
        return normalize_async_url(v)

    twilio_account_sid: str = ""
    twilio_auth_token: str = ""
    twilio_validate_signature: bool = True
    webhook_base_url: str = "http://localhost:8000"

    openai_api_key: str = ""
    openai_model: str = "gpt-4o-mini"

    llm_provider: str = "openai"
    gemini_api_key: str = ""
    gemini_model: str = "gemini-2.5-flash"

    agent_business_summary: str = ""
    agent_instructions: str = ""
    agent_lead_capture: str = ""
    agent_catalog: str = ""
    agent_pricing_rules: str = ""
    agent_shipping_zones: str = ""
    agent_payment_methods: str = ""
    agent_returns_warranty: str = ""
    agent_faq: str = ""
    agent_off_hours_message: str = ""
    agent_hard_rules: str = ""
    google_calendar_id: str = ""
    google_service_account_json: str = ""

    internal_api_key: str = "dev-internal-key"
    # Pepper para HMAC de workspace_api_keys (cámbialo en producción).
    internal_api_key_pepper: str = "change-me-in-production"

    redis_url: str = ""

    # Twilio Verify (OTP panel). SID tipo VA…
    twilio_verify_service_sid: str = ""
    # Canal de envío: sms (por defecto) o whatsapp (requiere WhatsApp configurado en ese servicio Verify).
    twilio_verify_channel: str = "sms"

    @field_validator("twilio_verify_channel", mode="before")
    @classmethod
    def twilio_verify_channel_ok(cls, v: object) -> object:
        if v is None or (isinstance(v, str) and not v.strip()):
            return "sms"
        if isinstance(v, str):
            c = v.strip().lower()
            if c in ("sms", "whatsapp"):
                return c
            raise ValueError("TWILIO_VERIFY_CHANNEL debe ser sms o whatsapp.")
        return v

    # Si no hay operadores en BD, crea uno admin al arrancar (E.164 con +).
    panel_bootstrap_admin_e164: str = ""
    panel_bootstrap_admin_name: str = "Admin"

    # Duración de sesión de panel tras OTP (días).
    panel_session_days: int = 14

    cors_origins: str = "http://localhost:3000"

    llm_timeout_seconds: float = 45.0
    webhook_processing_timeout_seconds: float = 25.0

    # Si true y REDIS_URL está definida: webhook encola respuesta; worker envía vía REST Twilio.
    webhook_async_replies: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()


def cors_origin_list() -> list[str]:
    raw = get_settings().cors_origins.strip()
    if not raw:
        return []
    return [o.strip() for o in raw.split(",") if o.strip()]
