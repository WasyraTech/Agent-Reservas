/**
 * Server-only env.
 * Si no hay INTERNAL_API_KEY pero el backend es local, usamos `dev-internal-key`
 * (igual que el default de FastAPI) — sirve para `next dev` y `next start` en local.
 */

import { existsSync } from "node:fs";

/**
 * Lee variables de entorno en runtime sin clave literal `process.env.BACKEND_URL`, para que
 * Turbopack/Next no sustituya el valor en `next build` (el contenedor inyecta URL en arranque).
 */
function readEnvJoined(parts: string[]): string | undefined {
  const key = parts.join("");
  const v = process.env[key];
  return typeof v === "string" && v.trim() ? v.trim() : undefined;
}

function inDockerRuntime(): boolean {
  // Node en Windows (next dev / next start en el host) nunca está en la red de Compose:
  // el hostname `api` no resuelve aunque exista RUNNING_IN_DOCKER=1 en el entorno.
  if (process.platform === "win32") {
    return false;
  }
  if (readEnvJoined(["RUNNING", "_IN", "_DOCKER"]) === "1") {
    return true;
  }
  try {
    return existsSync("/.dockerenv");
  } catch {
    return false;
  }
}

/**
 * El hostname `api` solo existe en la red de Docker Compose. Fuera de ese runtime
 * (p. ej. `next dev` / `next start` en Windows con la misma URL que en compose) DNS falla
 * con ENOTFOUND — también con NODE_ENV=production en standalone local.
 */
function resolveBackendUrl(raw: string): string {
  try {
    const u = new URL(raw);
    if (u.hostname.toLowerCase() !== "api") {
      return raw;
    }
    if (inDockerRuntime()) {
      return raw;
    }
    const port = u.port || "8000";
    return `http://127.0.0.1:${port}`;
  } catch {
    return raw;
  }
}

export function getBackendUrl(): string {
  const raw =
    readEnvJoined(["BACKEND", "_URL"]) ?? "http://127.0.0.1:8000";
  return resolveBackendUrl(raw);
}

function isLocalBackend(urlStr: string): boolean {
  try {
    const host = new URL(urlStr).hostname.toLowerCase();
    return host === "localhost" || host === "127.0.0.1" || host === "0.0.0.0";
  } catch {
    return false;
  }
}

export function getInternalApiKey(): string {
  const key = readEnvJoined(["INTERNAL", "_API", "_KEY"]);
  if (key) {
    return key;
  }
  if (process.env.NODE_ENV === "development" || isLocalBackend(getBackendUrl())) {
    return "dev-internal-key";
  }
  throw new Error(
    "INTERNAL_API_KEY is not set. Add it to apps/web/.env.local (see apps/web/.env.example).",
  );
}
