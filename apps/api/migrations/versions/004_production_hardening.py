"""Multi-tenant base, API keys hashed, anti-solape de citas confirmadas, extension btree_gist."""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "004_production_hardening"
down_revision: str | None = "003_booking_settings"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

_DEFAULT_WS = "00000000-0000-0000-0000-000000000001"


def _insp():
    return sa.inspect(op.get_bind())


def upgrade() -> None:
    op.execute(sa.text("CREATE EXTENSION IF NOT EXISTS btree_gist"))

    if not _insp().has_table("workspaces"):
        op.create_table(
            "workspaces",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("name", sa.String(160), nullable=False, server_default="Default"),
            sa.Column("twilio_whatsapp_to", sa.String(96), nullable=True),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        )
        op.create_index(
            "ix_workspaces_twilio_whatsapp_to",
            "workspaces",
            ["twilio_whatsapp_to"],
            unique=True,
        )

    op.execute(
        sa.text(
            f"""
            INSERT INTO workspaces (id, name, twilio_whatsapp_to)
            VALUES ('{_DEFAULT_WS}'::uuid, 'Default', NULL)
            ON CONFLICT (id) DO NOTHING
            """
        )
    )

    if not _insp().has_table("workspace_api_keys"):
        op.create_table(
            "workspace_api_keys",
            sa.Column("id", sa.Uuid(), primary_key=True, nullable=False),
            sa.Column("workspace_id", sa.Uuid(), sa.ForeignKey("workspaces.id", ondelete="CASCADE")),
            sa.Column("key_hmac", sa.String(128), nullable=False),
            sa.Column("label", sa.String(64), nullable=False, server_default=""),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()")),
        )
        op.create_index("ix_workspace_api_keys_workspace_id", "workspace_api_keys", ["workspace_id"])
        op.create_index("ix_workspace_api_keys_key_hmac", "workspace_api_keys", ["key_hmac"])

    cols_conv = {c["name"] for c in _insp().get_columns("conversations")}
    if "workspace_id" not in cols_conv:
        op.add_column(
            "conversations",
            sa.Column("workspace_id", sa.Uuid(), nullable=True),
        )
        op.execute(
            sa.text(
                f"UPDATE conversations SET workspace_id = '{_DEFAULT_WS}'::uuid "
                "WHERE workspace_id IS NULL"
            )
        )
        op.alter_column("conversations", "workspace_id", nullable=False)
        op.create_foreign_key(
            "fk_conversations_workspace_id",
            "conversations",
            "workspaces",
            ["workspace_id"],
            ["id"],
            ondelete="RESTRICT",
        )
        op.create_index("ix_conversations_workspace_id", "conversations", ["workspace_id"])

    op.execute(sa.text("ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversations_from_to"))
    op.execute(
        sa.text(
            "ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversations_workspace_from_to"
        )
    )
    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversations_workspace_from_to'
              ) THEN
                ALTER TABLE conversations ADD CONSTRAINT uq_conversations_workspace_from_to
                UNIQUE (workspace_id, twilio_from, twilio_to);
              END IF;
            END $$;
            """
        )
    )

    cols_app = {c["name"] for c in _insp().get_columns("app_configuration")}
    if "workspace_id" not in cols_app:
        op.add_column(
            "app_configuration",
            sa.Column("workspace_id", sa.Uuid(), nullable=True),
        )
        op.execute(
            sa.text(
                f"UPDATE app_configuration SET workspace_id = '{_DEFAULT_WS}'::uuid "
                "WHERE workspace_id IS NULL"
            )
        )
        op.alter_column("app_configuration", "workspace_id", nullable=False)
        op.create_foreign_key(
            "fk_app_configuration_workspace_id",
            "app_configuration",
            "workspaces",
            ["workspace_id"],
            ["id"],
            ondelete="CASCADE",
        )
        op.create_index("ix_app_configuration_workspace_id", "app_configuration", ["workspace_id"])
        op.execute(
            sa.text(
                """
                DO $$
                BEGIN
                  IF NOT EXISTS (
                    SELECT 1 FROM pg_constraint WHERE conname = 'uq_app_configuration_workspace_id'
                  ) THEN
                    ALTER TABLE app_configuration ADD CONSTRAINT uq_app_configuration_workspace_id
                    UNIQUE (workspace_id);
                  END IF;
                END $$;
                """
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


def downgrade() -> None:
    op.execute(
        sa.text(
            "ALTER TABLE appointments DROP CONSTRAINT IF EXISTS appointments_no_overlap_confirmed"
        )
    )
    op.execute(
        sa.text(
            "ALTER TABLE app_configuration DROP CONSTRAINT IF EXISTS uq_app_configuration_workspace_id"
        )
    )
    op.execute(sa.text("ALTER TABLE app_configuration DROP CONSTRAINT IF EXISTS fk_app_configuration_workspace_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_app_configuration_workspace_id"))
    op.execute(sa.text("ALTER TABLE app_configuration DROP COLUMN IF EXISTS workspace_id"))

    op.execute(
        sa.text(
            "ALTER TABLE conversations DROP CONSTRAINT IF EXISTS uq_conversations_workspace_from_to"
        )
    )
    op.execute(sa.text("ALTER TABLE conversations DROP CONSTRAINT IF EXISTS fk_conversations_workspace_id"))
    op.execute(sa.text("DROP INDEX IF EXISTS ix_conversations_workspace_id"))
    op.execute(sa.text("ALTER TABLE conversations DROP COLUMN IF EXISTS workspace_id"))

    op.execute(
        sa.text(
            """
            DO $$
            BEGIN
              IF NOT EXISTS (
                SELECT 1 FROM pg_constraint WHERE conname = 'uq_conversations_from_to'
              ) THEN
                ALTER TABLE conversations ADD CONSTRAINT uq_conversations_from_to
                UNIQUE (twilio_from, twilio_to);
              END IF;
            END $$;
            """
        )
    )

    op.execute(sa.text("DROP TABLE IF EXISTS workspace_api_keys"))
    op.execute(sa.text("DROP TABLE IF EXISTS workspaces"))
