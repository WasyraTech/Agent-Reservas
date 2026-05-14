"""Teléfono de operador único global (un usuario = un negocio / workspace)."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "007_panel_operator_phone_global"
down_revision: str | None = "006_panel_operators_auth"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.execute(sa.text("ALTER TABLE panel_operators DROP CONSTRAINT IF EXISTS uq_panel_operators_ws_phone"))
    op.execute(
        sa.text(
            "CREATE UNIQUE INDEX IF NOT EXISTS uq_panel_operators_phone_e164 "
            "ON panel_operators(phone_e164)"
        )
    )


def downgrade() -> None:
    op.execute(sa.text("DROP INDEX IF EXISTS uq_panel_operators_phone_e164"))
    op.execute(
        sa.text(
            "ALTER TABLE panel_operators ADD CONSTRAINT uq_panel_operators_ws_phone "
            "UNIQUE (workspace_id, phone_e164)"
        )
    )
