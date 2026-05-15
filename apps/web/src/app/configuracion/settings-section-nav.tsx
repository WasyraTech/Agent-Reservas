"use client";

import type { SettingsTab } from "./configuracion-types";

const GENERAL = [
  { href: "#cfg-twilio", label: "Twilio" },
  { href: "#cfg-webhook", label: "Webhook" },
  { href: "#cfg-calendar", label: "Calendar" },
  { href: "#cfg-llm", label: "IA" },
  { href: "#cfg-reminders", label: "Recordatorios" },
] as const;

const AGENT = [
  { href: "#cfg-agent-identidad", label: "Identidad" },
  { href: "#cfg-agent-horarios", label: "Horarios" },
  { href: "#cfg-agent-servicios", label: "Servicios" },
  { href: "#cfg-agent-bienvenida", label: "Bienvenida" },
  { href: "#cfg-agent-tono", label: "Tono" },
] as const;

export function SettingsSectionNav({ tab }: { tab: SettingsTab }) {
  const links = tab === "general" ? GENERAL : AGENT;
  return (
    <nav
      aria-label="Ir a sección"
      className="sticky top-0 z-[5] -mx-4 mb-5 border-b border-[var(--wa-border)] bg-[var(--wa-bg-app)]/94 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6"
    >
      <div className="flex gap-2 overflow-x-auto pb-0.5 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {links.map((l) => (
          <a
            key={l.href}
            href={l.href}
            className="ar-focus-ring shrink-0 rounded-full border border-[var(--wa-border)] bg-[var(--wa-panel)] px-3 py-1.5 text-[12px] font-semibold text-[var(--wa-text)] transition hover:bg-[var(--wa-panel-hover)]"
          >
            {l.label}
          </a>
        ))}
      </div>
    </nav>
  );
}
