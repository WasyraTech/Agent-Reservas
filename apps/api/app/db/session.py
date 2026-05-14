import asyncio
import logging
import ssl
import traceback
from collections.abc import AsyncGenerator
from pathlib import Path

from alembic import command
from alembic.config import Config
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import get_settings
from app.db.url_utils import (
    asyncpg_pgbouncer_kwargs,
    is_pgbouncer_transaction_mode,
    is_supabase_host,
    normalize_sync_url_for_alembic,
)

settings = get_settings()
_log = logging.getLogger(__name__)


def _asyncpg_connect_args(database_url: str, ssl_verify: bool) -> dict:
    """TLS + flags pgBouncer + timeout duro para Supabase."""
    args: dict = {}
    if is_supabase_host(database_url):
        if ssl_verify:
            args["ssl"] = ssl.create_default_context()
        else:
            insecure = ssl.SSLContext(ssl.PROTOCOL_TLS_CLIENT)
            insecure.check_hostname = False
            insecure.verify_mode = ssl.CERT_NONE
            args["ssl"] = insecure
        args.setdefault("timeout", 30)
    args.update(asyncpg_pgbouncer_kwargs(database_url))
    return args


_engine_kwargs: dict = {"echo": False, "pool_pre_ping": True}
_connect_args = _asyncpg_connect_args(settings.database_url, settings.database_ssl_verify)
if _connect_args:
    _engine_kwargs["connect_args"] = _connect_args

if is_pgbouncer_transaction_mode(settings.database_url):
    _log.warning(
        "DATABASE_URL apunta al Transaction Pooler de Supabase (puerto 6543): "
        "prepared statements desactivados. Para Alembic se recomienda Session Pooler (5432)."
    )

engine = create_async_engine(settings.database_url, **_engine_kwargs)
SessionLocal = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


def _escape_percent_for_configparser(value: str) -> str:
    """Escapa % para que el ConfigParser de Alembic no interprete %2A en passwords."""
    return value.replace("%", "%%")


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with SessionLocal() as session:
        try:
            yield session
        finally:
            await session.close()


def _run_alembic_upgrade() -> None:
    alembic_ini = Path(__file__).resolve().parents[2] / "alembic.ini"
    alembic_cfg = Config(str(alembic_ini))
    sync_url = normalize_sync_url_for_alembic(settings.database_url)
    alembic_cfg.set_main_option("sqlalchemy.url", _escape_percent_for_configparser(sync_url))
    _log.info("Alembic: upgrading to head...")
    command.upgrade(alembic_cfg, "head")
    _log.info("Alembic: upgrade finished.")


async def init_db(*, alembic_timeout: float = 180.0) -> None:
    """Aplica migraciones (con timeout duro) y asegura fila de configuración.

    Si Supabase no es alcanzable o las credenciales son inválidas, fallamos rápido con un
    traceback explícito en stdout. Si quedamos bloqueados >`alembic_timeout` segundos lanzamos
    `TimeoutError` para que uvicorn salga con código distinto a "colgado indefinidamente".
    """

    try:
        await asyncio.wait_for(asyncio.to_thread(_run_alembic_upgrade), timeout=alembic_timeout)
    except TimeoutError:
        _log.error(
            "Alembic se colgó >%.0fs. Comprueba red Docker→Supabase, credenciales y que el "
            "proyecto no esté pausado. URL host=%s",
            alembic_timeout,
            _safe_host(settings.database_url),
        )
        raise
    except Exception:
        _log.error(
            "Alembic upgrade falló:\n%s",
            traceback.format_exc(),
        )
        raise

    from app.constants import DEFAULT_WORKSPACE_ID
    from app.services.effective_settings import ensure_app_config_row
    from app.services.workspace_bootstrap import maybe_bootstrap_workspace_api_key
    from app.services.workspace_resolve import ensure_default_workspace_row

    _log.info("Ensuring default workspace + app_config + API key bootstrap...")
    try:
        async with SessionLocal() as session:
            async with session.begin():
                await ensure_default_workspace_row(session)
                await ensure_app_config_row(session, DEFAULT_WORKSPACE_ID)
                await maybe_bootstrap_workspace_api_key(session)
    except Exception:
        _log.error("workspace/app_config bootstrap falló:\n%s", traceback.format_exc())
        raise
    _log.info("workspace/app_config OK.")


def _safe_host(url: str) -> str:
    """Devuelve `host:port` sin credenciales."""
    try:
        from urllib.parse import urlparse

        p = urlparse(url)
        return f"{p.hostname}:{p.port}" if p.port else (p.hostname or "?")
    except Exception:
        return "?"
