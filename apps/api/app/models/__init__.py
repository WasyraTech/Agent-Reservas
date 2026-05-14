from __future__ import annotations

import enum
import uuid
from datetime import datetime

from sqlalchemy import (
    Boolean,
    DateTime,
    Enum,
    ForeignKey,
    Index,
    Integer,
    String,
    Text,
    UniqueConstraint,
    func,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.constants import DEFAULT_WORKSPACE_ID
from app.db.base import Base


class Workspace(Base):
    """Organización / tenant. El número WhatsApp Twilio `To` puede mapear a un workspace."""

    __tablename__ = "workspaces"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    name: Mapped[str] = mapped_column(String(160), default="Default")
    twilio_whatsapp_to: Mapped[str | None] = mapped_column(String(96), unique=True, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class WorkspaceApiKey(Base):
    """Claves de panel hasheadas (HMAC-SHA256); el valor en claro no se guarda."""

    __tablename__ = "workspace_api_keys"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True
    )
    key_hmac: Mapped[str] = mapped_column(String(128), index=True)
    label: Mapped[str] = mapped_column(String(64), default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)


class PanelOperatorRole(enum.StrEnum):
    admin = "admin"
    operator = "operator"


class PanelOperator(Base):
    """Operador humano del panel (login vía Twilio Verify, típicamente WhatsApp).

    Un mismo ``phone_e164`` solo puede existir una vez en el sistema (un usuario = un negocio).
    """

    __tablename__ = "panel_operators"
    __table_args__ = (UniqueConstraint("phone_e164", name="uq_panel_operators_phone_e164"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"), index=True, default=DEFAULT_WORKSPACE_ID
    )
    phone_e164: Mapped[str] = mapped_column(String(24), index=True)
    display_name: Mapped[str] = mapped_column(String(120), default="")
    role: Mapped[PanelOperatorRole] = mapped_column(
        Enum(PanelOperatorRole, native_enum=False, length=16),
        default=PanelOperatorRole.operator,
    )
    active: Mapped[bool] = mapped_column(Boolean, default=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class PanelSession(Base):
    """Sesión de panel (token opaco hasheado en BD)."""

    __tablename__ = "panel_sessions"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    operator_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("panel_operators.id", ondelete="CASCADE"), index=True
    )
    token_hash: Mapped[str] = mapped_column(String(64), index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class ConversationStatus(enum.StrEnum):
    open = "open"
    handed_off = "handed_off"
    closed = "closed"


class MessageDirection(enum.StrEnum):
    inbound = "inbound"
    outbound = "outbound"


class HandoffStatus(enum.StrEnum):
    pending = "pending"
    resolved = "resolved"


class Conversation(Base):
    __tablename__ = "conversations"
    __table_args__ = (
        UniqueConstraint(
            "workspace_id",
            "twilio_from",
            "twilio_to",
            name="uq_conversations_workspace_from_to",
        ),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="RESTRICT"),
        index=True,
        default=DEFAULT_WORKSPACE_ID,
    )
    twilio_from: Mapped[str] = mapped_column(String(64), index=True)
    twilio_to: Mapped[str] = mapped_column(String(64), index=True)
    assigned_operator_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("panel_operators.id", ondelete="SET NULL"),
        nullable=True,
        index=True,
    )
    account_sid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    status: Mapped[ConversationStatus] = mapped_column(
        Enum(ConversationStatus), default=ConversationStatus.open
    )
    internal_notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    internal_tags: Mapped[list | None] = mapped_column(JSONB, nullable=True)
    last_agent_llm_status: Mapped[str] = mapped_column(String(16), default="ok")
    last_agent_llm_error: Mapped[str | None] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    messages: Mapped[list[Message]] = relationship(back_populates="conversation")
    lead: Mapped[Lead | None] = relationship(back_populates="conversation", uselist=False)
    handoffs: Mapped[list[Handoff]] = relationship(back_populates="conversation")
    appointments: Mapped[list[Appointment]] = relationship(
        back_populates="conversation",
        cascade="all, delete-orphan",
    )


class Message(Base):
    __tablename__ = "messages"
    __table_args__ = (UniqueConstraint("twilio_message_sid", name="uq_messages_twilio_sid"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    direction: Mapped[MessageDirection] = mapped_column(Enum(MessageDirection))
    body: Mapped[str] = mapped_column(Text, default="")
    twilio_message_sid: Mapped[str | None] = mapped_column(String(64), nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    conversation: Mapped[Conversation] = relationship(back_populates="messages")


class Lead(Base):
    __tablename__ = "leads"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), unique=True
    )
    phone: Mapped[str] = mapped_column(String(32), index=True)
    email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    qualification: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    stage: Mapped[str] = mapped_column(String(64), default="new")
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    conversation: Mapped[Conversation] = relationship(back_populates="lead")


class ToolInvocation(Base):
    __tablename__ = "tool_invocations"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    tool_name: Mapped[str] = mapped_column(String(128))
    arguments: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    result: Mapped[dict | None] = mapped_column(JSONB, nullable=True)
    error: Mapped[str | None] = mapped_column(Text, nullable=True)
    duration_ms: Mapped[int | None] = mapped_column(nullable=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())


class Handoff(Base):
    __tablename__ = "handoffs"

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    reason: Mapped[str] = mapped_column(Text, default="")
    status: Mapped[HandoffStatus] = mapped_column(
        Enum(HandoffStatus), default=HandoffStatus.pending
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    resolved_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    conversation: Mapped[Conversation] = relationship(back_populates="handoffs")


class Appointment(Base):
    """Cita agendada vía agente; opcionalmente vinculada a un evento de Google Calendar."""

    __tablename__ = "appointments"
    __table_args__ = (Index("ix_appointments_conversation_start", "conversation_id", "start_at"),)

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    conversation_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("conversations.id", ondelete="CASCADE"), index=True
    )
    status: Mapped[str] = mapped_column(String(16), default="confirmed", index=True)
    start_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    end_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    time_zone: Mapped[str] = mapped_column(String(64), default="America/Lima")
    client_name: Mapped[str | None] = mapped_column(String(255), nullable=True)
    client_email: Mapped[str | None] = mapped_column(String(255), nullable=True)
    service_label: Mapped[str | None] = mapped_column(String(255), nullable=True)
    google_event_id: Mapped[str | None] = mapped_column(String(255), nullable=True)
    notes: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_sent_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True),
        nullable=True,
    )
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    conversation: Mapped[Conversation] = relationship(back_populates="appointments")


class AppConfiguration(Base):
    """Configuración por workspace (antes una sola fila id=1)."""

    __tablename__ = "app_configuration"

    id: Mapped[int] = mapped_column(primary_key=True, autoincrement=True)
    workspace_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("workspaces.id", ondelete="CASCADE"),
        unique=True,
        index=True,
        default=DEFAULT_WORKSPACE_ID,
    )
    twilio_account_sid: Mapped[str | None] = mapped_column(Text, nullable=True)
    twilio_auth_token: Mapped[str | None] = mapped_column(Text, nullable=True)
    webhook_base_url: Mapped[str | None] = mapped_column(String(512), nullable=True)
    twilio_validate_signature: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    openai_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    openai_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    llm_provider: Mapped[str | None] = mapped_column(String(16), nullable=True)
    gemini_api_key: Mapped[str | None] = mapped_column(Text, nullable=True)
    gemini_model: Mapped[str | None] = mapped_column(String(64), nullable=True)
    agent_business_summary: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_instructions: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_lead_capture: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_catalog: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_pricing_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_shipping_zones: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_payment_methods: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_returns_warranty: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_faq: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_off_hours_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    agent_hard_rules: Mapped[str | None] = mapped_column(Text, nullable=True)
    google_calendar_id: Mapped[str | None] = mapped_column(String(512), nullable=True)
    google_service_account_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Citas: identidad del negocio (migration 003) ---
    business_name: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_type: Mapped[str | None] = mapped_column(String(32), nullable=True)
    business_timezone: Mapped[str | None] = mapped_column(String(64), nullable=True)
    business_address: Mapped[str | None] = mapped_column(Text, nullable=True)
    business_phone_display: Mapped[str | None] = mapped_column(String(64), nullable=True)

    # --- Citas: menú inicial + horarios + servicios (strings JSON) ---
    welcome_message: Mapped[str | None] = mapped_column(Text, nullable=True)
    welcome_menu_options_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    working_hours_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    closed_dates_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    services_json: Mapped[str | None] = mapped_column(Text, nullable=True)

    # --- Citas: reglas de agendamiento ---
    default_appointment_duration_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    slot_step_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    min_lead_time_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    max_advance_days: Mapped[int | None] = mapped_column(Integer, nullable=True)
    buffer_between_appointments_minutes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    requires_id_document: Mapped[bool | None] = mapped_column(Boolean, nullable=True)

    # --- Citas: política y recordatorios ---
    cancellation_policy: Mapped[str | None] = mapped_column(Text, nullable=True)
    appointment_required_fields_json: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_message_template: Mapped[str | None] = mapped_column(Text, nullable=True)
    reminder_hours_before: Mapped[int | None] = mapped_column(Integer, nullable=True)

    require_appointment_confirmation: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
    agent_response_language: Mapped[str | None] = mapped_column(String(16), nullable=True)
    agent_tone_style: Mapped[str | None] = mapped_column(String(32), nullable=True)

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
