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

from app.db.base import Base


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
        UniqueConstraint("twilio_from", "twilio_to", name="uq_conversations_from_to"),
    )

    id: Mapped[uuid.UUID] = mapped_column(primary_key=True, default=uuid.uuid4)
    twilio_from: Mapped[str] = mapped_column(String(64), index=True)
    twilio_to: Mapped[str] = mapped_column(String(64), index=True)
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
    appointments: Mapped[list["Appointment"]] = relationship(
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
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    conversation: Mapped[Conversation] = relationship(back_populates="appointments")


class AppConfiguration(Base):
    """Una sola fila (id=1): credenciales opcionales que sobrescriben variables de entorno."""

    __tablename__ = "app_configuration"

    id: Mapped[int] = mapped_column(primary_key=True)
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

    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
