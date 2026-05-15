import type { ReactNode } from "react";

/** Encabezado de página con jerarquía clara y acento tipo producto WA+. */
export function PanelPageHeader({
  eyebrow,
  title,
  subtitle,
  children,
  icon,
}: {
  eyebrow: string;
  title: string;
  subtitle?: ReactNode;
  children?: ReactNode;
  /** Icono decorativo (p. ej. IconSparkles) a la izquierda del bloque de título. */
  icon?: ReactNode;
}) {
  return (
    <header className="mb-7 border-b border-[var(--wa-border)] pb-6 sm:mb-9 sm:pb-7">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:gap-6">
        {icon ? (
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--wa-chip-bg)] to-[var(--wa-panel-hover)] text-[var(--wa-accent-soft)] shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] ring-1 ring-[var(--wa-border)]">
            {icon}
          </div>
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span
              className="h-1 w-6 shrink-0 rounded-full bg-gradient-to-r from-[var(--wa-nav-indicator)] to-[var(--wa-accent-soft)]"
              aria-hidden
            />
            <p className="text-[12px] font-semibold uppercase tracking-[0.12em] text-[var(--wa-accent-soft)]">{eyebrow}</p>
          </div>
          <h1 className="mt-1.5 text-[clamp(1.35rem,2.5vw,1.6rem)] font-semibold leading-[1.2] tracking-tight text-[var(--wa-text)]">
            {title}
          </h1>
          {subtitle ? (
            <p className="mt-2.5 max-w-2xl text-[15px] leading-relaxed text-[var(--wa-text-muted)]">{subtitle}</p>
          ) : null}
          {children}
        </div>
      </div>
    </header>
  );
}
