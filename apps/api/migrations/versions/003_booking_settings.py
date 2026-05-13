"""Booking-focused settings on app_configuration.

Adds columns geared to appointment-driven businesses (dentists, salons, clinics, etc.):
identity, working hours, structured services, scheduling rules and the initial welcome menu.

All columns are nullable so existing rows continue to work; values fall back to env via
EffectiveSettings.
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "003_booking_settings"
down_revision: str | None = "002_appointments_google"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


_NEW_TEXT_COLS = (
    "business_name",
    "business_address",
    "welcome_message",
    "welcome_menu_options_json",  # JSON string
    "working_hours_json",  # JSON string
    "closed_dates_json",  # JSON string
    "services_json",  # JSON string
    "cancellation_policy",
    "appointment_required_fields_json",  # JSON string
    "reminder_message_template",
)

_NEW_VARCHAR_COLS: tuple[tuple[str, int], ...] = (
    ("business_type", 32),  # dental, clinic, salon, ...
    ("business_timezone", 64),
    ("business_phone_display", 64),
)

_NEW_INT_COLS = (
    "default_appointment_duration_minutes",
    "slot_step_minutes",
    "min_lead_time_minutes",
    "max_advance_days",
    "buffer_between_appointments_minutes",
    "reminder_hours_before",
)

_NEW_BOOL_COLS = ("requires_id_document",)


def upgrade() -> None:
    for col in _NEW_TEXT_COLS:
        op.execute(
            sa.text(f"ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS {col} TEXT")
        )
    for col, length in _NEW_VARCHAR_COLS:
        op.execute(
            sa.text(
                f"ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS {col} VARCHAR({length})"
            )
        )
    for col in _NEW_INT_COLS:
        op.execute(
            sa.text(f"ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS {col} INTEGER")
        )
    for col in _NEW_BOOL_COLS:
        op.execute(
            sa.text(f"ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS {col} BOOLEAN")
        )


def downgrade() -> None:
    all_cols = (
        _NEW_TEXT_COLS
        + tuple(name for name, _ in _NEW_VARCHAR_COLS)
        + _NEW_INT_COLS
        + _NEW_BOOL_COLS
    )
    for col in all_cols:
        op.execute(sa.text(f"ALTER TABLE app_configuration DROP COLUMN IF EXISTS {col}"))
