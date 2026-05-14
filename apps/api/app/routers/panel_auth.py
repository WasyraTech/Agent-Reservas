from __future__ import annotations

import secrets
import uuid
from datetime import UTC, datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, Header, HTTPException, Request, status
from pydantic import BaseModel, Field
from twilio.base.exceptions import TwilioRestException
from sqlalchemy import delete, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import get_settings
from app.db.session import get_db
from app.deps_panel_gateway import require_master_internal_api_key
from app.models import PanelOperator, PanelOperatorRole, PanelSession, Workspace
from app.panel_access import resolve_session_operator
from app.rate_limit import limiter
from app.services.effective_settings import ensure_app_config_row
from app.services.panel_token import hash_panel_session_token
from app.services.phone_e164 import normalize_e164
from app.services.twilio_verify_otp import check_verification_code, send_verification_otp

router = APIRouter(prefix="/internal/panel/auth", tags=["panel-auth"])


class AuthStartIn(BaseModel):
    phone_e164: str = Field(..., min_length=10, max_length=24)


class AuthVerifyIn(BaseModel):
    phone_e164: str = Field(..., min_length=10, max_length=24)
    code: str = Field(..., min_length=4, max_length=12)


class RegisterStartIn(BaseModel):
    phone_e164: str = Field(..., min_length=10, max_length=24)
    business_name: str = Field(..., min_length=2, max_length=120)


class RegisterVerifyIn(BaseModel):
    phone_e164: str = Field(..., min_length=10, max_length=24)
    code: str = Field(..., min_length=4, max_length=12)
    business_name: str = Field(..., min_length=2, max_length=120)


class OperatorPublic(BaseModel):
    id: uuid.UUID
    display_name: str
    role: str
    phone_e164: str


class AuthVerifyOut(BaseModel):
    """Token solo para que el servidor Next fije cookie httpOnly; no reenviar al navegador."""

    session_token: str
    operator: OperatorPublic


class AuthMeOut(BaseModel):
    display_name: str
    role: str
    phone_e164: str


async def _operator_by_phone(db: AsyncSession, phone: str) -> PanelOperator | None:
    return (
        await db.execute(
            select(PanelOperator).where(
                PanelOperator.phone_e164 == phone,
                PanelOperator.active.is_(True),
            )
        )
    ).scalar_one_or_none()


def _session_days() -> int:
    return max(1, min(90, get_settings().panel_session_days))


@router.post("/start")
@limiter.limit("15/minute")
async def auth_start(
    request: Request,
    body: AuthStartIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_master_internal_api_key)],
) -> dict[str, str]:
    """Envía OTP (Twilio Verify: SMS o WhatsApp según TWILIO_VERIFY_CHANNEL) si el número ya tiene cuenta."""
    try:
        phone = normalize_e164(body.phone_e164)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    op = await _operator_by_phone(db, phone)
    if op is None:
        return {"detail": "ok"}
    try:
        send_verification_otp(phone)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except TwilioRestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.msg or "No se pudo enviar el código de verificación.",
        ) from exc
    return {"detail": "ok"}


@router.post("/verify", response_model=AuthVerifyOut)
@limiter.limit("30/minute")
async def auth_verify(
    request: Request,
    body: AuthVerifyIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_master_internal_api_key)],
) -> AuthVerifyOut:
    try:
        phone = normalize_e164(body.phone_e164)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    op = await _operator_by_phone(db, phone)
    if op is None:
        raise HTTPException(status_code=401, detail="Código o teléfono incorrecto")
    if not check_verification_code(phone, body.code):
        raise HTTPException(status_code=401, detail="Código o teléfono incorrecto")
    raw = secrets.token_urlsafe(32)
    th = hash_panel_session_token(raw)
    exp = datetime.now(UTC) + timedelta(days=_session_days())
    sess = PanelSession(operator_id=op.id, token_hash=th, expires_at=exp)
    db.add(sess)
    await db.commit()
    await db.refresh(op)
    return AuthVerifyOut(
        session_token=raw,
        operator=OperatorPublic(
            id=op.id,
            display_name=op.display_name or "",
            role=op.role.value,
            phone_e164=op.phone_e164,
        ),
    )


@router.post("/register/start")
@limiter.limit("10/minute")
async def register_start(
    request: Request,
    body: RegisterStartIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_master_internal_api_key)],
) -> dict[str, str]:
    """OTP para alta pública: el número no debe existir aún como operador."""
    try:
        phone = normalize_e164(body.phone_e164)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if await _operator_by_phone(db, phone) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este número ya tiene cuenta. Usa «Iniciar sesión».",
        )
    try:
        send_verification_otp(phone)
    except RuntimeError as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=str(exc),
        ) from exc
    except TwilioRestException as exc:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=exc.msg or "No se pudo enviar el código de verificación.",
        ) from exc
    return {"detail": "ok"}


@router.post("/register/verify", response_model=AuthVerifyOut)
@limiter.limit("20/minute")
async def register_verify(
    request: Request,
    body: RegisterVerifyIn,
    db: Annotated[AsyncSession, Depends(get_db)],
    _: Annotated[None, Depends(require_master_internal_api_key)],
) -> AuthVerifyOut:
    """Crea workspace + configuración + admin y abre sesión tras OTP válido."""
    try:
        phone = normalize_e164(body.phone_e164)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail=str(exc)) from exc
    if await _operator_by_phone(db, phone) is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Este número ya está registrado. Inicia sesión.",
        )
    if not check_verification_code(phone, body.code):
        raise HTTPException(status_code=401, detail="Código incorrecto o caducado")

    biz = body.business_name.strip()
    if len(biz) < 2:
        raise HTTPException(status_code=400, detail="Indica un nombre de negocio válido")

    ws = Workspace(name=biz[:160] or "Negocio")
    db.add(ws)
    raw: str | None = None
    op: PanelOperator | None = None
    try:
        await db.flush()
        cfg = await ensure_app_config_row(db, ws.id)
        cfg.business_name = biz
        cfg.business_phone_display = phone
        op = PanelOperator(
            workspace_id=ws.id,
            phone_e164=phone,
            display_name=biz[:120],
            role=PanelOperatorRole.admin,
            active=True,
        )
        db.add(op)
        await db.flush()
        raw = secrets.token_urlsafe(32)
        th = hash_panel_session_token(raw)
        exp = datetime.now(UTC) + timedelta(days=_session_days())
        db.add(PanelSession(operator_id=op.id, token_hash=th, expires_at=exp))
        await db.commit()
    except IntegrityError:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="No se pudo completar el registro (intenta de nuevo o inicia sesión).",
        ) from None

    if raw is None or op is None:
        raise HTTPException(status_code=500, detail="Registro incompleto")
    await db.refresh(op)
    return AuthVerifyOut(
        session_token=raw,
        operator=OperatorPublic(
            id=op.id,
            display_name=op.display_name or "",
            role=op.role.value,
            phone_e164=op.phone_e164,
        ),
    )


@router.post("/logout")
async def auth_logout(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_panel_session: Annotated[str | None, Header(alias="X-Panel-Session")] = None,
) -> dict[str, bool]:
    t = (x_panel_session or "").strip()
    if not t:
        return {"ok": True}
    th = hash_panel_session_token(t)
    await db.execute(delete(PanelSession).where(PanelSession.token_hash == th))
    await db.commit()
    return {"ok": True}


@router.get("/me", response_model=AuthMeOut)
async def auth_me(
    db: Annotated[AsyncSession, Depends(get_db)],
    x_panel_session: Annotated[str | None, Header(alias="X-Panel-Session")] = None,
) -> AuthMeOut:
    op = await resolve_session_operator(db, x_panel_session or "")
    if op is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unauthorized")
    return AuthMeOut(
        display_name=op.display_name or "",
        role=op.role.value,
        phone_e164=op.phone_e164,
    )