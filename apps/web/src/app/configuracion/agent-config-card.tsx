import type { ReactNode } from "react";

export function AgentConfigCard({
  step,
  title,
  hint,
  children,
  anchorId,
}: {
  step: string;
  title: string;
  hint: string;
  children: ReactNode;
  /** Ancla para navegación rápida (#id) en la pestaña Agente */
  anchorId?: string;
}) {
  return (
    <div id={anchorId} className={anchorId ? "scroll-mt-28" : undefined}>
      <div className="wa-card overflow-hidden">
        <div className="border-b border-[var(--wa-border)] bg-[var(--wa-bg-elevated)] px-4 py-3 sm:px-5 sm:py-3.5">
          <p className="font-mono text-[10px] uppercase tracking-wide text-[var(--wa-text-muted)]">{step}</p>
          <h3 className="mt-1 text-base font-semibold text-[var(--wa-text)] sm:text-lg">{title}</h3>
          <p className="mt-1.5 max-w-prose text-sm leading-relaxed text-[var(--wa-text-muted)]">{hint}</p>
        </div>
        <div className="px-4 py-4 sm:px-5 sm:py-5">{children}</div>
      </div>
    </div>
  );
}
