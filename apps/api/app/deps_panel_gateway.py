"""Validación de INTERNAL_API_KEY para rutas llamadas solo desde el servidor Next (login panel)."""

from __future__ import annotations

import secrets

from fastapi import Header, HTTPException, status

from app.config import get_settings


async def require_master_internal_api_key(
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
) -> None:
    presented = (x_api_key or "").strip()
    if not presented and authorization and authorization.startswith("Bearer "):
        presented = authorization.removeprefix("Bearer ").strip()
    settings = get_settings()
    expected = (settings.internal_api_key or "").strip()
    if not expected:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="INTERNAL_API_KEY not configured",
        )
    if not presented or not secrets.compare_digest(presented, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
