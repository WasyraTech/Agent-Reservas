from __future__ import annotations

import hashlib
import hmac


def hash_internal_api_key(raw: str, *, pepper: str) -> str:
    """HMAC-SHA256 hex (no reversible)."""
    p = (pepper or "").encode("utf-8")
    k = (raw or "").encode("utf-8")
    return hmac.new(p, k, hashlib.sha256).hexdigest()
