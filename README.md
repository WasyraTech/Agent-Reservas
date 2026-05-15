# Agent-Reservas

Agente de **WhatsApp** orientado a **reservas y citas** (salud, belleza, consultorías, etc.): el cliente escribe por WhatsApp, el LLM consulta disponibilidad en **Google Calendar**, confirma o modifica citas en base de datos y sincroniza eventos. Incluye **panel web** (login con **Twilio Verify** por SMS o WhatsApp, chats, agenda, ajustes), **operadores** con **asignación de conversaciones** y **escalamiento a humano** cuando hace falta.

[![CI](https://github.com/wasyra/Agent-Reservas/actions/workflows/ci.yml/badge.svg)](https://github.com/wasyra/Agent-Reservas/actions/workflows/ci.yml)
![Python](https://img.shields.io/badge/python-3.12+-3776AB?logo=python&logoColor=white)
![Next.js](https://img.shields.io/badge/Next.js-15-000000?logo=nextdotjs)
![FastAPI](https://img.shields.io/badge/FastAPI-async-009688?logo=fastapi)
![Supabase](https://img.shields.io/badge/Supabase-Postgres-3ECF8E?logo=supabase)

---

## ¿Qué es esto?

Un negocio en LATAM conecta su **WhatsApp (Twilio)** a este agente. Cuando un cliente escribe, el flujo típico es:

1. Twilio envía el mensaje al webhook; la API valida firma HMAC (opcional), aplica rate limit y deduplica por `MessageSid`.
2. Se resuelve el **workspace** (negocio) a partir del número Twilio `To` y se carga la configuración (horarios, servicios con duración, zona horaria, tono, FAQ) desde **Supabase**.
3. Un LLM (**Gemini** u **OpenAI**, elegible en el panel) ejecuta **tool calling** con hasta **8 iteraciones** para consultar huecos, reservar, listar, cancelar o reprogramar citas, y escalar a humano si corresponde.
4. Las citas confirmadas se guardan en Postgres y, si configuraste Google, se crean o actualizan eventos en **Google Calendar**.
5. La respuesta vuelve por **TwiML** a WhatsApp (modo síncrono por defecto; opcionalmente vía **cola Redis + worker**). Los **operadores** entran al panel con **OTP (Twilio Verify)**, ven conversaciones según su rol y pueden **reclamar** o **reasignar** chats.

El frontend **Next.js** es el panel interno: **registro e inicio de sesión**, inbox de chats, vista **Citas** con filtros y exportación, **Ajustes** (Twilio, LLM, Google Calendar, horarios, servicios, menú de bienvenida) y **Estado** del despliegue.

## ¿Qué demuestra?

- **Agenda real**: huecos calculados cruzando ocupación de Calendar + citas ya guardadas en BD.
- **Tool calling** tipado: `get_available_slots`, `book_appointment`, `list_my_appointments`, `cancel_appointment`, `reschedule_appointment`, `request_human_handoff`.
- **Multi-proveedor LLM** sin reiniciar: Gemini ↔ OpenAI desde el panel.
- **Workspaces** (multi-negocio en BD): clave maestra `INTERNAL_API_KEY` + cabecera opcional `X-Workspace-Id`, o **claves por workspace** (`workspace_api_keys` con pepper).
- **Panel seguro**: OTP con **Twilio Verify** (`TWILIO_VERIFY_SERVICE_SID`, canal `sms` o `whatsapp`), cookie httpOnly de sesión y cabecera **`X-Panel-Session`** hacia la API.
- **Operadores** (`admin` / `operator`): los no admin solo ven conversaciones sin asignar o asignadas a ellos; **claim** y **assignment** de conversaciones.
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
   │   • Verify OTP (panel)   │
   └────────┬─────────────────┘
            │ SQLAlchemy async
            ▼
       Supabase (Postgres)
            ▲
            │ BFF + cabeceras (clave, workspace, sesión panel)
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
- Para **registro / login del panel**: cuenta Twilio con **Verify** (SID `VA…`), `TWILIO_ACCOUNT_SID` y `TWILIO_AUTH_TOKEN`. Por defecto el OTP va por **SMS** (`TWILIO_VERIFY_CHANNEL=sms`); **WhatsApp** en Verify exige Messaging Service + sender WhatsApp aprobado en la consola.
- Para probar agenda de verdad: cuenta de servicio de Google con acceso al calendario del negocio (también se puede pegar JSON e ID de calendario en **Ajustes** del panel).

### Opción A — Panel + API, sin WhatsApp de clientes

```powershell
copy .env.example .env
# Edita .env: DATABASE_URL obligatorio (Supabase → Connect → Session pooler).
# Opcional: TWILIO_VERIFY_* para /register y /login del panel.
docker compose up --build
```

Compose usa **solo Supabase** como base de datos (no levanta Postgres local). Redis y la API comparten red; el **worker** de respuestas async es opt-in (`--profile worker`, ver más abajo).

#### Errores comunes al arrancar la API

| Síntoma en `docker compose logs api` | Causa | Solución |
|--------|--------|----------|
| `password authentication failed for user "postgres"` | Contraseña o URL mal codificada | Regenera password en Supabase y URL-encode (`@→%40`, `*→%2A`, `$→%24`, etc.). |
| `invalid URI query parameter: "prepare_threshold"` | Imagen antigua | `docker compose build api --no-cache`. |
| Cuelga mucho sin error | Proyecto pausado o red bloqueada | Reactiva el proyecto; comprueba puertos 5432/6543. |
| Warning del Transaction Pooler (6543) | Pooler de transacciones | Funciona; para migraciones a veces conviene Session pooler (5432). |

Abre `http://localhost:3000` (redirige a `/chats` si ya hay sesión de panel). Sin sesión, en **producción** el middleware envía a **`/login`**; en desarrollo puedes desactivar la exigencia de cookie con `PANEL_SESSION_REQUIRED=false` en el entorno del **servicio web** (ver Docker / despliegue). Tras entrar, en **Ajustes** puedes completar LLM, Twilio de clientes y Google Calendar.

### Túnel HTTPS (Twilio)

La URL del webhook debe ser **HTTPS** y **pública**:

1. **Docker (recomendado en Windows)** con la pila arriba:
   ```powershell
   .\dev-tunnel.ps1 -Docker
   ```
   Logs: `docker compose logs -f tunnel`. Parar: `docker compose --profile tunnel stop tunnel`.

2. **cloudflared** en el PC hacia `http://127.0.0.1:8000`, o `.\dev-tunnel.ps1` si está en el PATH.

3. **ngrok**: `ngrok http 8000`.

### Opción B — WhatsApp Sandbox (Twilio) para clientes

1. Misma base que la opción A.
2. Cuenta Twilio + **WhatsApp Sandbox** y código de unión.
3. Túnel hacia `localhost:8000`.
4. En **Ajustes** (`/configuracion`): Account SID, Auth Token, `WEBHOOK_BASE_URL` del túnel; copia la URL del webhook al sandbox de Twilio.
5. Únete al sandbox y envía un mensaje; verás la conversación en `/chats`.

En producción activa `TWILIO_VALIDATE_SIGNATURE=true` y asegúrate de que `WEBHOOK_BASE_URL` coincida **exactamente** con la URL que llama Twilio.

### Respuestas async del webhook (opcional)

Si `WEBHOOK_ASYNC_REPLIES=true` en `.env` y Redis disponible:

```powershell
docker compose --profile worker up -d
```

El webhook encola la generación de respuesta y el **worker** envía el mensaje por la API REST de Twilio, reduciendo riesgo de timeout en conversaciones largas.

---

## Capturas del panel (UI)

Ejemplos del panel **Next.js** (tema claro). Las imágenes viven en [`docs/screenshots/`](./docs/screenshots/); en GitHub, si ves versiones cacheadas, recarga forzada (**Ctrl+Shift+R**) o sube el `?v=` en las URLs.

### Inicio de sesión (OTP)

![Inicio de sesión con teléfono y código OTP](./docs/screenshots/panel-login.png?v=1)

### Registro (alta de negocio + admin)

![Registro con nombre de negocio y OTP](./docs/screenshots/panel-register.png?v=1)

### Chats (inbox)

![Lista de conversaciones y panel lateral](./docs/screenshots/panel-chats.png?v=1)

### Citas

![Citas con filtros y exportación](./docs/screenshots/panel-citas.png?v=1)

### Configuración

![Ajustes: Twilio, LLM, Google Calendar, horarios…](./docs/screenshots/panel-configuracion.png?v=1)

### Estado del despliegue

![Estado: versión API, commit, DB y Redis](./docs/screenshots/panel-estado.png?v=1)

<details>
<summary>Regenerar capturas (Playwright)</summary>

Requiere **API** en marcha (`http://127.0.0.1:8000`) y Next en modo dev con `PANEL_SESSION_REQUIRED=false`. Si el **tour** (`AppTour`) tapa la interfaz en las capturas, quítalo temporalmente de `apps/web/src/app/layout.tsx` antes de ejecutar el script y restáuralo después.

```powershell
cd apps/web
$env:PANEL_SESSION_REQUIRED="false"
$env:BACKEND_URL="http://127.0.0.1:8000"
npm run dev -- -p 3010
```

En otra terminal (`SCREENSHOT_BASE_URL` = mismo host/puerto que “Local:”):

```powershell
cd apps/web
npx playwright install chromium
$env:SCREENSHOT_BASE_URL="http://localhost:3010"
npm run readme:capture
```

Tras cambiar las PNG, si GitHub sigue mostrando imágenes viejas, incrementa `?v=` en las líneas anteriores del README.

</details>

---

## Lo que ves en el panel

| Ruta | Función |
|------|---------|
| `/login`, `/register` | OTP por Twilio Verify (inicio de sesión o alta de negocio + admin). |
| `/` | Redirige a `/chats` (o a `/login` si aplica el middleware). |
| `/chats`, `/chats/[id]` | Inbox, detalle, notas, tags, handoff, barra de **asignación** (claim / operador). |
| `/citas` | Citas confirmadas/canceladas, filtros, exportación. |
| `/leads` | Redirige a `/citas` (el producto actual es agendamiento). |
| `/conversations`, `/conversations/[id]` | Vista alternativa de conversación. |
| `/configuracion` | Twilio, LLM, webhook, Google Calendar, horario semanal, servicios, menú de bienvenida, personalidad del agente. |
| `/estado` | Versión API, `GIT_COMMIT`, salud de DB y Redis. |

El middleware protege (en producción, o si `PANEL_SESSION_REQUIRED=true`) las rutas `/chats`, `/citas`, `/configuracion` y `/estado` exigiendo cookie de sesión del panel.

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

## API interna y panel

### Cabeceras habituales

| Cabecera | Cuándo |
|----------|--------|
| `X-API-Key` o `Authorization: Bearer …` | Clave maestra (`INTERNAL_API_KEY`) o clave de workspace hasheada en BD. |
| `X-Workspace-Id` | Solo con clave **maestra**: elige el workspace (UUID); si se omite, se usa el workspace por defecto del proyecto. |
| `X-Panel-Session` | Token opaco devuelto tras OTP; el BFF Next lo reenvía desde la cookie httpOnly. |

Las rutas **`/internal/panel/auth/*`** (registro, login, verify, logout) exigen la **clave maestra** en el gateway (no usan sesión de operador hasta después del verify).

### Rutas principales

| Método | Ruta | Notas |
|--------|------|--------|
| `GET` | `/internal/status` | Versión, commit, DB, Redis. |
| `GET` | `/internal/conversations` | Lista paginada (filtrada por rol si es operador). |
| `GET` | `/internal/conversations/{id}` | Mensajes, lead legacy si existe, citas asociadas. |
| `PATCH` | `/internal/conversations/{id}/panel` | Notas y tags. |
| `POST` | `/internal/conversations/{id}/handoff` | Escalar. |
| `POST` | `/internal/conversations/{id}/handoff/resolve` | Reabrir. |
| `POST` | `/internal/conversations/{id}/claim` | Operador toma conversación sin asignar. |
| `PATCH` | `/internal/conversations/{id}/assignment` | Admin reasigna conversación. |
| `GET` | `/internal/leads` | API legacy; la UI de leads redirige a citas. |
| `GET` | `/internal/appointments` | Lista de citas con filtros opcionales. |
| `GET`, `PUT` | `/internal/settings` | Configuración del workspace (escritura según rol). |
| `POST` | `/internal/settings/agent-catalog/parse` | CSV/Excel → líneas de catálogo. |
| `POST` | `/internal/panel/auth/start` | Envía OTP a número existente (login). |
| `POST` | `/internal/panel/auth/verify` | Valida OTP y devuelve token de sesión. |
| `POST` | `/internal/panel/auth/register/start` | OTP para alta (número nuevo). |
| `POST` | `/internal/panel/auth/register/verify` | Crea workspace + admin y sesión. |
| `POST` | `/internal/panel/auth/logout` | Invalida sesión. |
| `GET` | `/internal/panel/auth/me` | Perfil del operador autenticado. |
| `GET` | `/internal/panel/operators` | Lista operadores (admin / clave maestra). |
| `GET`, `POST`, `PATCH` | `/internal/workspaces` … | CRUD workspaces y API keys (requiere clave maestra). |
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
| Cola opcional | Redis: rate limit compartido y cola de respuestas webhook (`reply_queue_worker`) |
| Frontend | Next.js 15 (App Router), Tailwind, BFF `app/api/internal/*`, middleware de sesión |
| Mensajería | Twilio WhatsApp (sandbox o producción); **Twilio Verify** para OTP del panel |
| CI | GitHub Actions: API (Postgres 16 + Ruff + pytest), web (ESLint + build) |

---

## Limitaciones (alcance actual)

- **Secretos en panel/BD** para desarrollo ágil; no sustituyen un vault en producción.
- **TwiML síncrono** sigue siendo el camino por defecto; el modo async requiere Redis, perfil **worker** y configuración explícita.
- **Tests** mayormente unitarios con mocks; CI no ejecuta el stack completo contra Calendar real ni Twilio en vivo.
- Ver riesgos y backlog en [`TODO_PRODUCTION.md`](./TODO_PRODUCTION.md) y [`PLAN_WHATSAPP_AGENT.md`](./PLAN_WHATSAPP_AGENT.md).

---

## Estructura del repo

```
.
├── docs/
│   └── screenshots/       PNG del panel (referenciados en README)
├── apps/
│   ├── api/                 FastAPI, webhooks, agente, migraciones
│   │   ├── app/
│   │   │   ├── agent/       gemini_agent, tool_handlers, prompt de reservas
│   │   │   ├── integrations/google_calendar.py
│   │   │   ├── routers/     internal, workspace_settings, panel_auth, panel_team, workspaces_admin
│   │   │   ├── webhooks/    twilio_whatsapp.py
│   │   │   ├── services/    orchestrator, booking_config, effective_settings, twilio_verify_otp, …
│   │   │   ├── deps.py      workspace + sesión panel (InternalCaller)
│   │   │   ├── deps_panel_gateway.py
│   │   │   ├── panel_access.py
│   │   │   └── models/      Workspace, PanelOperator, Conversation, Message, Appointment, …
│   │   ├── migrations/      Alembic (citas, settings, operadores, sesiones, …)
│   │   └── tests/
│   └── web/                 Next.js — login, register, chats, citas, configuracion, estado, BFF internal
├── supabase/migrations/     SQL de referencia / alineación con Alembic
├── docker-compose.yml       api, web, redis; perfiles worker y tunnel
├── .env.example
└── PLAN_WHATSAPP_AGENT.md
```

---

## Variables de entorno (resumen)

| Ámbito | Variable | Notas |
|--------|----------|--------|
| Raíz / Compose | `DATABASE_URL` | Obligatorio; Session pooler Supabase. |
| Raíz | `INTERNAL_API_KEY` | Clave maestra para BFF Next y rutas sensibles; cámbiala en producción. |
| Raíz | `INTERNAL_API_KEY_PEPPER` | Pepper HMAC para `workspace_api_keys`. |
| Raíz | `TWILIO_*`, `WEBHOOK_BASE_URL` | Sandbox o prod; firma con `TWILIO_VALIDATE_SIGNATURE`. |
| Raíz | `TWILIO_VERIFY_SERVICE_SID` | Verify (OTP panel). |
| Raíz | `TWILIO_VERIFY_CHANNEL` | `sms` (por defecto) o `whatsapp` (requiere Verify + WhatsApp configurados en Twilio). |
| Raíz | `OPENAI_API_KEY` / `GEMINI_API_KEY` | También editables en el panel. |
| Raíz | `GOOGLE_CALENDAR_ID`, `GOOGLE_SERVICE_ACCOUNT_JSON` | Opcional en `.env`; suele bastar configurarlas en **Ajustes**. |
| Raíz | `REDIS_URL` | Vacío = rate limit en memoria; en Compose suele apuntar al contenedor `redis`. |
| Raíz | `WEBHOOK_ASYNC_REPLIES` | `true` + worker profile para respuestas async. |
| Raíz | `PANEL_BOOTSTRAP_ADMIN_*`, `PANEL_SESSION_DAYS` | Opcional: primer admin y duración de sesión (ver `apps/api/.env.example`). |
| Web (build/runtime) | `BACKEND_URL`, `INTERNAL_API_KEY` | El contenedor `web` recibe `BACKEND_URL=http://api:8000` desde Compose. |
| Web | `PANEL_SESSION_REQUIRED` | `false` / `0` / `off` desactiva la redirección a `/login` fuera de producción útil para demos locales. |

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
npm install
# Variables: BACKEND_URL=http://127.0.0.1:8000, INTERNAL_API_KEY igual que la API
# En Windows, no uses el hostname `api` salvo que estés en la red de Docker.
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
