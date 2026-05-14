from __future__ import annotations

import hashlib


def hash_panel_session_token(raw: str) -> str:
    return hashlib.sha256(raw.encode("utf-8")).hexdigest()
