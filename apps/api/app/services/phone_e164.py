from __future__ import annotations


def normalize_e164(raw: str) -> str:
    """Normaliza a E.164 con prefijo +. Acepta dígitos sin + (p. ej. móvil PE 9 dígitos → +51…)."""
    s = (raw or "").strip().replace(" ", "").replace("-", "")
    if not s.startswith("+"):
        digits = "".join(c for c in s if c.isdigit())
        if not digits:
            msg = "Indica un número de teléfono válido (con o sin +, ej. +51999888777 o 999888777)."
            raise ValueError(msg)
        # Perú: móvil 9 dígitos que empieza por 9
        if len(digits) == 9 and digits[0] == "9":
            s = "+51" + digits
        elif 10 <= len(digits) <= 15:
            s = "+" + digits
        else:
            msg = (
                "Número incompleto o no reconocido. Usa formato internacional con código de país "
                "(ej. +51999888777) o 9 dígitos de móvil peruano (9…)."
            )
            raise ValueError(msg)
    rest = s[1:]
    if not rest.isdigit() or len(rest) < 8 or len(rest) > 18:
        msg = "Número de teléfono inválido (revisa el código de país y la cantidad de dígitos)."
        raise ValueError(msg)
    return s
