"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type DayScheduleRow,
  WEEKDAY_LABELS,
  parseWorkingHoursToRows,
  serializeWorkingHoursFromRows,
} from "./booking-form-utils";

const timeInputClass =
  "rounded-lg border border-white/10 bg-black/35 px-2 py-2 text-sm text-[var(--wa-text)] tabular-nums " +
  "focus:border-[var(--wa-accent)] focus:outline-none focus:ring-1 focus:ring-[var(--wa-accent)]";

function patchRow(rows: DayScheduleRow[], key: DayScheduleRow["key"], patch: Partial<DayScheduleRow>): DayScheduleRow[] {
  return rows.map((r) => (r.key === key ? { ...r, ...patch } : r));
}

export function ScheduleWeekEditor({
  workingHoursJson,
  onWorkingHoursJson,
}: {
  workingHoursJson: string;
  onWorkingHoursJson: (v: string) => void;
}) {
  const [rows, setRows] = useState<DayScheduleRow[]>(() => parseWorkingHoursToRows(workingHoursJson));

  useEffect(() => {
    setRows(parseWorkingHoursToRows(workingHoursJson));
  }, [workingHoursJson]);

  const commit = useCallback(
    (next: DayScheduleRow[]) => {
      setRows(next);
      onWorkingHoursJson(serializeWorkingHoursFromRows(next));
    },
    [onWorkingHoursJson],
  );

  const applyPresetWeekday = () => {
    const template = rows.find((r) => r.key === "mon") ?? rows[0]!;
    const next = rows.map((r) =>
      ["mon", "tue", "wed", "thu", "fri"].includes(r.key) ? { ...template, key: r.key } : r,
    );
    commit(next);
  };

  const applyPresetWeekend = () => {
    const next = rows.map((r) => {
      if (r.key === "sat")
        return {
          ...r,
          open: true,
          amStart: "09:00",
          amEnd: "13:00",
          hasAfternoon: false,
          pmStart: "15:00",
          pmEnd: "19:00",
        };
      if (r.key === "sun") return { ...r, open: false, hasAfternoon: false };
      return r;
    });
    commit(next);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={applyPresetWeekday}
          className="rounded-full border border-[var(--wa-accent)]/40 bg-[var(--wa-accent)]/15 px-3 py-1.5 text-xs font-semibold text-[var(--wa-accent-soft)] transition hover:bg-[var(--wa-accent)]/25"
        >
          Lun–Vie como el lunes
        </button>
        <button
          type="button"
          onClick={applyPresetWeekend}
          className="rounded-full border border-[var(--wa-border)] bg-[var(--wa-panel)] px-3 py-1.5 text-xs font-semibold text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)]"
        >
          Sáb solo mañana · Dom cerrado
        </button>
      </div>

      <div className="overflow-x-auto rounded-lg border border-[var(--wa-border)] bg-[var(--wa-card-bg)] shadow-sm">
        <table className="w-full min-w-[640px] border-collapse text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--wa-border)] text-[11px] uppercase tracking-wide text-[var(--wa-text-muted)]">
              <th className="px-3 py-3 pl-4 font-medium">Día</th>
              <th className="px-2 py-3 font-medium">Abierto</th>
              <th className="px-2 py-3 font-medium">Mañana</th>
              <th className="px-2 py-3 font-medium">Tarde</th>
              <th className="px-3 py-3 pr-4 font-medium">Horario tarde</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((d) => (
              <tr
                key={d.key}
                className="border-b border-[var(--wa-border)] transition hover:bg-[var(--wa-panel-hover)] last:border-0"
              >
                <td className="px-3 py-2.5 pl-4 font-medium text-[var(--wa-text)]">{WEEKDAY_LABELS[d.key]}</td>
                <td className="px-2 py-2.5">
                  <button
                    type="button"
                    role="switch"
                    aria-checked={d.open}
                    onClick={() => commit(patchRow(rows, d.key, { open: !d.open }))}
                    className={[
                      "relative h-7 w-12 rounded-full transition-colors",
                      d.open ? "bg-[var(--wa-accent)]" : "bg-[var(--wa-border)]",
                    ].join(" ")}
                  >
                    <span
                      className={[
                        "absolute top-0.5 h-6 w-6 rounded-full bg-[var(--wa-card-bg)] shadow transition-transform",
                        d.open ? "left-5" : "left-0.5",
                      ].join(" ")}
                    />
                  </button>
                </td>
                <td className="px-2 py-2.5">
                  {d.open ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        className={timeInputClass}
                        value={d.amStart}
                        onChange={(e) => commit(patchRow(rows, d.key, { amStart: e.target.value }))}
                      />
                      <span className="text-[var(--wa-text-muted)]">→</span>
                      <input
                        type="time"
                        className={timeInputClass}
                        value={d.amEnd}
                        onChange={(e) => commit(patchRow(rows, d.key, { amEnd: e.target.value }))}
                      />
                    </div>
                  ) : (
                    <span className="text-xs text-[var(--wa-text-muted)]">Cerrado</span>
                  )}
                </td>
                <td className="px-2 py-2.5">
                  {d.open ? (
                    <label className="flex cursor-pointer items-center gap-2 text-xs text-[var(--wa-text-muted)]">
                      <input
                        type="checkbox"
                        checked={d.hasAfternoon}
                        onChange={(e) =>
                          commit(patchRow(rows, d.key, { hasAfternoon: e.target.checked }))
                        }
                        className="h-4 w-4 rounded border-white/20 bg-black/40 accent-[var(--wa-accent)]"
                      />
                      <span>2º turno</span>
                    </label>
                  ) : null}
                </td>
                <td className="px-3 py-2.5 pr-4">
                  {d.open && d.hasAfternoon ? (
                    <div className="flex items-center gap-1.5">
                      <input
                        type="time"
                        className={timeInputClass}
                        value={d.pmStart}
                        onChange={(e) => commit(patchRow(rows, d.key, { pmStart: e.target.value }))}
                      />
                      <span className="text-[var(--wa-text-muted)]">→</span>
                      <input
                        type="time"
                        className={timeInputClass}
                        value={d.pmEnd}
                        onChange={(e) => commit(patchRow(rows, d.key, { pmEnd: e.target.value }))}
                      />
                    </div>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-[11px] leading-relaxed text-[var(--wa-text-muted)]">
        Activa «2º turno» para horario partido (ej. cierre al mediodía). El bot usa estos datos en el prompt.
      </p>
    </div>
  );
}
