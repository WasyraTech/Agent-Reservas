from __future__ import annotations

import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import get_db
from app.deps import get_internal_caller
from app.models import PanelOperator
from app.panel_access import InternalCaller

router = APIRouter(prefix="/internal/panel", tags=["panel"])


class OperatorRow(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    display_name: str
    role: str
    phone_e164: str


IcCtx = Annotated[InternalCaller, Depends(get_internal_caller)]


@router.get("/operators", response_model=list[OperatorRow])
async def list_panel_operators(
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> list[OperatorRow]:
    if not ic.is_full_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden listar operadores.",
        )
    rows = (
        await db.execute(
            select(PanelOperator)
            .where(
                PanelOperator.workspace_id == ic.workspace_id,
                PanelOperator.active.is_(True),
            )
            .order_by(PanelOperator.display_name, PanelOperator.phone_e164)
        )
    ).scalars().all()
    return [
        OperatorRow(
            id=r.id,
            display_name=r.display_name or "",
            role=r.role.value,
            phone_e164=r.phone_e164,
        )
        for r in rows
    ]
