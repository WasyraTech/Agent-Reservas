from app.config import Settings


def test_plain_postgresql_gets_asyncpg_driver() -> None:
    s = Settings(database_url="postgresql://user:secret@pooler.supabase.com:6543/postgres")
    assert s.database_url.startswith("postgresql+asyncpg://")


def test_postgres_scheme_normalized() -> None:
    s = Settings(database_url="postgres://u:p@h:1/db")
    assert s.database_url == "postgresql+asyncpg://u:p@h:1/db"


def test_asyncpg_unchanged() -> None:
    u = "postgresql+asyncpg://x:y@127.0.0.1:5432/postgres"
    assert Settings(database_url=u).database_url == u


def test_psycopg_scheme_unchanged() -> None:
    u = "postgresql+psycopg://x:y@127.0.0.1:5432/postgres"
    assert Settings(database_url=u).database_url == u


def test_strips_pgbouncer_param() -> None:
    u = "postgresql://u:p@aws-1-sa-east-1.pooler.supabase.com:6543/postgres?pgbouncer=true"
    out = Settings(database_url=u).database_url
    assert out.startswith("postgresql+asyncpg://")
    assert "pgbouncer" not in out


def test_strips_prisma_schema_param() -> None:
    u = "postgresql://u:p@h:5432/postgres?schema=public&pgbouncer=true&sslmode=require"
    out = Settings(database_url=u).database_url
    assert "schema=" not in out
    assert "pgbouncer" not in out
    assert "sslmode=require" in out
