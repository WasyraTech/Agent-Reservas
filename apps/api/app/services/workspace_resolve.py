from __future__ import annotations

import uuid

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.constants import DEFAULT_WORKSPACE_ID
from app.models import Workspace


async def resolve_workspace_id_for_twilio_to(
    session: AsyncSession, *, twilio_to: str
) -> uuid.UUID:
    """Mapea el destino Twilio (WhatsApp del negocio) al workspace.

    1) Coincidencia exacta con `workspaces.twilio_whatsapp_to`.
    2) Si hay exactamente un workspace con `twilio_whatsapp_to` NULL, úsalo como comodín.
    3) Si no, workspace por defecto.
    """
    to_norm = (twilio_to or "").strip()
    if to_norm:
        stmt = select(Workspace.id).where(Workspace.twilio_whatsapp_to == to_norm).limit(2)
        rows = list((await session.execute(stmt)).scalars().all())
        if len(rows) == 1:
            return rows[0]

    stmt_null = select(Workspace.id).where(Workspace.twilio_whatsapp_to.is_(None))
    null_rows = list((await session.execute(stmt_null)).scalars().all())
    if len(null_rows) == 1:
        return null_rows[0]

    return DEFAULT_WORKSPACE_ID


async def ensure_default_workspace_row(session: AsyncSession) -> None:
    ws = await session.get(Workspace, DEFAULT_WORKSPACE_ID)
    if ws is None:
        session.add(Workspace(id=DEFAULT_WORKSPACE_ID, name="Default", twilio_whatsapp_to=None))
        await session.flush()
