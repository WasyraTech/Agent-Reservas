"""Resolución de secretos guardados como referencia (p. ej. `env:VAR`) en lugar de texto plano."""

from __future__ import annotations

import os
import re
from pathlib import Path

_ENV_REF = re.compile(r"^env:([A-Za-z_][A-Za-z0-9_]*)$")
_FILE_REF = re.compile(r"^file:(.+)$", re.DOTALL)


def resolve_config_secret(raw: str) -> str:
    """Si `raw` es `env:FOO`, devuelve `os.environ['FOO']`. Si es `file:/path`, lee UTF-8.

    Valores que no coinciden con un prefijo conocido se devuelven tal cual (compat panel).
    """
    s = (raw or "").strip()
    if not s:
        return ""
    m = _ENV_REF.match(s)
    if m:
        return (os.environ.get(m.group(1), "") or "").strip()
    m = _FILE_REF.match(s)
    if m:
        path = Path(m.group(1).strip()).expanduser()
        try:
            return path.read_text(encoding="utf-8").strip()
        except OSError:
            return ""
    return s
