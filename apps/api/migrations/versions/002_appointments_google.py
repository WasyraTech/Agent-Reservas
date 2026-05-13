"""Appointments + Google Calendar columns on app_configuration."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "002_appointments_google"
down_revision: str | None = "001_initial"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS "
            "google_calendar_id VARCHAR(512)"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS "
            "google_service_account_json TEXT"
        )
    )
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS appointments (
                id UUID NOT NULL PRIMARY KEY,
                conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
                status VARCHAR(16) NOT NULL DEFAULT 'confirmed',
                start_at TIMESTAMPTZ NOT NULL,
                end_at TIMESTAMPTZ NOT NULL,
                time_zone VARCHAR(64) NOT NULL DEFAULT 'America/Lima',
                client_name VARCHAR(255),
                client_email VARCHAR(255),
                service_label VARCHAR(255),
                google_event_id VARCHAR(255),
                notes TEXT,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_appointments_conversation_start "
            "ON appointments (conversation_id, start_at)"
        )
    )
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_start ON appointments (start_at)")
    )
    op.execute(
        sa.text("CREATE INDEX IF NOT EXISTS ix_appointments_status ON appointments (status)")
    )


def downgrade() -> None:
    op.execute(sa.text("DROP TABLE IF EXISTS appointments"))
    op.execute(sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS google_calendar_id"))
    op.execute(
        sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS google_service_account_json")
    )
