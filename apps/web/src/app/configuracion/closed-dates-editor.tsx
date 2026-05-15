"use client";

import { useEffect, useState } from "react";

import { parseClosedDates, serializeClosedDates } from "./booking-form-utils";

export function ClosedDatesEditor({
  closedDatesJson,
  onClosedDatesJson,
}: {
  closedDatesJson: string;
  onClosedDatesJson: (v: string) => void;
}) {
  const [dates, setDates] = useState<string[]>(() => parseClosedDates(closedDatesJson));
  const [draft, setDraft] = useState("");

  useEffect(() => {
    setDates(parseClosedDates(closedDatesJson));
  }, [closedDatesJson]);

  const push = () => {
    const t = draft.trim();
    if (!/^\d{4}-\d{2}-\d{2}$/.test(t)) return;
    if (dates.includes(t)) {
      setDraft("");
      return;
    }
    const next = [...dates, t].sort();
    setDates(next);
    setDraft("");
    onClosedDatesJson(serializeClosedDates(next));
  };

  const remove = (d: string) => {
    const next = dates.filter((x) => x !== d);
    setDates(next);
    onClosedDatesJson(serializeClosedDates(next));
  };

  return (
    <div className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-strip-bg)] p-4">
      <p className="text-xs font-medium text-[var(--wa-text-muted)]">Días cerrados (feriados, vacaciones)</p>
      <div className="mt-3 flex flex-wrap items-end gap-2">
        <label className="min-w-[160px] flex-1 text-sm">
          <span className="sr-only">Fecha</span>
          <input
            type="date"
            className="w-full rounded-xl border border-white/10 bg-black/35 px-3 py-2.5 text-sm text-[var(--wa-text)] focus:border-[var(--wa-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-accent)]"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
          />
        </label>
        <button
          type="button"
          onClick={push}
          className="rounded-xl bg-[var(--wa-accent)] px-4 py-2.5 text-sm font-semibold text-[#041016] shadow-lg shadow-[var(--wa-accent)]/20 transition hover:brightness-110"
        >
          Añadir fecha
        </button>
      </div>
      {dates.length ? (
        <ul className="mt-4 flex flex-wrap gap-2">
          {dates.map((d) => (
            <li
              key={d}
              className="group flex items-center gap-2 rounded-full border border-white/10 bg-black/30 py-1 pl-3 pr-1 text-sm text-[var(--wa-text)]"
            >
              <time dateTime={d} className="tabular-nums">
                {d}
              </time>
              <button
                type="button"
                onClick={() => remove(d)}
                className="flex h-7 w-7 items-center justify-center rounded-full text-[var(--wa-text-muted)] transition hover:bg-red-500/20 hover:text-red-300"
                aria-label={`Quitar ${d}`}
              >
                ×
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-xs text-[var(--wa-text-muted)]">Ninguna fecha extra cerrada (opcional).</p>
      )}
    </div>
  );
}
