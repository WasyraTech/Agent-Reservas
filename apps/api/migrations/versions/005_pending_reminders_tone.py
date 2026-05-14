"""Pending confirmation citas, recordatorios, tono/idioma, API keys revocables, solape pending+confirmed."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "005_pending_reminders_tone"
down_revision: str | None = "004_production_hardening"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE appointments ADD COLUMN IF NOT EXISTS "
            "reminder_sent_at TIMESTAMPTZ"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE workspace_api_keys ADD COLUMN IF NOT EXISTS "
            "revoked_at TIMESTAMPTZ"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS "
            "require_appointment_confirmation BOOLEAN DEFAULT true"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS "
            "agent_response_language VARCHAR(16) DEFAULT 'es'"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration ADD COLUMN IF NOT EXISTS "
            "agent_tone_style VARCHAR(32) DEFAULT 'professional'"
        )
    )
    op.execute(
        sa.text(
            "UPDATE app_configuration SET require_appointment_confirmation = true "
            "WHERE require_appointment_confirmation IS NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE app_configuration SET agent_response_language = 'es' "
            "WHERE agent_response_language IS NULL"
        )
    )
    op.execute(
        sa.text(
            "UPDATE app_configuration SET agent_tone_style = 'professional' "
            "WHERE agent_tone_style IS NULL"
        )
    )

    op.execute(
        sa.text(
            "ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_confirmed"
        )
    )
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_reserved'
              ) THEN
                ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap_reserved
                EXCLUDE USING gist (
                  tstzrange(start_at, end_at, '[)') WITH &&
                ) WHERE (status::text IN ('confirmed', 'pending_confirmation'));
              END IF;
            END $$;
            """
        )
    )


def downgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_reserved"
        )
    )
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'appointments_no_overlap_confirmed'
              ) THEN
                ALTER TABLE appointments ADD CONSTRAINT appointments_no_overlap_confirmed
                EXCLUDE USING gist (
                  tstzrange(start_at, end_at, '[)') WITH &&
                ) WHERE ((status)::text = 'confirmed'::text);
              END IF;
            END $$;
            """
        )
    )
    op.execute(sa.text("ALTER TABLE appointments DROP COLUMN IF EXISTS reminder_sent_at"))
    op.execute(sa.text("ALTER TABLE workspace_api_keys DROP COLUMN IF EXISTS revoked_at"))
    op.execute(
        sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS require_appointment_confirmation")
    )
    op.execute(sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS agent_response_language"))
    op.execute(sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS agent_tone_style"))
