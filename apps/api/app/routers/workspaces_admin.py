"""Gestión de workspaces y claves de API (panel). La clave en claro solo se muestra al crear."""

from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.deps import WorkspaceContext, get_workspace_context
from app.models import Workspace, WorkspaceApiKey
from app.services.api_key_hash import hash_internal_api_key

router = APIRouter(prefix="/internal/workspaces", tags=["workspaces"])

WsCtx = Annotated[WorkspaceContext, Depends(get_workspace_context)]


def _require_master(ws: WorkspaceContext) -> None:
    if not ws.is_master:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Esta operación requiere la clave API maestra (INTERNAL_API_KEY).",
        )


def _ensure_workspace_scope(ws: WorkspaceContext, target: uuid.UUID) -> None:
    if ws.is_master or ws.workspace_id == target:
        return
    raise HTTPException(
        status_code=status.HTTP_403_FORBIDDEN,
        detail="Sin acceso a este workspace.",
    )


class WorkspaceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: uuid.UUID
    name: str
    twilio_whatsapp_to: str | None


class WorkspaceCreateIn(BaseModel):
    name: str = Field(default="Nuevo workspace", max_length=160)
    twilio_whatsapp_to: str | None = Field(default=None, max_length=96)


class WorkspacePatchIn(BaseModel):
    name: str | None = Field(default=None, max_length=160)
    twilio_whatsapp_to: str | None = Field(default=None, max_length=96)


class WorkspaceCreateOut(BaseModel):
    workspace: WorkspaceOut
    api_key: str = Field(description="Guárdala ahora; no se volverá a mostrar.")


class ApiKeyOut(BaseModel):
    id: uuid.UUID
    label: str
    created_at: str
    revoked_at: str | None
    active: bool


class ApiKeyCreateIn(BaseModel):
    label: str = Field(default="Panel", max_length=64)


class ApiKeyCreateOut(BaseModel):
    id: uuid.UUID
    label: str
    api_key: str = Field(description="Solo se muestra una vez al crear.")


@router.get("", response_model=list[WorkspaceOut])
async def list_workspaces(
    db: Annotated[AsyncSession, Depends(get_db)], ws: WsCtx
) -> list[WorkspaceOut]:
    _require_master(ws)
    stmt = select(Workspace).order_by(Workspace.created_at.asc())
    rows = list((await db.execute(stmt)).scalars().all())
    return [WorkspaceOut.model_validate(r) for r in rows]


@router.post("", response_model=WorkspaceCreateOut, status_code=status.HTTP_201_CREATED)
async def create_workspace(
    body: WorkspaceCreateIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    ws: WsCtx,
) -> WorkspaceCreateOut:
    _require_master(ws)
    to_norm = (body.twilio_whatsapp_to or "").strip() or None
    w = Workspace(name=body.name.strip() or "Workspace", twilio_whatsapp_to=to_norm)
    db.add(w)
    try:
        await db.flush()
    except IntegrityError as exc:
        raise HTTPException(
            status_code=400,
            detail="twilio_whatsapp_to ya está asignado a otro workspace.",
        ) from exc

    settings = get_settings()
    raw_key = f"ar_{secrets.token_urlsafe(28)}"
    h = hash_internal_api_key(raw_key, pepper=settings.internal_api_key_pepper)
    db.add(WorkspaceApiKey(workspace_id=w.id, key_hmac=h, label="Inicial"))
    await db.commit()
    await db.refresh(w)
    return WorkspaceCreateOut(
        workspace=WorkspaceOut.model_validate(w),
        api_key=raw_key,
    )


@router.patch("/{workspace_id}", response_model=WorkspaceOut)
async def patch_workspace(
    workspace_id: uuid.UUID,
    body: WorkspacePatchIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    ws: WsCtx,
) -> WorkspaceOut:
    _ensure_workspace_scope(ws, workspace_id)
    row = await db.get(Workspace, workspace_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
    data = body.model_dump(exclude_unset=True)
    if "name" in data and data["name"] is not None:
        row.name = str(data["name"]).strip() or row.name
    if "twilio_whatsapp_to" in data:
        v = data["twilio_whatsapp_to"]
        row.twilio_whatsapp_to = (str(v).strip() or None) if v is not None else None
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=400,
            detail="twilio_whatsapp_to duplicado.",
        ) from exc
    await db.refresh(row)
    return WorkspaceOut.model_validate(row)


@router.get("/{workspace_id}/api-keys", response_model=list[ApiKeyOut])
async def list_api_keys(
    workspace_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ws: WsCtx,
) -> list[ApiKeyOut]:
    _ensure_workspace_scope(ws, workspace_id)
    stmt = (
        select(WorkspaceApiKey)
        .where(WorkspaceApiKey.workspace_id == workspace_id)
        .order_by(WorkspaceApiKey.created_at.desc())
    )
    keys = list((await db.execute(stmt)).scalars().all())
    return [
        ApiKeyOut(
            id=k.id,
            label=k.label,
            created_at=k.created_at.isoformat(),
            revoked_at=k.revoked_at.isoformat() if k.revoked_at else None,
            active=k.revoked_at is None,
        )
        for k in keys
    ]


@router.post(
    "/{workspace_id}/api-keys",
    response_model=ApiKeyCreateOut,
    status_code=status.HTTP_201_CREATED,
)
async def create_api_key(
    workspace_id: uuid.UUID,
    body: ApiKeyCreateIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    ws: WsCtx,
) -> ApiKeyCreateOut:
    _ensure_workspace_scope(ws, workspace_id)
    row = await db.get(Workspace, workspace_id)
    if row is None:
        raise HTTPException(status_code=404, detail="Workspace no encontrado")
    settings = get_settings()
    raw_key = f"ar_{secrets.token_urlsafe(28)}"
    h = hash_internal_api_key(raw_key, pepper=settings.internal_api_key_pepper)
    label = (body.label or "Panel").strip()[:64] or "Panel"
    k = WorkspaceApiKey(workspace_id=workspace_id, key_hmac=h, label=label)
    db.add(k)
    await db.commit()
    await db.refresh(k)
    return ApiKeyCreateOut(id=k.id, label=k.label, api_key=raw_key)


@router.post("/{workspace_id}/api-keys/{key_id}/revoke", response_model=ApiKeyOut)
async def revoke_api_key(
    workspace_id: uuid.UUID,
    key_id: uuid.UUID,
    db: Annotated[AsyncSession, Depends(get_db)],
    ws: WsCtx,
) -> ApiKeyOut:
    _ensure_workspace_scope(ws, workspace_id)
    k = await db.get(WorkspaceApiKey, key_id)
    if k is None or k.workspace_id != workspace_id:
        raise HTTPException(status_code=404, detail="Clave no encontrada")
    if k.revoked_at is None:
        k.revoked_at = datetime.now(UTC)
    await db.commit()
    await db.refresh(k)
    return ApiKeyOut(
        id=k.id,
        label=k.label,
        created_at=k.created_at.isoformat(),
        revoked_at=k.revoked_at.isoformat() if k.revoked_at else None,
        active=k.revoked_at is None,
    )
