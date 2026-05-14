from __future__ import annotations

import secrets
import uuid
from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, Header, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants import DEFAULT_WORKSPACE_ID
from app.db.session import get_db
from app.models import WorkspaceApiKey
from app.services.api_key_hash import hash_internal_api_key


@dataclass(frozen=True)
class WorkspaceContext:
    workspace_id: uuid.UUID


async def get_workspace_context(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
) -> WorkspaceContext:
    """Resuelve workspace por clave interna (legacy env o HMAC en `workspace_api_keys`)."""
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

    if not presented:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")

    if secrets.compare_digest(presented, expected):
        return WorkspaceContext(workspace_id=DEFAULT_WORKSPACE_ID)

    h = hash_internal_api_key(presented, pepper=settings.internal_api_key_pepper)
    stmt = select(WorkspaceApiKey.workspace_id).where(WorkspaceApiKey.key_hmac == h).limit(2)
    rows = list((await db.execute(stmt)).scalars().all())
    if len(rows) == 1:
        return WorkspaceContext(workspace_id=rows[0])

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
