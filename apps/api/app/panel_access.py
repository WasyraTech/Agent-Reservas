from __future__ import annotations

import uuid
from dataclasses import dataclass
from datetime import UTC, datetime

from sqlalchemy import or_, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models import Conversation, PanelOperator, PanelOperatorRole, PanelSession
from app.services.panel_token import hash_panel_session_token


@dataclass
class InternalCaller:
    """Identidad para rutas `/internal/*`: clave API (acceso total) o sesión de operador."""

    workspace_id: uuid.UUID
    operator: PanelOperator | None

    @property
    def is_full_access(self) -> bool:
        if self.operator is None:
            return True
        return self.operator.role == PanelOperatorRole.admin

    def conversation_visibility_clause(self):
        """Operadores: sin asignar o asignadas a ellos.

        Admins / API key: sin filtro.
        """
        if self.is_full_access:
            return None
        assert self.operator is not None
        oid = self.operator.id
        return or_(
            Conversation.assigned_operator_id == oid,
            Conversation.assigned_operator_id.is_(None),
        )


async def resolve_session_operator(db: AsyncSession, raw_token: str) -> PanelOperator | None:
    t = (raw_token or "").strip()
    if not t:
        return None
    th = hash_panel_session_token(t)
    now = datetime.now(UTC)
    stmt = (
        select(PanelOperator)
        .join(PanelSession, PanelSession.operator_id == PanelOperator.id)
        .where(
            PanelSession.token_hash == th,
            PanelSession.expires_at > now,
            PanelOperator.active.is_(True),
        )
        .limit(1)
    )
    return (await db.execute(stmt)).scalar_one_or_none()
