from __future__ import annotations

import logging

from twilio.base.exceptions import TwilioRestException
from twilio.rest import Client

from app.config import get_settings

log = logging.getLogger(__name__)


def _client() -> Client:
    s = get_settings()
    sid = (s.twilio_account_sid or "").strip()
    token = (s.twilio_auth_token or "").strip()
    if not sid or not token:
        msg = "Twilio no configurado (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN)."
        raise RuntimeError(msg)
    return Client(sid, token)


def send_verification_otp(to_e164: str) -> None:
    s = get_settings()
    vsid = (s.twilio_verify_service_sid or "").strip()
    if not vsid:
        msg = "TWILIO_VERIFY_SERVICE_SID no está configurado."
        raise RuntimeError(msg)
    channel = s.twilio_verify_channel
    try:
        _client().verify.v2.services(vsid).verifications.create(to=to_e164, channel=channel)
    except TwilioRestException as exc:
        if getattr(exc, "status", None) == 404:
            log.error("Twilio Verify service not found (sid=%s)", vsid)
            raise RuntimeError(
                "Twilio Verify: el servicio no existe o TWILIO_VERIFY_SERVICE_SID no coincide con la cuenta. "
                "Revisa Twilio Console → Verify → Services."
            ) from exc
        log.exception("Twilio Verify send failed (%s) for %s", channel, to_e164)
        raise


def check_verification_code(to_e164: str, code: str) -> bool:
    s = get_settings()
    vsid = (s.twilio_verify_service_sid or "").strip()
    if not vsid:
        raise RuntimeError("TWILIO_VERIFY_SERVICE_SID no está configurado.")
    try:
        check = _client().verify.v2.services(vsid).verification_checks.create(
            to=to_e164,
            code=(code or "").strip(),
        )
    except TwilioRestException as exc:
        if getattr(exc, "status", None) == 404:
            log.error("Twilio Verify service not found on check (sid=%s)", vsid)
            raise RuntimeError(
                "Twilio Verify: el servicio no existe o TWILIO_VERIFY_SERVICE_SID no coincide con la cuenta. "
                "Revisa Twilio Console → Verify → Services."
            ) from exc
        log.exception("Twilio Verify check failed for %s", to_e164)
        return False
    return (check.status or "").lower() == "approved"
