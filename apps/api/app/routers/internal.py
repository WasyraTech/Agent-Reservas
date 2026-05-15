from __future__ import annotations

import os
from datetime import UTC, date, datetime, time, timedelta
from typing import Annotated
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel, ConfigDict, Field
from sqlalchemy import and_, desc, exists, func, or_, select, text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.db.session import get_db
from app.deps import get_internal_caller
from app.models import (
    Appointment,
    Conversation,
    ConversationStatus,
    Handoff,
    HandoffStatus,
    Lead,
    Message,
    PanelOperator,
)
from app.panel_access import InternalCaller

router = APIRouter(prefix="/internal", tags=["internal"])

IcCtx = Annotated[InternalCaller, Depends(get_internal_caller)]


def _conversation_scope(ic: InternalCaller):
    parts = [Conversation.workspace_id == ic.workspace_id]
    vis = ic.conversation_visibility_clause()
    if vis is not None:
        parts.append(vis)
    return and_(*parts)


class MessageOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: UUID
    direction: str
    body: str
    twilio_message_sid: str | None
    created_at: datetime


class LeadOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    phone: str
    email: str | None
    name: str | None
    stage: str
    qualification: dict | None


class LeadListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    twilio_from: str
    phone: str
    email: str | None
    name: str | None
    stage: str
    qualification: dict | None
    updated_at: datetime


class ConversationSummary(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    twilio_from: str
    twilio_to: str
    status: str
    updated_at: datetime
    message_count: int
    last_agent_llm_status: str
    has_pending_handoff: bool = False
    last_agent_llm_error_snippet: str | None = None
    assigned_operator_id: UUID | None = None
    last_message_preview: str | None = None
    last_message_direction: str | None = None


class HandoffBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: UUID
    reason: str
    status: str
    created_at: datetime


class AppointmentBrief(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    status: str
    start_at: datetime
    end_at: datetime
    client_name: str | None
    service_label: str | None
    google_event_id: str | None


class ConversationDetail(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    twilio_from: str
    twilio_to: str
    status: str
    updated_at: datetime
    messages: list[MessageOut]
    lead: LeadOut | None
    internal_notes: str | None = None
    internal_tags: list[str] = Field(default_factory=list)
    last_agent_llm_status: str = "ok"
    last_agent_llm_error: str | None = None
    pending_handoff: HandoffBrief | None = None
    appointments: list[AppointmentBrief] = Field(default_factory=list)
    assigned_operator_id: UUID | None = None


class ConversationPanelPatch(BaseModel):
    internal_notes: str | None = Field(default=None)
    internal_tags: list[str] | None = Field(default=None)


class ConversationPanelOut(BaseModel):
    id: UUID
    internal_notes: str | None
    internal_tags: list[str]


class ConversationAssignmentPatch(BaseModel):
    assigned_operator_id: UUID | None = None


class ClaimOut(BaseModel):
    ok: bool
    assigned_operator_id: UUID | None = None


class HandoffCreate(BaseModel):
    reason: str = "manual_from_dashboard"


class HandoffOut(BaseModel):
    model_config = ConfigDict(from_attributes=True, use_enum_values=True)

    id: UUID
    conversation_id: UUID
    reason: str
    status: str
    created_at: datetime


class DeploymentStatus(BaseModel):
    api_version: str
    git_commit: str
    database: str
    redis_configured: bool = False


def _utc_day_start(d: date) -> datetime:
    return datetime.combine(d, time.min, tzinfo=UTC)


def _utc_day_end_exclusive(d: date) -> datetime:
    return _utc_day_start(d + timedelta(days=1))


def _normalize_tags(raw: list[str] | None) -> list[str]:
    out: list[str] = []
    for t in (raw or [])[:32]:
        s = str(t).strip()[:48]
        if s:
            out.append(s)
    return out


def _conversation_filters(
    *,
    q: str | None,
    status: str | None,
    date_from: str | None,
    date_to: str | None,
) -> list:
    conds: list = []
    if q and q.strip():
        term = f"%{q.strip()}%"
        lead_match = exists(
            select(1).where(
                Lead.conversation_id == Conversation.id,
                or_(
                    Lead.name.ilike(term),
                    Lead.phone.ilike(term),
                    Lead.email.ilike(term),
                ),
            )
        )
        appt_match = exists(
            select(1).where(
                Appointment.conversation_id == Conversation.id,
                or_(
                    Appointment.client_name.ilike(term),
                    Appointment.service_label.ilike(term),
                ),
            )
        )
        conds.append(
            or_(
                Conversation.twilio_from.ilike(term),
                Conversation.twilio_to.ilike(term),
                lead_match,
                appt_match,
            )
        )
    if status and status.strip():
        raw = status.strip().lower()
        try:
            st = ConversationStatus(raw)
            conds.append(Conversation.status == st)
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="status inválido") from exc
    if date_from and date_from.strip():
        try:
            df = date.fromisoformat(date_from.strip()[:10])
            conds.append(Conversation.updated_at >= _utc_day_start(df))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_from inválido (YYYY-MM-DD)") from exc
    if date_to and date_to.strip():
        try:
            dt = date.fromisoformat(date_to.strip()[:10])
            conds.append(Conversation.updated_at < _utc_day_end_exclusive(dt))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_to inválido (YYYY-MM-DD)") from exc
    return conds


@router.get("/status", response_model=DeploymentStatus)
async def deployment_status(
    db: Annotated[AsyncSession, Depends(get_db)],
    _ic: IcCtx,
) -> DeploymentStatus:
    await db.execute(text("SELECT 1"))
    return DeploymentStatus(
        api_version="0.1.0",
        git_commit=os.environ.get("GIT_COMMIT", "unknown"),
        database="ok",
        redis_configured=bool(os.environ.get("REDIS_URL", "").strip()),
    )


@router.get("/conversations", response_model=list[ConversationSummary])
async def list_conversations(
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=50, ge=1, le=200),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(
        default=None, description="Teléfono, canal, lead o texto en citas (nombre/servicio)"
    ),
    status: str | None = Query(default=None, description="open | handed_off | closed"),
    date_from: str | None = Query(default=None, description="updated_at >= (YYYY-MM-DD UTC)"),
    date_to: str | None = Query(
        default=None, description="updated_at < día siguiente (YYYY-MM-DD UTC)"
    ),
) -> list[ConversationSummary]:
    count_sq = (
        select(Message.conversation_id, func.count(Message.id).label("cnt"))
        .group_by(Message.conversation_id)
        .subquery()
    )
    msg_ranked = (
        select(
            Message.conversation_id,
            Message.body,
            Message.direction,
            func.row_number()
            .over(partition_by=Message.conversation_id, order_by=desc(Message.created_at))
            .label("rn"),
        ).subquery()
    )
    last_msg_sq = (
        select(msg_ranked.c.conversation_id, msg_ranked.c.body, msg_ranked.c.direction)
        .where(msg_ranked.c.rn == 1)
        .subquery()
    )
    handoff_pending_sq = (
        select(1)
        .select_from(Handoff)
        .where(
            Handoff.conversation_id == Conversation.id,
            Handoff.status == HandoffStatus.pending,
        )
        .exists()
    )
    stmt = select(
        Conversation,
        func.coalesce(count_sq.c.cnt, 0).label("message_count"),
        handoff_pending_sq.label("has_pending_handoff"),
        last_msg_sq.c.body.label("last_message_body"),
        last_msg_sq.c.direction.label("last_message_direction"),
    ).outerjoin(count_sq, count_sq.c.conversation_id == Conversation.id).outerjoin(
        last_msg_sq, last_msg_sq.c.conversation_id == Conversation.id
    )
    conds = [_conversation_scope(ic)]
    conds.extend(_conversation_filters(q=q, status=status, date_from=date_from, date_to=date_to))
    if conds:
        stmt = stmt.where(and_(*conds))
    stmt = stmt.order_by(Conversation.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    out: list[ConversationSummary] = []
    for conv, msg_count, has_ph, last_body, last_dir in rows:
        llm = getattr(conv, "last_agent_llm_status", None) or "ok"
        err = getattr(conv, "last_agent_llm_error", None)
        snippet: str | None = None
        if err:
            s = str(err).strip()
            snippet = s[:200] + ("…" if len(s) > 200 else "")
        preview: str | None = None
        if last_body is not None:
            raw = str(last_body).strip()
            if raw:
                preview = raw[:140] + ("…" if len(raw) > 140 else "")
        dir_out: str | None = None
        if last_dir is not None:
            d = getattr(last_dir, "value", last_dir)
            dir_out = str(d)
        out.append(
            ConversationSummary(
                id=conv.id,
                twilio_from=conv.twilio_from,
                twilio_to=conv.twilio_to,
                status=conv.status.value,
                updated_at=conv.updated_at,
                message_count=int(msg_count or 0),
                last_agent_llm_status=str(llm),
                has_pending_handoff=bool(has_ph),
                last_agent_llm_error_snippet=snippet,
                assigned_operator_id=getattr(conv, "assigned_operator_id", None),
                last_message_preview=preview,
                last_message_direction=dir_out,
            )
        )
    return out


@router.get("/leads", response_model=list[LeadListItem])
async def list_leads(
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    q: str | None = Query(default=None),
    stage: str | None = Query(default=None),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
) -> list[LeadListItem]:
    stmt = (
        select(Lead, Conversation.twilio_from)
        .join(Conversation, Lead.conversation_id == Conversation.id)
        .where(_conversation_scope(ic))
    )
    conds: list = []
    if q and q.strip():
        term = f"%{q.strip()}%"
        conds.append(
            or_(
                Lead.phone.ilike(term),
                Lead.name.ilike(term),
                Lead.email.ilike(term),
                Conversation.twilio_from.ilike(term),
            )
        )
    if stage and stage.strip():
        conds.append(Lead.stage == stage.strip())
    if date_from and date_from.strip():
        try:
            df = date.fromisoformat(date_from.strip()[:10])
            conds.append(Lead.updated_at >= _utc_day_start(df))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_from inválido") from exc
    if date_to and date_to.strip():
        try:
            dt = date.fromisoformat(date_to.strip()[:10])
            conds.append(Lead.updated_at < _utc_day_end_exclusive(dt))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_to inválido") from exc
    if conds:
        stmt = stmt.where(and_(*conds))
    stmt = stmt.order_by(Lead.updated_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    return [
        LeadListItem(
            id=lead.id,
            conversation_id=lead.conversation_id,
            twilio_from=twilio_from,
            phone=lead.phone,
            email=lead.email,
            name=lead.name,
            stage=lead.stage,
            qualification=lead.qualification,
            updated_at=lead.updated_at,
        )
        for lead, twilio_from in rows
    ]


def _tags_from_conv(conv: Conversation) -> list[str]:
    raw = getattr(conv, "internal_tags", None)
    if raw is None:
        return []
    if isinstance(raw, list):
        return [str(x) for x in raw]
    return []


def _pending_handoff(conv: Conversation) -> HandoffBrief | None:
    hands = getattr(conv, "handoffs", None) or []
    pending = [h for h in hands if h.status == HandoffStatus.pending]
    if not pending:
        return None
    h = max(pending, key=lambda x: x.created_at)
    return HandoffBrief.model_validate(h)


class AppointmentListItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: UUID
    conversation_id: UUID
    twilio_from: str
    status: str
    start_at: datetime
    end_at: datetime
    client_name: str | None
    service_label: str | None
    google_event_id: str | None
    created_at: datetime


@router.get("/appointments", response_model=list[AppointmentListItem])
async def list_appointments(
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    status: str | None = Query(
        default=None, description="confirmed | pending_confirmation | cancelled"
    ),
    date_from: str | None = Query(default=None),
    date_to: str | None = Query(default=None),
) -> list[AppointmentListItem]:
    stmt = (
        select(Appointment, Conversation.twilio_from)
        .join(Conversation, Appointment.conversation_id == Conversation.id)
        .where(_conversation_scope(ic))
    )
    conds: list = []
    if status and status.strip():
        conds.append(Appointment.status == status.strip().lower())
    if date_from and date_from.strip():
        try:
            df = date.fromisoformat(date_from.strip()[:10])
            conds.append(Appointment.start_at >= _utc_day_start(df))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_from inválido") from exc
    if date_to and date_to.strip():
        try:
            dt = date.fromisoformat(date_to.strip()[:10])
            conds.append(Appointment.start_at < _utc_day_end_exclusive(dt))
        except ValueError as exc:
            raise HTTPException(status_code=400, detail="date_to inválido") from exc
    if conds:
        stmt = stmt.where(and_(*conds))
    stmt = stmt.order_by(Appointment.start_at.desc()).offset(offset).limit(limit)
    result = await db.execute(stmt)
    rows = result.all()
    return [
        AppointmentListItem(
            id=appt.id,
            conversation_id=appt.conversation_id,
            twilio_from=twilio_from,
            status=appt.status,
            start_at=appt.start_at,
            end_at=appt.end_at,
            client_name=appt.client_name,
            service_label=appt.service_label,
            google_event_id=appt.google_event_id,
            created_at=appt.created_at,
        )
        for appt, twilio_from in rows
    ]


@router.get("/conversations/{conversation_id}", response_model=ConversationDetail)
async def get_conversation(
    conversation_id: UUID,
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationDetail:
    stmt = (
        select(Conversation)
        .where(
            and_(
                Conversation.id == conversation_id,
                _conversation_scope(ic),
            )
        )
        .options(
            selectinload(Conversation.messages),
            selectinload(Conversation.lead),
            selectinload(Conversation.handoffs),
            selectinload(Conversation.appointments),
        )
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    msgs = sorted(conv.messages, key=lambda m: m.created_at)
    lead_out = LeadOut.model_validate(conv.lead) if conv.lead else None
    appts = sorted(
        getattr(conv, "appointments", None) or [],
        key=lambda a: a.start_at,
        reverse=True,
    )
    appt_briefs = [AppointmentBrief.model_validate(a) for a in appts]
    notes = getattr(conv, "internal_notes", None)
    llm_st = getattr(conv, "last_agent_llm_status", None) or "ok"
    llm_err = getattr(conv, "last_agent_llm_error", None)
    return ConversationDetail(
        id=conv.id,
        twilio_from=conv.twilio_from,
        twilio_to=conv.twilio_to,
        status=conv.status.value,
        updated_at=conv.updated_at,
        messages=[MessageOut.model_validate(m) for m in msgs],
        lead=lead_out,
        internal_notes=notes,
        internal_tags=_tags_from_conv(conv),
        last_agent_llm_status=str(llm_st),
        last_agent_llm_error=llm_err,
        pending_handoff=_pending_handoff(conv),
        appointments=appt_briefs,
        assigned_operator_id=getattr(conv, "assigned_operator_id", None),
    )


@router.patch("/conversations/{conversation_id}/panel", response_model=ConversationPanelOut)
async def patch_conversation_panel(
    conversation_id: UUID,
    ic: IcCtx,
    body: ConversationPanelPatch,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ConversationPanelOut:
    stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            _conversation_scope(ic),
        )
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    data = body.model_dump(exclude_unset=True)
    if "internal_notes" in data:
        raw = data["internal_notes"]
        conv.internal_notes = None if raw is None else (str(raw).strip() or None)
    if "internal_tags" in data and data["internal_tags"] is not None:
        conv.internal_tags = _normalize_tags(data["internal_tags"])
    await db.commit()
    await db.refresh(conv)
    return ConversationPanelOut(
        id=conv.id,
        internal_notes=getattr(conv, "internal_notes", None),
        internal_tags=_tags_from_conv(conv),
    )


@router.post("/conversations/{conversation_id}/handoff", response_model=HandoffOut)
async def create_handoff(
    conversation_id: UUID,
    ic: IcCtx,
    body: HandoffCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> HandoffOut:
    stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            _conversation_scope(ic),
        )
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if not conv:
        raise HTTPException(status_code=404, detail="Conversation not found")
    ho = Handoff(
        conversation_id=conv.id,
        reason=body.reason,
        status=HandoffStatus.pending,
    )
    conv.status = ConversationStatus.handed_off
    db.add(ho)
    await db.commit()
    await db.refresh(ho)
    return HandoffOut.model_validate(ho)


@router.post("/conversations/{conversation_id}/handoff/resolve")
async def resolve_pending_handoff(
    conversation_id: UUID,
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> dict[str, object]:
    """Marca handoffs pendientes como resueltos y reabre la conversación si estaba en handed_off."""
    conv_scope = await db.execute(
        select(Conversation.id).where(
            and_(
                Conversation.id == conversation_id,
                _conversation_scope(ic),
            )
        )
    )
    if conv_scope.scalar_one_or_none() is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    stmt = select(Handoff).where(
        Handoff.conversation_id == conversation_id,
        Handoff.status == HandoffStatus.pending,
    )
    result = await db.execute(stmt)
    pending_list = list(result.scalars().all())
    if not pending_list:
        raise HTTPException(
            status_code=404, detail="No hay escalado pendiente para esta conversación"
        )
    now = datetime.now(UTC)
    for h in pending_list:
        h.status = HandoffStatus.resolved
        h.resolved_at = now
    conv_row = await db.execute(
        select(Conversation).where(
            and_(
                Conversation.id == conversation_id,
                _conversation_scope(ic),
            )
        )
    )
    conv = conv_row.scalar_one_or_none()
    if conv is not None and conv.status == ConversationStatus.handed_off:
        conv.status = ConversationStatus.open
    await db.commit()
    return {"ok": True, "resolved_count": len(pending_list)}


@router.post("/conversations/{conversation_id}/claim", response_model=ClaimOut)
async def claim_conversation(
    conversation_id: UUID,
    ic: IcCtx,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClaimOut:
    """Asigna la conversación al operador actual (solo si está libre o ya es suya)."""
    if ic.operator is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Se requiere sesión de operador.",
        )
    stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            Conversation.workspace_id == ic.workspace_id,
        )
    )
    vis = ic.conversation_visibility_clause()
    if vis is not None:
        stmt = stmt.where(vis)
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    aid = conv.assigned_operator_id
    if aid is not None and aid != ic.operator.id:
        raise HTTPException(
            status_code=409,
            detail="La conversación ya está asignada a otro operador.",
        )
    conv.assigned_operator_id = ic.operator.id
    await db.commit()
    await db.refresh(conv)
    return ClaimOut(ok=True, assigned_operator_id=conv.assigned_operator_id)


@router.patch("/conversations/{conversation_id}/assignment", response_model=ClaimOut)
async def patch_conversation_assignment(
    conversation_id: UUID,
    ic: IcCtx,
    body: ConversationAssignmentPatch,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ClaimOut:
    """Solo administradores: asignar o liberar conversación."""
    if not ic.is_full_access:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Solo administradores pueden reasignar conversaciones.",
        )
    stmt = select(Conversation).where(
        and_(
            Conversation.id == conversation_id,
            Conversation.workspace_id == ic.workspace_id,
        )
    )
    result = await db.execute(stmt)
    conv = result.scalar_one_or_none()
    if conv is None:
        raise HTTPException(status_code=404, detail="Conversation not found")
    new_id = body.assigned_operator_id
    if new_id is not None:
        op = await db.get(PanelOperator, new_id)
        if op is None or op.workspace_id != ic.workspace_id or not op.active:
            raise HTTPException(status_code=400, detail="Operador no válido")
    conv.assigned_operator_id = new_id
    await db.commit()
    await db.refresh(conv)
    return ClaimOut(ok=True, assigned_operator_id=conv.assigned_operator_id)
