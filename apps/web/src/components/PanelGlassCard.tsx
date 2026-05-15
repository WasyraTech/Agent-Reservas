import type { ReactNode } from "react";

type PanelGlassCardProps = {
  children: ReactNode;
  className?: string;
  flush?: boolean;
  /** Borde degradado sutil (estilo “premium” sobre base WA). */
  elevated?: boolean;
};

/** Tarjeta panel: superficie y borde según tema. */
export function PanelGlassCard({
  children,
  className = "",
  flush = false,
  elevated = false,
}: PanelGlassCardProps) {
  const innerPad = flush ? "" : "p-5 sm:p-6";
  const innerBase = [
    "rounded-[inherit] border shadow-[0_1px_2px_rgba(11,20,26,0.06)] transition-colors duration-300",
    "border-[var(--wa-border)]/90 bg-[var(--wa-card-bg)] text-[var(--wa-text)]",
    "hover:bg-[var(--wa-card-hover)]",
    innerPad,
  ].join(" ");

  if (elevated) {
    return (
      <div className={["ar-panel-elevated-ring rounded-2xl transition-shadow duration-300", className].join(" ")}>
        <div className={[innerBase, "rounded-2xl", flush ? "overflow-hidden" : ""].join(" ")}>{children}</div>
      </div>
    );
  }

  const base =
    "ar-panel-card-flat rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] text-[var(--wa-text)] hover:bg-[var(--wa-card-hover)] " +
    innerPad;

  if (flush) {
    return <div className={[base, "overflow-hidden", className].join(" ")}>{children}</div>;
  }

  return <div className={[base, className].join(" ")}>{children}</div>;
}
