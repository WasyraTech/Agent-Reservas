from __future__ import annotations


def normalize_e164(raw: str) -> str:
    s = (raw or "").strip().replace(" ", "").replace("-", "")
    if not s.startswith("+"):
        msg = "El teléfono debe estar en formato internacional con prefijo + (E.164)."
        raise ValueError(msg)
    rest = s[1:]
    if not rest.isdigit() or len(rest) < 8 or len(rest) > 18:
        msg = "Número de teléfono inválido."
        raise ValueError(msg)
    return s
