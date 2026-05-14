from __future__ import annotations

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.constants import DEFAULT_WORKSPACE_ID
from app.models import PanelOperator, PanelOperatorRole
from app.services.phone_e164 import normalize_e164


async def ensure_panel_bootstrap_admin(db: AsyncSession) -> None:
    """Si ``PANEL_BOOTSTRAP_ADMIN_E164`` está definido y no hay operadores, crea un admin."""
    s = get_settings()
    raw = (s.panel_bootstrap_admin_e164 or "").strip()
    if not raw:
        return
    try:
        phone = normalize_e164(raw)
    except ValueError:
        return
    n = await db.scalar(select(func.count(PanelOperator.id)))
    if (n or 0) > 0:
        return
    name = (s.panel_bootstrap_admin_name or "Admin").strip() or "Admin"
    db.add(
        PanelOperator(
            workspace_id=DEFAULT_WORKSPACE_ID,
            phone_e164=phone,
            display_name=name,
            role=PanelOperatorRole.admin,
            active=True,
        )
    )
    await db.commit()
