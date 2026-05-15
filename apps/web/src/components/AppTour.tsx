"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

const STORAGE_KEY = "wsp_agent_ui_tour_v1_done";

const steps = [
  {
    title: "Inicio",
    body: "Aquí ves un resumen rápido: últimos chats y citas de hoy. El menú inferior (móvil) o la barra lateral lleva al resto del panel. Usa Claro/Oscuro arriba a la derecha para el tema.",
    href: "/",
  },
  {
    title: "Chats",
    body: "Tu bandeja estilo WhatsApp Web: lista con vista previa, actualización automática y acciones para abrir WhatsApp desde cada conversación.",
    href: "/chats",
  },
  {
    title: "Citas y Ajustes",
    body: "En Citas revisas la agenda; en Ajustes configuras Twilio, IA y personalidad. Si un chat marca error de IA, revisa claves y modelo allí.",
    href: "/citas",
  },
] as const;

function TourModalChrome({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative w-full max-w-md">
      <div className="rounded-[1.25rem] bg-gradient-to-br from-[var(--wa-card-bg)] via-[var(--wa-panel-hover)] to-[var(--wa-accent-soft)]/15 p-px shadow-[0_28px_56px_-18px_rgba(11,20,26,0.35)]">
        <div className="cfg-modal-panel panel-modal-glow relative overflow-hidden rounded-[1.2rem] border border-[var(--wa-border)]/95 bg-[var(--wa-card-bg)]/98 p-5 text-[var(--wa-text)] backdrop-blur-xl sm:p-6">
          <div
            className="pointer-events-none absolute inset-x-8 top-0 h-px rounded-full bg-gradient-to-r from-transparent via-[var(--wa-nav-indicator)]/50 to-transparent"
            aria-hidden
          />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

export function AppTour() {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);

  useEffect(() => {
    try {
      if (typeof window !== "undefined" && !localStorage.getItem(STORAGE_KEY)) {
        setOpen(true);
      }
    } catch {
      setOpen(true);
    }
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const close = useCallback((markDone: boolean) => {
    if (markDone) {
      try {
        localStorage.setItem(STORAGE_KEY, "1");
      } catch {
        /* ignore */
      }
    }
    setOpen(false);
  }, []);

  if (!open) return null;

  const s = steps[step]!;

  return (
    <div
      className="fixed inset-0 z-[100] flex items-end justify-center bg-[radial-gradient(ellipse_85%_55%_at_50%_28%,rgba(11,20,26,0.42),rgba(11,20,26,0.82))] p-4 pb-6 backdrop-blur-[3px] sm:items-center sm:pb-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="tour-title"
    >
      <TourModalChrome>
        <div className="flex items-start justify-between gap-3">
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-[var(--wa-accent-soft)]">
            Recorrido · {step + 1}/{steps.length}
          </p>
          <button
            type="button"
            className="ar-focus-ring shrink-0 rounded-full border border-[var(--wa-border)] bg-[var(--wa-panel-hover)] px-3 py-1.5 text-[12px] font-semibold text-[var(--wa-text)] shadow-sm transition hover:bg-[var(--wa-panel)]"
            onClick={() => close(true)}
          >
            Saltar
          </button>
        </div>
        <div className="mt-4 flex justify-center gap-1.5" aria-hidden>
          {steps.map((_, i) => (
            <span
              key={i}
              className={[
                "h-1.5 rounded-full transition-all duration-300 motion-reduce:transition-none",
                i === step
                  ? "w-7 bg-[var(--wa-nav-indicator)] shadow-[0_0_12px_-2px_rgba(37,211,102,0.45)]"
                  : "w-1.5 bg-[var(--wa-border)]",
              ].join(" ")}
            />
          ))}
        </div>
        <h2 id="tour-title" className="mt-3 text-lg font-semibold tracking-tight text-[var(--wa-text)]">
          {s.title}
        </h2>
        <p className="mt-2 text-sm leading-relaxed text-[var(--wa-text-muted)]">{s.body}</p>
        <div className="mt-5 flex flex-wrap gap-2">
          <Link
            href={s.href}
            className="ar-focus-ring inline-flex min-h-[2.5rem] items-center justify-center rounded-xl bg-[#25D366] px-4 py-2 text-sm font-semibold text-white shadow-[0_4px_14px_-4px_rgba(37,211,102,0.5)] transition hover:bg-[#20bd5a] active:scale-[0.98] motion-reduce:active:scale-100"
            onClick={() => close(true)}
          >
            Ir a {s.title}
          </Link>
          {step < steps.length - 1 ? (
            <button
              type="button"
              className="ar-focus-ring rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel-hover)] px-3 py-2 text-sm font-semibold text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel)]"
              onClick={() => setStep((x) => x + 1)}
            >
              Siguiente
            </button>
          ) : (
            <button
              type="button"
              className="ar-focus-ring rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel-hover)] px-3 py-2 text-sm font-semibold text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel)]"
              onClick={() => close(true)}
            >
              Listo
            </button>
          )}
          <button
            type="button"
            className="ar-focus-ring ml-auto text-xs font-medium text-[var(--wa-text-muted)] transition hover:text-[var(--wa-link)] hover:underline"
            onClick={() => close(true)}
          >
            No volver a mostrar
          </button>
        </div>
      </TourModalChrome>
    </div>
  );
}
