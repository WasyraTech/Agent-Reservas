"""Tests del normalizador de URLs Postgres/Supabase/pgBouncer."""

from app.db.url_utils import (
    asyncpg_pgbouncer_kwargs,
    is_pgbouncer_transaction_mode,
    is_supabase_host,
    normalize_async_url,
    normalize_sync_url_for_alembic,
    psycopg_connect_args,
    strip_prisma_params,
)

SUPABASE_TX = (
    "postgresql://postgres.suucemzarpccrvgttuev:Pass@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
)
SUPABASE_SESSION = (
    "postgresql://postgres.suucemzarpccrvgttuev:Pass@aws-1-sa-east-1.pooler.supabase.com:5432/postgres"
)


def test_strip_prisma_params_removes_pgbouncer_and_schema() -> None:
    u = "postgresql://u:p@h:5432/db?pgbouncer=true&schema=public&connection_limit=5&sslmode=require"
    cleaned = strip_prisma_params(u)
    assert "pgbouncer" not in cleaned
    assert "schema" not in cleaned
    assert "connection_limit" not in cleaned
    assert "sslmode=require" in cleaned


def test_strip_prisma_keeps_url_when_no_query() -> None:
    u = "postgresql://u:p@h:5432/db"
    assert strip_prisma_params(u) == u


def test_normalize_async_url_forces_asyncpg_and_cleans_prisma() -> None:
    out = normalize_async_url(SUPABASE_TX)
    assert out.startswith("postgresql+asyncpg://")
    assert "pgbouncer" not in out


def test_normalize_async_url_keeps_existing_driver() -> None:
    u = "postgresql+asyncpg://u:p@h:5432/db"
    assert normalize_async_url(u) == u


def test_normalize_async_url_translates_postgres_scheme() -> None:
    u = "postgres://u:p@h:5432/db"
    assert normalize_async_url(u) == "postgresql+asyncpg://u:p@h:5432/db"


def test_normalize_sync_url_for_alembic_supabase_adds_ssl_and_timeout() -> None:
    out = normalize_sync_url_for_alembic(SUPABASE_SESSION)
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode=require" in out
    assert "connect_timeout=30" in out
    assert "prepare_threshold" not in out  # session mode no necesita


def test_normalize_sync_url_for_alembic_pgbouncer_does_not_inject_prepare_threshold() -> None:
    """psycopg3 rechaza `prepare_threshold` por URL: ese flag va en connect_args."""
    out = normalize_sync_url_for_alembic(SUPABASE_TX)
    assert "prepare_threshold" not in out
    assert "pgbouncer" not in out
    assert "sslmode=require" in out
    assert "connect_timeout=30" in out


def test_psycopg_connect_args_disables_prepared_statements_on_pgbouncer() -> None:
    assert psycopg_connect_args(SUPABASE_TX) == {"prepare_threshold": None}


def test_psycopg_connect_args_empty_for_session_pooler() -> None:
    assert psycopg_connect_args(SUPABASE_SESSION) == {}


def test_normalize_sync_url_for_alembic_localhost_left_alone() -> None:
    u = "postgresql+asyncpg://postgres:postgres@127.0.0.1:5432/postgres"
    out = normalize_sync_url_for_alembic(u)
    assert out.startswith("postgresql+psycopg://")
    assert "sslmode" not in out  # no es Supabase


def test_is_pgbouncer_detects_6543() -> None:
    assert is_pgbouncer_transaction_mode(SUPABASE_TX) is True


def test_is_pgbouncer_false_for_session_pooler() -> None:
    assert is_pgbouncer_transaction_mode(SUPABASE_SESSION) is False


def test_is_pgbouncer_via_query_param() -> None:
    u = "postgresql://u:p@aws-1-sa-east-1.pooler.supabase.com:5432/db?pgbouncer=true"
    assert is_pgbouncer_transaction_mode(u) is True


def test_asyncpg_pgbouncer_kwargs_disables_caches() -> None:
    assert asyncpg_pgbouncer_kwargs(SUPABASE_TX) == {
        "statement_cache_size": 0,
        "prepared_statement_cache_size": 0,
    }


def test_asyncpg_pgbouncer_kwargs_empty_for_non_pgbouncer() -> None:
    assert asyncpg_pgbouncer_kwargs(SUPABASE_SESSION) == {}


def test_is_supabase_host_positive_and_negative() -> None:
    assert is_supabase_host(SUPABASE_TX) is True
    assert is_supabase_host("postgresql://u:p@example.com:5432/db") is False
