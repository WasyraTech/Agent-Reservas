from __future__ import annotationsimport secretsimport uuidfrom dataclasses import dataclassfrom typing import Annotated, Literalfrom fastapi import Depends, Header, HTTPException, statusfrom sqlalchemy import selectfrom sqlalchemy.ext.asyncio import AsyncSessionfrom app.config import get_settingsfrom app.constants import DEFAULT_WORKSPACE_IDfrom app.db.session import get_dbfrom app.models import Workspace, WorkspaceApiKeyfrom app.panel_access import InternalCaller, resolve_session_operatorfrom app.services.api_key_hash import hash_internal_api_key@dataclass(frozen=True)
class WorkspaceContext:
    workspace_id: uuid.UUID
    auth_kind: Literal["master", "workspace_key"]

    @property
    def is_master(self) -> bool:
        return self.auth_kind == "master"


async def _resolve_workspace_context(
    db: AsyncSession,
    *,
    x_api_key: str | None,
    authorization: str | None,
    x_workspace_id: str | None,
) -> WorkspaceContext:
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
        wid: uuid.UUID = DEFAULT_WORKSPACE_ID
        hdr = (x_workspace_id or "").strip()
        if hdr:
            try:
                parsed = uuid.UUID(hdr)
            except ValueError as exc:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="X-Workspace-Id inválido",
                ) from exc
            row = await db.get(Workspace, parsed)
            if row is None:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Workspace no encontrado",
                )
            wid = parsed
        return WorkspaceContext(workspace_id=wid, auth_kind="master")

    h = hash_internal_api_key(presented, pepper=settings.internal_api_key_pepper)
    stmt = (
        select(WorkspaceApiKey.workspace_id)
        .where(
            WorkspaceApiKey.key_hmac == h,
            WorkspaceApiKey.revoked_at.is_(None),
        )
        .limit(2)
    )
    rows = list((await db.execute(stmt)).scalars().all())
    if len(rows) == 1:
        return WorkspaceContext(workspace_id=rows[0], auth_kind="workspace_key")

    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")


async def get_workspace_context(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
) -> WorkspaceContext:
    """Resuelve workspace por clave interna (legacy env o HMAC en `workspace_api_keys`)."""
    return await _resolve_workspace_context(
        db,
        x_api_key=x_api_key,
        authorization=authorization,
        x_workspace_id=x_workspace_id,
    )


async def get_internal_caller(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    authorization: str | None = Header(default=None),
    x_workspace_id: str | None = Header(default=None, alias="X-Workspace-Id"),
    x_panel_session: str | None = Header(default=None, alias="X-Panel-Session"),
) -> InternalCaller:
    """Sesión de operador (cabecera ``X-Panel-Session``) o clave API interna (acceso total)."""
    pt = (x_panel_session or "").strip()
    if pt:
        op = await resolve_session_operator(db, pt)
        if op is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Sesión inválida o expirada",
            )
        return InternalCaller(workspace_id=op.workspace_id, operator=op)
    ws = await _resolve_workspace_context(
        db,
        x_api_key=x_api_key,
        authorization=authorization,
        x_workspace_id=x_workspace_id,
    )
    return InternalCaller(workspace_id=ws.workspace_id, operator=None)
