import asyncio
import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, Response
from prometheus_client import CONTENT_TYPE_LATEST, generate_latest
from slowapi import _rate_limit_exceeded_handler
from slowapi.errors import RateLimitExceeded
from sqlalchemy import text

from app.config import cors_origin_list
from app.db.session import engine, init_db, SessionLocal
from app.logging_setup import configure_logging
from app.middleware.correlation_id import CorrelationIdMiddleware, RequestIdLogFilter
from app.rate_limit import limiter
from app.routers import internal, panel_auth, panel_team, workspace_settings, workspaces_admin
from app.webhooks import twilio_whatsapp

configure_logging()
for _handler in logging.root.handlers:
    _handler.addFilter(RequestIdLogFilter())


@asynccontextmanager
async def lifespan(_app: FastAPI):
    log = logging.getLogger(__name__)
    log.info("Startup: applying database migrations (first Supabase connect can take 1-2 min)...")
    try:
        await init_db()
    except Exception:
        # Aseguramos que el traceback llegue a stdout antes de que uvicorn salga (código 3).
        log.exception("Startup falló durante init_db(): saliendo.")
        raise
    log.info("Startup: database ready.")

    async with SessionLocal() as session:
        from app.services.panel_bootstrap import ensure_panel_bootstrap_admin

        await ensure_panel_bootstrap_admin(session)

    async def _reminder_loop() -> None:
        from app.services.appointment_reminders import run_appointment_reminder_tick

        while True:
            await asyncio.sleep(300)
            try:
                async with SessionLocal() as session:
                    await run_appointment_reminder_tick(session)
            except Exception:
                logging.getLogger(__name__).exception("appointment reminder tick failed")

    reminder_task = asyncio.create_task(_reminder_loop())
    yield
    reminder_task.cancel()
    try:
        await reminder_task
    except asyncio.CancelledError:
        pass
    await engine.dispose()


app = FastAPI(title="WhatsApp Booking Agent API", version="0.1.0", lifespan=lifespan)
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

app.add_middleware(
    CORSMiddleware,
    allow_origins=cors_origin_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=[
        "Authorization",
        "Content-Type",
        "X-API-Key",
        "X-Panel-Session",
    ],
    expose_headers=["X-Request-ID"],
)
app.add_middleware(CorrelationIdMiddleware)

app.include_router(twilio_whatsapp.router)
app.include_router(panel_auth.router)
app.include_router(panel_team.router)
app.include_router(internal.router)
app.include_router(workspace_settings.router)
app.include_router(workspaces_admin.router)


@app.get("/health")
async def health() -> dict[str, str]:
    return {"status": "ok"}


@app.get("/health/ready", response_model=None)
async def health_ready():
    """Comprueba conexión a Postgres (útil en orquestadores / balanceadores)."""
    try:
        async with engine.connect() as conn:
            await conn.execute(text("SELECT 1"))
    except Exception as exc:  # noqa: BLE001
        logging.getLogger(__name__).exception("health_ready database check failed")
        return JSONResponse(
            status_code=503,
            content={"status": "not_ready", "database": "error", "detail": str(exc)[:240]},
        )
    return {"status": "ready", "database": "ok"}


@app.get("/metrics")
async def prometheus_metrics() -> Response:
    """Prometheus scrape (restringir en red en producción)."""
    return Response(content=generate_latest(), media_type=CONTENT_TYPE_LATEST)
