from __future__ import annotations

import logging
import sys
from logging.config import fileConfig
from pathlib import Path

from alembic import context
from sqlalchemy import create_engine, pool

_root = Path(__file__).resolve().parents[1]
if str(_root) not in sys.path:
    sys.path.insert(0, str(_root))

import app.models  # noqa: E402, F401
from app.config import get_settings  # noqa: E402
from app.db.base import Base  # noqa: E402
from app.db.url_utils import (  # noqa: E402
    normalize_sync_url_for_alembic,
    psycopg_connect_args,
)

config = context.config
# disable_existing_loggers=False: imprescindible. El default True deja MUDOS los loggers de la app
# (`app.main`, `app.db.session`), así que cualquier traceback durante el lifespan desaparecía.
if config.config_file_name is not None:
    fileConfig(config.config_file_name, disable_existing_loggers=False)

target_metadata = Base.metadata


def _sync_database_url() -> str:
    return normalize_sync_url_for_alembic(get_settings().database_url)


def run_migrations_offline() -> None:
    url = _sync_database_url()
    context.configure(
        url=url,
        target_metadata=target_metadata,
        literal_binds=True,
        dialect_opts={"paramstyle": "named"},
    )

    with context.begin_transaction():
        context.run_migrations()


def run_migrations_online() -> None:
    url = _sync_database_url()
    connect_args = psycopg_connect_args(url)
    logging.warning(
        "Alembic env: opening sync DB connection for migrations "
        "(connect_args=%s, host_hint=%s).",
        list(connect_args),
        "pgbouncer" if connect_args else "direct",
    )
    connectable = create_engine(url, poolclass=pool.NullPool, connect_args=connect_args)

    with connectable.connect() as connection:
        context.configure(connection=connection, target_metadata=target_metadata)

        with context.begin_transaction():
            context.run_migrations()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
