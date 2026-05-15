"use client";

import { useCallback, useEffect, useState } from "react";

import {
  type ServiceFormRow,
  parseServicesToRows,
  serializeServicesFromRows,
} from "./booking-form-utils";

import { inputClass, textareaClass } from "./configuracion-constants";

const mkId = () =>
  typeof crypto !== "undefined" && crypto.randomUUID
    ? crypto.randomUUID()
    : `svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

export function ServicesListEditor({
  servicesJson,
  onServicesJson,
}: {
  servicesJson: string;
  onServicesJson: (v: string) => void;
}) {
  const [rows, setRows] = useState<ServiceFormRow[]>(() => parseServicesToRows(servicesJson));

  useEffect(() => {
    setRows(parseServicesToRows(servicesJson));
  }, [servicesJson]);

  const commit = useCallback(
    (next: ServiceFormRow[]) => {
      setRows(next);
      onServicesJson(serializeServicesFromRows(next));
    },
    [onServicesJson],
  );

  const addRow = () => {
    commit([
      ...rows,
      {
        id: mkId(),
        name: "",
        duration_minutes: 30,
        price: "",
        description: "",
        requires_deposit: false,
        prep_instructions: "",
      },
    ]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-xs text-[var(--wa-text-muted)]">
          Cada servicio con duración aproximada. El bot lo usará al agendar.
        </p>
        <button
          type="button"
          onClick={addRow}
          className="shrink-0 rounded-full border border-violet-400/40 bg-violet-500/20 px-4 py-2 text-xs font-bold text-violet-100 transition hover:bg-violet-500/30"
        >
          + Añadir servicio
        </button>
      </div>

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-white/15 bg-black/20 px-6 py-10 text-center">
          <p className="text-sm text-[var(--wa-text-muted)]">
            Aún no hay servicios. Pulsa «Añadir servicio» o importa una hoja en la sección de abajo.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {rows.map((r, idx) => (
            <div
              key={r.id}
              className="relative overflow-hidden rounded-lg border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 shadow-sm ring-1 ring-black/[0.03]"
            >
              <div className="absolute left-0 top-0 h-full w-1 rounded-l-lg bg-[#25D366]" />
              <div className="pl-3">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className="text-[10px] font-bold uppercase tracking-widest text-[var(--wa-text-muted)]">
                    Servicio {idx + 1}
                  </span>
                  <button
                    type="button"
                    onClick={() => commit(rows.filter((x) => x.id !== r.id))}
                    className="text-xs font-medium text-red-300/90 hover:text-red-200"
                  >
                    Eliminar
                  </button>
                </div>
                <div className="grid gap-3 sm:grid-cols-12">
                  <label className="sm:col-span-5">
                    <span className="text-[11px] text-[var(--wa-text-muted)]">Nombre</span>
                    <input
                      className={inputClass}
                      value={r.name}
                      onChange={(e) =>
                        commit(rows.map((x) => (x.id === r.id ? { ...x, name: e.target.value } : x)))
                      }
                      placeholder="Ej. Limpieza dental"
                    />
                  </label>
                  <label className="sm:col-span-2">
                    <span className="text-[11px] text-[var(--wa-text-muted)]">Duración (min)</span>
                    <input
                      type="number"
                      min={5}
                      max={480}
                      className={inputClass}
                      value={r.duration_minutes}
                      onChange={(e) => {
                        const n = Number.parseInt(e.target.value, 10);
                        commit(
                          rows.map((x) =>
                            x.id === r.id
                              ? {
                                  ...x,
                                  duration_minutes: Number.isFinite(n)
                                    ? Math.min(480, Math.max(5, n))
                                    : 30,
                                }
                              : x,
                          ),
                        );
                      }}
                    />
                  </label>
                  <label className="sm:col-span-3">
                    <span className="text-[11px] text-[var(--wa-text-muted)]">Precio</span>
                    <input
                      className={inputClass}
                      value={r.price}
                      onChange={(e) =>
                        commit(rows.map((x) => (x.id === r.id ? { ...x, price: e.target.value } : x)))
                      }
                      placeholder="S/ 80"
                    />
                  </label>
                  <label className="flex items-end sm:col-span-2">
                    <span className="flex w-full cursor-pointer items-center gap-2 rounded-lg border border-white/10 bg-black/25 px-3 py-2.5 text-xs text-[var(--wa-text)]">
                      <input
                        type="checkbox"
                        checked={r.requires_deposit}
                        onChange={(e) =>
                          commit(
                            rows.map((x) =>
                              x.id === r.id ? { ...x, requires_deposit: e.target.checked } : x,
                            ),
                          )
                        }
                        className="h-4 w-4 accent-[var(--wa-accent)]"
                      />
                      Depósito
                    </span>
                  </label>
                  <label className="sm:col-span-12">
                    <span className="text-[11px] text-[var(--wa-text-muted)]">Descripción (opcional)</span>
                    <input
                      className={inputClass}
                      value={r.description}
                      onChange={(e) =>
                        commit(rows.map((x) => (x.id === r.id ? { ...x, description: e.target.value } : x)))
                      }
                      placeholder="Qué incluye la sesión"
                    />
                  </label>
                  <label className="sm:col-span-12">
                    <span className="text-[11px] text-[var(--wa-text-muted)]">
                      Indicaciones al cliente (opcional)
                    </span>
                    <textarea
                      className={`${textareaClass} min-h-[72px]`}
                      rows={2}
                      value={r.prep_instructions}
                      onChange={(e) =>
                        commit(
                          rows.map((x) => (x.id === r.id ? { ...x, prep_instructions: e.target.value } : x)),
                        )
                      }
                      placeholder="Ej. Llegar 10 min antes…"
                    />
                  </label>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
