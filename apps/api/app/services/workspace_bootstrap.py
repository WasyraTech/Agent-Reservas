from __future__ import annotations

import logging
import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants import DEFAULT_WORKSPACE_ID
from app.models import WorkspaceApiKey
from app.services.api_key_hash import hash_internal_api_key

_log = logging.getLogger(__name__)


async def maybe_bootstrap_workspace_api_key(session: AsyncSession) -> None:
    """Si no hay claves hasheadas para el workspace por defecto, registra la de INTERNAL_API_KEY.

    La clave en claro sigue existiendo sólo en el entorno; en BD sólo el HMAC.
    """
    settings = get_settings()
    raw = (settings.internal_api_key or "").strip()
    if len(raw) < 8:
        return

    cnt = await session.scalar(
        select(func.count())
        .select_from(WorkspaceApiKey)
        .where(WorkspaceApiKey.workspace_id == DEFAULT_WORKSPACE_ID)
    )
    if int(cnt or 0) > 0:
        return

    h = hash_internal_api_key(raw, pepper=settings.internal_api_key_pepper)
    session.add(
        WorkspaceApiKey(
            id=uuid.uuid4(),
            workspace_id=DEFAULT_WORKSPACE_ID,
            key_hmac=h,
            label="env:INTERNAL_API_KEY",
        )
    )
    await session.flush()
    _log.info("workspace_api_keys: registrado HMAC para INTERNAL_API_KEY (workspace default)")
