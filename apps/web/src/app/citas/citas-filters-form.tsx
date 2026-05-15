"use client";

import Link from "next/link";
import { useState } from "react";

import { IconTune } from "@/components/panel-icons";

export function CitasFiltersForm({
  defaultStatus,
  defaultDateFrom,
  defaultDateTo,
  hasFilters,
  serverDateRangeInvalid,
}: {
  defaultStatus: string;
  defaultDateFrom: string;
  defaultDateTo: string;
  hasFilters: boolean;
  serverDateRangeInvalid: boolean;
}) {
  const [clientError, setClientError] = useState<string | null>(null);

  return (
    <div className="rounded-2xl bg-gradient-to-br from-[var(--wa-accent)]/18 via-[var(--wa-card-bg)] to-[var(--wa-accent-soft)]/14 p-px shadow-[0_12px_40px_-20px_rgba(11,20,26,0.18)] dark:shadow-[0_12px_40px_-24px_rgba(0,0,0,0.5)]">
      <div className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 backdrop-blur-sm sm:p-5">
        <div className="mb-4 flex items-center gap-2 border-b border-[var(--wa-border)] pb-3">
          <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-[var(--wa-ok-banner-bg)] text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-border)]">
            <IconTune className="h-4 w-4" />
          </span>
          <div>
            <p className="text-[13px] font-semibold text-[var(--wa-text)]">Filtrar agenda</p>
            <p className="text-[12px] text-[var(--wa-text-muted)]">Estado y rango de fechas de inicio</p>
          </div>
        </div>
        {(serverDateRangeInvalid || clientError) && (
          <p
            className="mb-3 rounded-lg border border-red-200/90 bg-red-50/95 px-3 py-2 text-sm text-red-900 dark:border-red-800/60 dark:bg-red-950/40 dark:text-red-100"
            role="alert"
          >
            {clientError ??
              "La fecha «Desde (inicio)» no puede ser posterior a «Hasta (inicio)». Corrige el rango y vuelve a aplicar."}
          </p>
        )}
        <form
          method="get"
          className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end"
          onSubmit={(e) => {
            const form = e.currentTarget;
            const fd = new FormData(form);
            const a = (fd.get("date_from") as string | null)?.trim() ?? "";
            const b = (fd.get("date_to") as string | null)?.trim() ?? "";
            if (a && b && a > b) {
              e.preventDefault();
              setClientError("«Desde» no puede ser posterior a «Hasta».");
              return;
            }
            setClientError(null);
          }}
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Estado</label>
            <select name="status" defaultValue={defaultStatus} className="wa-input px-3 py-2 text-sm">
              <option value="">Todos</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending_confirmation">Pend. confirmación</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Desde (inicio)</label>
            <input type="date" name="date_from" defaultValue={defaultDateFrom} className="wa-input px-3 py-2 text-sm" />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Hasta (inicio)</label>
            <input type="date" name="date_to" defaultValue={defaultDateTo} className="wa-input px-3 py-2 text-sm" />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="ar-focus-ring rounded-xl bg-[#25D366] px-5 py-2 text-sm font-semibold text-white shadow-[0_4px_12px_-4px_rgba(37,211,102,0.5)] transition hover:bg-[#20bd5a] active:scale-[0.99] motion-reduce:active:scale-100"
            >
              Aplicar
            </button>
            {hasFilters ? (
              <Link
                href="/citas"
                className="ar-focus-ring inline-flex items-center justify-center rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 py-2 text-sm font-semibold text-[var(--wa-text)] transition hover:bg-[var(--wa-panel-hover)]"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>
      </div>
    </div>
  );
}
