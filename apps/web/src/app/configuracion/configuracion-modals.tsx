"use client";

import { useEffect, type ReactNode } from "react";

import { IconCheckCircle, IconCircleAlert } from "@/components/panel-icons";

function ModalBackdrop({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button
      type="button"
      className="absolute inset-0 bg-[radial-gradient(ellipse_85%_55%_at_50%_28%,rgba(11,20,26,0.38),rgba(11,20,26,0.78))] backdrop-blur-[3px] transition-opacity"
      aria-label={label}
      onClick={onClick}
    />
  );
}

function ModalChrome({
  variant,
  children,
}: {
  variant: "surface" | "caution";
  children: ReactNode;
}) {
  const outer =
    variant === "caution"
      ? "from-[var(--wa-card-bg)] via-amber-50/40 to-orange-100/45 dark:via-amber-900/25 dark:to-orange-950/35"
      : "from-[var(--wa-card-bg)] via-[#f4fdf7]/55 to-[#008069]/14 dark:via-[var(--wa-panel-hover)]/70 dark:to-[var(--wa-accent)]/18";
  const accent =
    variant === "caution"
      ? "from-transparent via-amber-400/35 to-transparent"
      : "from-transparent via-[#25D366]/45 to-transparent";

  return (
    <div className="relative z-10 w-full max-w-[440px]">
      <div
        className={`rounded-[1.35rem] bg-gradient-to-br ${outer} p-px shadow-[0_28px_56px_-18px_rgba(11,20,26,0.32)]`}
      >
        <div className="cfg-modal-panel panel-modal-glow relative overflow-hidden rounded-[1.3rem] border border-[var(--wa-border)] bg-[var(--wa-card-bg)]/95 p-6 backdrop-blur-xl sm:p-7">
          <div
            className={`pointer-events-none absolute inset-x-10 top-0 h-px rounded-full bg-gradient-to-r ${accent}`}
            aria-hidden
          />
          <div className="relative">{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Modal de resultado (éxito / error) tras guardar, importar o cargar ajustes. */
export function ConfiguracionResultModal({
  message,
  onClose,
}: {
  message: { type: "ok" | "err"; text: string } | null;
  onClose: () => void;
}) {
  const open = Boolean(message);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!message) return null;

  const ok = message.type === "ok";

  return (
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cfg-result-title"
      aria-describedby="cfg-result-desc"
    >
      <ModalBackdrop onClick={onClose} label="Cerrar" />
      <ModalChrome variant="surface">
        <div className="flex flex-col items-center text-center">
          <div
            className={[
              "mb-4 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl ring-[3px]",
              ok
                ? "bg-gradient-to-br from-[#e7fce3] via-[#d4f5e4] to-[#b8e8ce] text-[#008069] ring-[#25D366]/20 shadow-[0_8px_24px_-8px_rgba(0,128,105,0.35)]"
                : "bg-gradient-to-br from-red-50 via-rose-50 to-red-100/90 text-red-600 ring-red-200/50 shadow-[0_8px_24px_-8px_rgba(220,38,38,0.2)]",
            ].join(" ")}
          >
            {ok ? <IconCheckCircle className="h-8 w-8" /> : <IconCircleAlert className="h-8 w-8" />}
          </div>
          <h2 id="cfg-result-title" className="text-lg font-semibold tracking-tight text-[var(--wa-text)]">
            {ok ? "Listo" : "No se pudo completar"}
          </h2>
          <p
            id="cfg-result-desc"
            className="mt-2 max-h-[min(50vh,280px)] overflow-y-auto whitespace-pre-wrap text-left text-[14px] leading-relaxed text-[var(--wa-text-muted)] [overflow-wrap:anywhere]"
          >
            {message.text}
          </p>
        </div>
        <button
          type="button"
          className={[
            "mt-6 flex min-h-[2.75rem] w-full items-center justify-center rounded-xl px-4 text-[15px] font-semibold transition active:scale-[0.99] motion-reduce:transition-none motion-reduce:active:scale-100",
            ok
              ? "bg-[#25D366] text-white shadow-[0_4px_14px_-4px_rgba(37,211,102,0.55)] hover:bg-[#20bd5a]"
              : "border border-[var(--wa-border)] bg-[var(--wa-panel)] text-[var(--wa-text)] hover:bg-[var(--wa-panel-hover)]",
          ].join(" ")}
          onClick={onClose}
        >
          {ok ? "Entendido" : "Cerrar"}
        </button>
      </ModalChrome>
    </div>
  );
}

/** Confirmación antes de borrar credenciales del panel (sustituye a confirm()). */
export function ConfiguracionClearSecretsModal({
  open,
  saving,
  onCancel,
  onConfirm,
}: {
  open: boolean;
  saving: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onCancel();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onCancel]);

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-[240] flex items-end justify-center p-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:items-center sm:pb-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby="cfg-clear-title"
      aria-describedby="cfg-clear-desc"
    >
      <ModalBackdrop onClick={onCancel} label="Cancelar" />
      <ModalChrome variant="caution">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex h-[3.75rem] w-[3.75rem] items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 via-orange-50 to-amber-100/80 text-amber-700 ring-[3px] ring-amber-200/60 shadow-[0_8px_24px_-8px_rgba(217,119,6,0.25)]">
            <IconCircleAlert className="h-8 w-8" />
          </div>
          <h2 id="cfg-clear-title" className="text-lg font-semibold tracking-tight text-[var(--wa-text)]">
            ¿Borrar credenciales del panel?
          </h2>
          <p id="cfg-clear-desc" className="mt-2 text-[14px] leading-relaxed text-[var(--wa-text-muted)]">
            Se eliminarán de la base de datos el token de Twilio, las claves de los modelos (OpenAI / Gemini) y el JSON
            de la cuenta de servicio de Google Calendar guardados aquí. Si existen variables de entorno en la API, se
            usarán en su lugar.
          </p>
        </div>
        <div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
          <button
            type="button"
            disabled={saving}
            className="flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 text-[15px] font-semibold text-[var(--wa-text)] transition hover:bg-[var(--wa-panel-hover)] disabled:opacity-50 sm:flex-initial"
            onClick={onCancel}
          >
            Cancelar
          </button>
          <button
            type="button"
            disabled={saving}
            className="flex min-h-[2.75rem] flex-1 items-center justify-center rounded-xl bg-red-600 px-4 text-[15px] font-semibold text-white shadow-[0_4px_14px_-4px_rgba(220,38,38,0.45)] transition hover:bg-red-700 disabled:opacity-50 sm:flex-initial sm:min-w-[10rem]"
            onClick={onConfirm}
          >
            {saving ? "Borrando…" : "Sí, borrar"}
          </button>
        </div>
      </ModalChrome>
    </div>
  );
}
