"""Operadores de panel, sesiones OTP (Twilio Verify), asignación de conversaciones."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "006_panel_operators_auth"
down_revision: str | None = "005_pending_reminders_tone"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS panel_operators (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                workspace_id UUID NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
                phone_e164 VARCHAR(24) NOT NULL,
                display_name VARCHAR(120) NOT NULL DEFAULT '',
                role VARCHAR(16) NOT NULL DEFAULT 'operator',
                active BOOLEAN NOT NULL DEFAULT true,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
                CONSTRAINT uq_panel_operators_ws_phone UNIQUE (workspace_id, phone_e164)
            )
            """
        )
    )
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_panel_operators_workspace ON panel_operators(workspace_id)"))
    op.execute(
        sa.text(
            """
            CREATE TABLE IF NOT EXISTS panel_sessions (
                id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
                operator_id UUID NOT NULL REFERENCES panel_operators(id) ON DELETE CASCADE,
                token_hash VARCHAR(64) NOT NULL,
                expires_at TIMESTAMPTZ NOT NULL,
                created_at TIMESTAMPTZ NOT NULL DEFAULT now()
            )
            """
        )
    )
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_panel_sessions_token_hash ON panel_sessions(token_hash)"))
    op.execute(sa.text("CREATE INDEX IF NOT EXISTS ix_panel_sessions_expires ON panel_sessions(expires_at)"))
    op.execute(
        sa.text(
            "ALTER TABLE conversations ADD COLUMN IF NOT EXISTS "
            "assigned_operator_id UUID REFERENCES panel_operators(id) ON DELETE SET NULL"
        )
    )
    op.execute(
        sa.text(
            "CREATE INDEX IF NOT EXISTS ix_conversations_assigned_operator "
            "ON conversations(assigned_operator_id)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("ALTER TABLE conversations DROP COLUMN IF EXISTS assigned_operator_id"))
    op.execute(sa.text("DROP TABLE IF EXISTS panel_sessions"))
    op.execute(sa.text("DROP TABLE IF EXISTS panel_operators"))
