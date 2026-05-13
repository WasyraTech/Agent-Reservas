import type { ReactNode } from "react";

/**
 * Tarjeta de configuración con estilo «premium»: borde luminoso, profundidad y jerarquía clara.
 */
export function AgentConfigCard({
  step,
  title,
  hint,
  children,
  accent = "emerald",
}: {
  step: string;
  title: string;
  hint: string;
  children: ReactNode;
  accent?: "emerald" | "violet" | "amber";
}) {
  const accentRing =
    accent === "violet"
      ? "from-violet-500/50 via-fuchsia-500/20 to-transparent"
      : accent === "amber"
        ? "from-amber-400/45 via-orange-500/15 to-transparent"
        : "from-[var(--wa-accent)]/50 via-teal-400/15 to-transparent";

  return (
    <div className="group relative">
      <div
        aria-hidden
        className={`pointer-events-none absolute -inset-px rounded-2xl bg-gradient-to-br ${accentRing} opacity-70 blur-[1px] transition duration-300 group-hover:opacity-100`}
      />
      <div className="relative overflow-hidden rounded-2xl border border-white/[0.08] bg-[#141c22]/95 shadow-[0_20px_50px_-24px_rgba(0,0,0,0.85)] ring-1 ring-white/[0.04] backdrop-blur-sm">
        <div className="absolute inset-0 bg-gradient-to-br from-white/[0.04] via-transparent to-sky-500/[0.03] pointer-events-none" />
        <div className="relative p-4 sm:p-6">
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <p className="font-mono text-[10px] font-semibold uppercase tracking-[0.2em] text-[var(--wa-accent-soft)]/90">
              {step}
            </p>
          </div>
          <h3 className="mt-2 font-[family-name:var(--font-display)] text-lg font-semibold tracking-tight text-[var(--wa-text)] sm:text-xl">
            {title}
          </h3>
          <p className="mt-2 max-w-prose text-sm leading-relaxed text-[var(--wa-text-muted)]">{hint}</p>
          <div className="mt-5 border-t border-white/[0.06] pt-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
