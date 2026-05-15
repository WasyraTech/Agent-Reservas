import { IconBot, IconSliders } from "./configuracion-icons";
import type { SettingsTab } from "./configuracion-types";

export function SettingsTabBar({
  tab,
  onTabChange,
}: {
  tab: SettingsTab;
  onTabChange: (t: SettingsTab) => void;
}) {
  return (
    <div
      className="flex flex-col gap-1 rounded-lg border border-[var(--wa-border)] bg-[var(--wa-header)] p-1 sm:flex-row sm:gap-1"
      role="tablist"
      aria-label="Secciones de ajustes"
    >
      <button
        type="button"
        role="tab"
        aria-selected={tab === "general"}
        id="tab-general"
        onClick={() => onTabChange("general")}
        className={[
          "flex flex-1 items-center gap-3 rounded-md px-3 py-3 text-left transition sm:px-4",
          tab === "general"
            ? "bg-[var(--wa-card-bg)] text-[var(--wa-text)] shadow-sm ring-1 ring-[var(--wa-border)]"
            : "text-[var(--wa-text-muted)] hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--wa-text-muted)]",
            tab === "general"
              ? "border-[var(--wa-border)] bg-[var(--wa-ok-banner-bg)] text-[var(--wa-accent-soft)]"
              : "border-transparent bg-[var(--wa-panel)]",
          ].join(" ")}
          aria-hidden
        >
          <IconSliders className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--wa-text)]">Configuración general</span>
          <span className="mt-0.5 block text-xs text-[var(--wa-text-muted)]">Twilio, webhook e IA</span>
        </span>
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={tab === "agent"}
        id="tab-agent"
        onClick={() => onTabChange("agent")}
        className={[
          "flex flex-1 items-center gap-3 rounded-md px-3 py-3 text-left transition sm:px-4",
          tab === "agent"
            ? "bg-[var(--wa-card-bg)] text-[var(--wa-text)] shadow-sm ring-1 ring-[var(--wa-border)]"
            : "text-[var(--wa-text-muted)] hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)]",
        ].join(" ")}
      >
        <span
          className={[
            "flex h-9 w-9 shrink-0 items-center justify-center rounded-full border text-[var(--wa-text-muted)]",
            tab === "agent"
              ? "border-[var(--wa-border)] bg-[var(--wa-ok-banner-bg)] text-[var(--wa-accent-soft)]"
              : "border-transparent bg-[var(--wa-panel)]",
          ].join(" ")}
          aria-hidden
        >
          <IconBot className="h-4 w-4" />
        </span>
        <span className="min-w-0">
          <span className="block text-sm font-semibold text-[var(--wa-text)]">Agente de WhatsApp</span>
          <span className="mt-0.5 block text-xs text-[var(--wa-text-muted)]">Horarios, servicios y menú</span>
        </span>
      </button>
    </div>
  );
}
