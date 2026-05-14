"""Mensajes al usuario final y guiones de sistema según idioma/tono del workspace."""

from __future__ import annotations

from typing import Literal

from app.services.effective_settings import EffectiveSettings

ErrorKind = Literal["timeout", "quota", "technical", "rate_limit"]


def _tone_open_close(tone: str, *, lang: str) -> tuple[str, str]:
    t = (tone or "professional").strip().lower()
    if lang == "en":
        if t == "formal":
            return "Dear customer, ", " Thank you for your understanding."
        if t == "warm":
            return "Thanks for your patience. ", " We're here to help."
        return "", ""
    if t == "formal":
        return "Estimado cliente, ", " Gracias por su comprensión."
    if t == "warm":
        return "Gracias por su paciencia. ", " Estamos para ayudarle."
    return "", ""


def _core_message(kind: ErrorKind, *, lang: str) -> str:
    if lang == "en":
        if kind == "timeout":
            return (
                "The assistant is taking longer than usual to respond. "
                "You can send your message again in a few minutes; a teammate can also review this chat."
            )
        if kind in ("quota", "rate_limit"):
            return (
                "The AI service is temporarily at capacity. Please try again in a few minutes."
            )
        return (
            "We hit a technical issue while processing your message. A teammate will review it shortly."
        )
    if kind == "timeout":
        return (
            "La respuesta automática está tardando más de lo habitual. "
            "Puede reenviar su mensaje en unos minutos; un asesor también puede revisar esta conversación."
        )
    if kind in ("quota", "rate_limit"):
        return (
            "El servicio inteligente está momentáneamente al límite de uso. "
            "Intente de nuevo dentro de unos minutos."
        )
    return (
        "Hubo una incidencia técnica al generar la respuesta. "
        "Un asesor revisará su mensaje en breve."
    )


def agent_disruption_message(kind: ErrorKind, eff: EffectiveSettings) -> str:
    lang = (eff.agent_response_language or "es").strip().lower()[:8]
    if not lang.startswith("en"):
        lang = "es"
    else:
        lang = "en"
    tone = eff.agent_tone_style or "professional"
    o, c = _tone_open_close(tone, lang=lang)
    return (o + _core_message(kind, lang=lang) + c).strip()


def no_reply_fallback(eff: EffectiveSettings) -> str:
    if (eff.agent_response_language or "").strip().lower().startswith("en"):
        return "Thank you for your message. A colleague will assist you shortly."
    return "Gracias por tu mensaje. Un agente te contactará pronto."


def channel_voice_system_section(eff: EffectiveSettings) -> str:
    lang = (eff.agent_response_language or "es").strip()
    tone = (eff.agent_tone_style or "professional").strip()
    tone_hint = {
        "formal": "registro formal, tratamiento de usted, frases completas.",
        "warm": "cercano y humano, sin perder claridad ni brevedad.",
        "professional": "tono ejecutivo y sobrio: directo, educado, sin coloquialismos excesivos.",
        "executive": "tono ejecutivo y sobrio: directo, educado, sin coloquialismos excesivos.",
    }.get(tone.lower(), "tono profesional y claro.")
    if lang.lower().startswith("en"):
        return (
            "\n\n## Idioma y tono del canal (panel)\n"
            "- Responde principalmente en **inglés** salvo que el usuario escriba de forma "
            "sostenida en otro idioma.\n"
            f"- Estilo: {tone_hint}\n"
            "- Mantén la misma voz cuando informes de retrasos, límites de servicio o fallos técnicos."
        )
    return (
        "\n\n## Idioma y tono del canal (panel)\n"
        "- Responde principalmente en **español** salvo que el usuario escriba de forma "
        "sostenida en otro idioma.\n"
        f"- Estilo: {tone_hint}\n"
        "- Mantén la misma voz cuando informes de retrasos, límites de servicio o fallos técnicos."
    )
