# Agent-Reservas

Agente de **WhatsApp** orientado a **reservas y citas** (salud, belleza, consultorías, etc.): el cliente escribe por WhatsApp, el LLM consulta disponibilidad en **Google Calendar**, confirma o modifica citas en base de datos y sincroniza eventos. Incluye **panel de operación** (chats, agenda, ajustes) y **escalamiento a humano** cuando hace falta.

[![CI](https://github.com/wasyra/Agent-Reservas/actions/workflows/ci.yml/badge.svg)](https://github.com/wasyra/Agent-Reservas/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)

---

## ¿Qué es esto?

Un negocio en LATAM conecta su **WhatsApp (Twilio)** a este agente. Cuando un cliente escribe, el flujo típico es:

1. Twilio envía el mensaje al webhook; la API valida firma HMAC (opcional), aplica rate limit y deduplica por `MessageSid`.
2. Se carga la configuración del negocio (horarios, servicios con duración, zona horaria, tono, FAQ) desde **Supabase**.
3. Un LLM (**Gemini** u **OpenAI**, elegible en el panel) ejecuta **tool calling** con hasta **8 iteraciones** para consultar huecos, reservar, listar, cancelar o reprogramar citas, y escalar a humano si corresponde.
4. Las citas confirmadas se guardan en Postgres y, si configuraste Google, se crean o actualizan eventos en **Google Calendar**.
5. La respuesta vuelve por **TwiML** a WhatsApp; el operador ve conversaciones y citas en el panel web.

El frontend **Next.js** es el panel interno: inbox de chats, vista **Citas** con filtros y exportación, **Ajustes** (Twilio, LLM, Google Calendar, horarios, servicios, menú de bienvenida) y **Estado** del despliegue.

## ¿Qué demuestra?

- **Agenda real**: huecos calculados cruzando ocupación de Calendar + citas ya guardadas en BD.
- **Tool calling** tipado: `get_available_slots`, `book_appointment`, `list_my_appointments`, `cancel_appointment`, `reschedule_appointment`, `request_human_handoff`.
- **Multi-proveedor LLM** sin reiniciar: Gemini ↔ OpenAI desde el panel.
- **Idempotencia** en el webhook por `MessageSid` (reintentos de Twilio).
- **Validación de firma** Twilio (`X-Twilio-Signature`), configurable por entorno.
- **Rate limiting** del webhook (120 req/min por IP; Redis opcional para varias réplicas).
- **Observabilidad**: logs JSON con `request_id`, métricas Prometheus, `/health` y `/health/ready`.
- **Migraciones Alembic** al arrancar la API.
- **Redacción de secretos** en logs (`sk-*`, `AIza*`, tokens Twilio, `Bearer *`).

## Arquitectura

```
WhatsApp (cliente)
        ↓
     Twilio
        ↓ webhook POST (firma HMAC)
   ┌──────────────────────────┐
   │   FastAPI (apps/api)     │
   │   • valida firma         │
   │   • orquestador + agente │
   │   • tools de reservas    │── Gemini / OpenAI
   │   • Google Calendar API  │
   └────────┬─────────────────┘
            │ SQLAlchemy async
            ▼
       Supabase (Postgres)
            ▲
            │ REST /internal/* (X-API-Key)
   ┌────────┴────────┐
   │  Next.js panel  │
   │  (apps/web)     │
   └─────────────────┘
```

Diseño detallado y contexto histórico en [`PLAN_WHATSAPP_AGENT.md`](./PLAN_WHATSAPP_AGENT.md).

---

## Demo en 5 minutos

### Prerrequisitos

- Docker Desktop (o Node 20+ y Python 3.12+ en bare metal).
- Proyecto [Supabase](https://supabase.com/dashboard) (Free tier suele bastar).
- Clave **Gemini** o **OpenAI** para el agente.
- Para probar agenda de verdad: cuenta de servicio de Google con acceso al calendario del negocio (también se puede pegar JSON e ID de calendario en **Ajustes** del panel).

### Opción A — Panel + API, sin WhatsApp real

```powershell
copy .env.example .env
# Edita .env: DATABASE_URL obligatorio (Supabase → Connect → Session pooler).
docker compose up --build
```

Compose usa **solo Supabase** como base de datos (no levanta Postgres local).

#### Errores comunes al arrancar la API

| Síntoma en `docker compose logs api` | Causa | Solución |
|--------|--------|----------|
| `password authentication failed for user "postgres"` | Contraseña o URL mal codificada | Regenera password en Supabase y URL-encode (`@→%40`, `*→%2A`, `$→%24`, etc.). |
| `invalid URI query parameter: "prepare_threshold"` | Imagen antigua | `docker compose build api --no-cache`. |
| Cuelga mucho sin error | Proyecto pausado o red bloqueada | Reactiva el proyecto; comprueba puertos 5432/6543. |
| Warning del Transaction Pooler (6543) | Pooler de transacciones | Funciona; para migraciones a veces conviene Session pooler (5432). |

Abre `http://localhost:3000` (redirige a `/chats`). En **Ajustes** configura LLM, Twilio cuando lo tengas y, si quieres huecos reales, **Google Calendar**.

### Túnel HTTPS (Twilio)

La URL del webhook debe ser **HTTPS** y **pública**:

1. **Docker (recomendado en Windows)** con la pila arriba:
   ```powershell
   .\dev-tunnel.ps1 -Docker
   ```
   Logs: `docker compose logs -f tunnel`. Parar: `docker compose --profile tunnel stop tunnel`.

2. **cloudflared** en el PC hacia `http://127.0.0.1:8000`, o `.\dev-tunnel.ps1` si está en el PATH.

3. **ngrok**: `ngrok http 8000`.

### Opción B — WhatsApp Sandbox (Twilio)

1. Misma base que la opción A.
2. Cuenta Twilio + **WhatsApp Sandbox** y código de unión.
3. Túnel hacia `localhost:8000`.
4. En **Ajustes** (`/configuracion`): Account SID, Auth Token, `WEBHOOK_BASE_URL` del túnel; copia la URL del webhook al sandbox de Twilio.
5. Únete al sandbox y envía un mensaje; verás la conversación en `/chats`.

En producción activa `TWILIO_VALIDATE_SIGNATURE=true` y asegúrate de que `WEBHOOK_BASE_URL` coincida **exactamente** con la URL que llama Twilio.

---

## Lo que ves en el panel

| Ruta | Función |
|------|---------|
| `/` | Redirige a `/chats`. |
| `/chats`, `/chats/[id]` | Inbox, detalle, notas, tags, handoff. |
| `/citas` | Citas confirmadas/canceladas, filtros, exportación. |
| `/leads` | Redirige a `/citas` (el producto actual es agendamiento). |
| `/conversations`, `/conversations/[id]` | Vista alternativa de conversación. |
| `/configuracion` | Twilio, LLM, webhook, Google Calendar, horario semanal, servicios, menú de bienvenida, personalidad del agente. |
| `/estado` | Versión API, `GIT_COMMIT`, salud de DB y Redis. |

---

## Herramientas del agente (LLM)

| Tool | Rol |
|------|-----|
| `get_available_slots` | Huecos libres para un día (Calendar + citas en BD); respeta servicios y duraciones del panel. |
| `book_appointment` | Crea cita y evento en Google si aplica; exige `service_label` si hay lista de servicios estructurada. |
| `list_my_appointments` | Lista citas del cliente (teléfono de la conversación). |
| `cancel_appointment` | Cancela por UUID de cita. |
| `reschedule_appointment` | Mueve una cita a nuevo inicio/fin ISO. |
| `request_human_handoff` | Marca escalamiento a operador humano. |

El system prompt se arma en `apps/api/app/agent/tool_handlers.py` a partir de la configuración efectiva (`EffectiveSettings` + `booking_config`).

## API interna (panel Next)

Rutas `/internal/*` con header `X-API-Key: $INTERNAL_API_KEY` (o `Authorization: Bearer …`). Next.js reenvía desde `app/api/internal/*` con `BACKEND_URL`.

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/internal/status` | Versión, commit, DB, Redis. |
| `GET` | `/internal/conversations` | Lista paginada. |
| `GET` | `/internal/conversations/{id}` | Mensajes, lead legacy si existe, **citas** asociadas. |
| `PATCH` | `/internal/conversations/{id}/panel` | Notas y tags. |
| `POST` | `/internal/conversations/{id}/handoff` | Escalar. |
| `POST` | `/internal/conversations/{id}/handoff/resolve` | Reabrir. |
| `GET` | `/internal/leads` | API legacy; la UI de leads redirige a citas. |
| `GET` | `/internal/appointments` | Lista de citas con filtros opcionales. |
| `GET`, `PUT` | `/internal/settings` | Configuración del workspace. |
| `POST` | `/internal/settings/agent-catalog/parse` | CSV/Excel → líneas de catálogo. |
| `POST` | `/webhooks/twilio/whatsapp` | Público; rate limit 120/min. |
| `GET` | `/health`, `/health/ready`, `/metrics` | Liveness, readiness, Prometheus. |

OpenAPI en vivo: `http://localhost:8000/docs` con la API levantada.

---

## Stack

| Capa | Tecnología |
|------|------------|
| API | FastAPI, SQLAlchemy 2 async, asyncpg, slowapi, prometheus-client |
| Migraciones | Alembic + init en startup |
| Agente | `google-genai`, `openai`, loop tool-calling (máx. 8 iteraciones), reintentos ante cuotas |
| Calendario | Google Calendar API vía cuenta de servicio (`app/integrations/google_calendar.py`) |
| Datos | Supabase Postgres |
| Cola opcional | Redis para rate limit compartido |
| Frontend | Next.js 15 (App Router), Tailwind, BFF `app/api/internal/*` |
| Mensajería | Twilio WhatsApp (sandbox o producción) |
| CI | GitHub Actions: API (Postgres 16 + Ruff + pytest), web (ESLint + build) |

---

## Limitaciones (alcance actual)

- **Single-tenant**: quien tenga `INTERNAL_API_KEY` ve todo el workspace; no hay `workspace_id` en rutas internas.
- **Secretos en panel/BD** para desarrollo ágil; no sustituyen un vault en producción.
- **TwiML síncrono**: si el LLM + Calendar tardan demasiado, Twilio puede cortar por timeout (sin cola async en este demo).
- **Tests** mayormente unitarios con mocks; CI no ejecuta el stack completo contra Calendar real.
- Ver riesgos y backlog en [`TODO_PRODUCTION.md`](./TODO_PRODUCTION.md) y [`PLAN_WHATSAPP_AGENT.md`](./PLAN_WHATSAPP_AGENT.md).

---

## Estructura del repo

```
.
├── apps/
│   ├── api/                 FastAPI, webhooks, agente, migraciones
│   │   ├── app/
│   │   │   ├── agent/       gemini_agent, tool_handlers, prompt de reservas
│   │   │   ├── integrations/google_calendar.py
│   │   │   ├── routers/     internal, workspace_settings
│   │   │   ├── webhooks/    twilio_whatsapp.py
│   │   │   ├── services/    orchestrator, booking_config, effective_settings
│   │   │   └── models/      Conversation, Message, Appointment, Handoff, …
│   │   ├── migrations/      Alembic (incl. citas y settings de booking)
│   │   └── tests/
│   └── web/                 Next.js — chats, citas, configuracion, estado
├── supabase/migrations/     SQL alternativo
├── docker-compose.yml
├── .env.example
└── PLAN_WHATSAPP_AGENT.md
```

---

## Variables de entorno (resumen)

| Ámbito | Variable | Notas |
|--------|----------|--------|
| Raíz / Compose | `DATABASE_URL` | Obligatorio; Session pooler Supabase. |
| Raíz | `INTERNAL_API_KEY` | Compartida API + BFF Next; cámbiala. |
| API | `TWILIO_*`, `WEBHOOK_BASE_URL` | Sandbox o prod; firma con `TWILIO_VALIDATE_SIGNATURE`. |
| API | `OPENAI_API_KEY` / `GEMINI_API_KEY` | También editables en el panel. |
| API | `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Opcional en `.env`; suele bastar configurarlas en **Ajustes**. |
| API | `REDIS_URL` | Vacío = rate limit en memoria. |
| Web | `BACKEND_URL`, `INTERNAL_API_KEY` | Ver `apps/web/.env.example` para desarrollo local. |

### Arranque sin Docker

```bash
# API
cd apps/api
python3.12 -m venv .venv && source .venv/bin/activate   # Windows: .venv\Scripts\activate
pip install -e ".[dev]"
export DATABASE_URL=postgresql+asyncpg://...   # misma URI que en Compose
export INTERNAL_API_KEY=dev-internal-key
uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Web (otra terminal)
cd apps/web
cp .env.example .env.local && npm install
# En .env.local: BACKEND_URL=http://127.0.0.1:8000 e INTERNAL_API_KEY igual que la API
npm run dev
```

### Tipos TypeScript desde OpenAPI

```powershell
cd apps/api; python scripts/export_openapi.py
cd ..\web; npm run gen:api-types
```

Genera `apps/web/src/lib/api-v1.d.ts`.

---

## Documentación adicional

- [`PLAN_WHATSAPP_AGENT.md`](./PLAN_WHATSAPP_AGENT.md) — diseño y fases.
- [`TODO_PRODUCTION.md`](./TODO_PRODUCTION.md) — hardening y multi-tenant.
- [`.github/workflows/ci.yml`](./.github/workflows/ci.yml) — CI.

## Licencia

Proyecto de demostración / producto interno — añade la licencia que corresponda.
