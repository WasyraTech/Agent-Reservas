/**
 * Capturas para README.md → ../../docs/screenshots/
 *
 * Requisitos:
 * - API en BACKEND_URL (p. ej. docker compose: 127.0.0.1:8000)
 * - Next en SCREENSHOT_BASE_URL con PANEL_SESSION_REQUIRED=false (p. ej. puerto 3010)
 *
 * Uso (desde apps/web):
 *   npx playwright install chromium
 *   npm run readme:capture
 */

import { mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

import { chromium } from "playwright";

const __dirname = dirname(fileURLToPath(import.meta.url));
const repoRoot = join(__dirname, "..", "..", "..");
const outDir = join(repoRoot, "docs", "screenshots");

/** Usar `localhost` evita el aviso de origen cruzado 127.0.0.1 → /_next en Next dev. */
const base = (process.env.SCREENSHOT_BASE_URL || "http://localhost:3010").replace(/\/$/, "");

/** @type {{ path: string; file: string; waitMs?: number }[]} */
const shots = [
  { path: "/login", file: "panel-login.png", waitMs: 1200 },
  { path: "/register", file: "panel-register.png", waitMs: 1200 },
  { path: "/chats", file: "panel-chats.png", waitMs: 1500 },
  { path: "/citas", file: "panel-citas.png", waitMs: 2000 },
  { path: "/configuracion", file: "panel-configuracion.png", waitMs: 4500 },
  { path: "/estado", file: "panel-estado.png", waitMs: 4000 },
];

async function main() {
  await mkdir(outDir, { recursive: true });
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 1,
  });
  try {
    for (const s of shots) {
      const url = `${base}${s.path}`;
      process.stdout.write(`Screenshot ${s.file} ← ${url}\n`);
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 90_000 });
      await new Promise((r) => setTimeout(r, s.waitMs ?? 1000));
      await page.screenshot({
        path: join(outDir, s.file),
        type: "png",
        fullPage: false,
      });
    }
  } finally {
    await browser.close();
  }
  process.stdout.write(`OK → ${outDir}\n`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
