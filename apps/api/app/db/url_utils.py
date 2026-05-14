"""Normalización de URLs de Postgres para Supabase / pgBouncer.

Resuelve tres problemas típicos:

1. Params estilo Prisma (`pgbouncer=true`, `schema=...`, `connection_limit=...`, `pool_timeout=...`)
   no los entienden ni `asyncpg` ni `libpq`/`psycopg`. Los limpiamos.

2. SQLAlchemy `postgresql://...` cae en el dialecto `psycopg2` (no instalado). Forzamos
   `+asyncpg` para el engine async y `+psycopg` para Alembic.

3. Supabase Pooler en puerto 6543 = **Transaction Pooler** (pgBouncer en modo `transaction`).
   En ese modo NO se pueden usar `prepared statements` ni `LISTEN/NOTIFY`. Tenemos que:
       - asyncpg: `statement_cache_size=0` y `prepared_statement_cache_size=0`.
       - psycopg: `prepare_threshold=0`.
"""

from __future__ import annotations

from urllib.parse import parse_qsl, urlencode, urlparse, urlunparse

# Params estilo Prisma que rompen libpq/asyncpg si los dejamos pasar.
_PRISMA_ONLY_PARAMS: frozenset[str] = frozenset(
    {
        "pgbouncer",
        "schema",
        "connection_limit",
        "pool_timeout",
        "socket_timeout",
        "statement_cache_size",  # asyncpg-only; lo controlamos via connect_args
    }
)

_SUPABASE_HOST_FRAGMENTS: tuple[str, ...] = ("pooler.supabase.com", "supabase.co")


def _query_items(query: str) -> list[tuple[str, str]]:
    return parse_qsl(query, keep_blank_values=True)


def _set_query(url: str, items: list[tuple[str, str]]) -> str:
    p = urlparse(url)
    return urlunparse(
        (p.scheme, p.netloc, p.path, p.params, urlencode(items, doseq=False), p.fragment)
    )


def strip_prisma_params(url: str) -> str:
    """Elimina los parámetros estilo Prisma que confunden a libpq/asyncpg."""
    p = urlparse(url)
    if not p.query:
        return url
    kept = [(k, v) for k, v in _query_items(p.query) if k.lower() not in _PRISMA_ONLY_PARAMS]
    return _set_query(url, kept)


def is_supabase_host(url: str) -> bool:
    return any(frag in url for frag in _SUPABASE_HOST_FRAGMENTS)


def is_pgbouncer_transaction_mode(url: str) -> bool:
    """Heurística: puerto 6543 = Transaction Pooler de Supabase (pgBouncer en transaction mode)."""
    try:
        p = urlparse(url)
    except Exception:
        return False
    if not is_supabase_host(url):
        return False
    if p.port == 6543:
        return True
    # Si alguien dejó `pgbouncer=true` en la URL, asumimos transaction mode también.
    for k, v in _query_items(p.query):
        if k.lower() == "pgbouncer" and v.lower() in {"1", "true", "yes"}:
            return True
    return False


def normalize_async_url(url: str) -> str:
    """URL para `create_async_engine`: fuerza `+asyncpg`, limpia params Prisma."""
    u = strip_prisma_params(url.strip())
    if u.startswith("postgres://"):
        u = "postgresql://" + u.removeprefix("postgres://")
    if u.startswith("postgresql://"):
        u = "postgresql+asyncpg://" + u.removeprefix("postgresql://")
    return u


def normalize_sync_url_for_alembic(url: str) -> str:
    """URL para Alembic: dialecto `+psycopg` (psycopg3), TLS + connect_timeout cuando Supabase.

    No se añade `prepare_threshold` aquí: psycopg3 lo rechaza como query param de URL
    (`invalid URI query parameter`). Para pgBouncer se pasa vía `connect_args` (ver
    `psycopg_connect_args`).
    """
    u = strip_prisma_params(url.strip())
    if "+asyncpg" in u:
        u = u.replace("postgresql+asyncpg://", "postgresql+psycopg://", 1)
    elif u.startswith("postgresql://") and "+" not in u.split("://", 1)[0]:
        u = u.replace("postgresql://", "postgresql+psycopg://", 1)
    if u.startswith("postgres://"):
        u = "postgresql+psycopg://" + u.removeprefix("postgres://")

    if not is_supabase_host(u):
        return u

    parsed = urlparse(u)
    existing = {k.lower(): v for k, v in _query_items(parsed.query)}
    to_add: list[tuple[str, str]] = list(_query_items(parsed.query))

    if "sslmode" not in existing and "ssl" not in existing:
        to_add.append(("sslmode", "require"))
    if "connect_timeout" not in existing:
        to_add.append(("connect_timeout", "30"))

    return _set_query(u, to_add)


def psycopg_connect_args(url: str) -> dict:
    """`connect_args` para SQLAlchemy + psycopg3.

    En pgBouncer transaction mode, `prepare_threshold=None` desactiva prepared statements
    (psycopg3 rechazaría el mismo flag en la URL).
    """
    if is_pgbouncer_transaction_mode(url):
        return {"prepare_threshold": None}
    return {}


def asyncpg_pgbouncer_kwargs(url: str) -> dict[str, int]:
    """Argumentos de conexión asyncpg con pgBouncer en transaction mode."""
    if not is_pgbouncer_transaction_mode(url):
        return {}
    # asyncpg requiere desactivar TODO el caché de prepared statements en transaction mode.
    return {"statement_cache_size": 0, "prepared_statement_cache_size": 0}
