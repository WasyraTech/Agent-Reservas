"use client";

import { useCallback, useEffect, useState } from "react";

import {
  REQUIRED_FIELD_PRESETS,
  parseRequiredFieldsKeys,
  serializeRequiredFieldsKeys,
} from "./booking-form-utils";

export function RequiredFieldsEditor({
  appointmentRequiredFieldsJson,
  onAppointmentRequiredFieldsJson,
}: {
  appointmentRequiredFieldsJson: string;
  onAppointmentRequiredFieldsJson: (v: string) => void;
}) {
  const [keys, setKeys] = useState<Set<string>>(() => parseRequiredFieldsKeys(appointmentRequiredFieldsJson));

  useEffect(() => {
    setKeys(parseRequiredFieldsKeys(appointmentRequiredFieldsJson));
  }, [appointmentRequiredFieldsJson]);

  const toggle = useCallback(
    (k: string) => {
      const next = new Set(keys);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      setKeys(next);
      onAppointmentRequiredFieldsJson(serializeRequiredFieldsKeys(next));
    },
    [keys, onAppointmentRequiredFieldsJson],
  );

  return (
    <div className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-strip-bg)] p-4">
      <p className="text-xs text-[var(--wa-text-muted)]">
        Marca lo que el bot debe intentar recoger antes de confirmar la cita.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        {REQUIRED_FIELD_PRESETS.map((p) => (
          <label
            key={p.key}
            className="flex cursor-pointer items-center gap-3 rounded-xl border border-white/10 bg-black/25 px-3 py-2.5 text-sm transition hover:border-[var(--wa-accent)]/40"
          >
            <input
              type="checkbox"
              checked={keys.has(p.key)}
              onChange={() => toggle(p.key)}
              className="h-4 w-4 shrink-0 accent-[var(--wa-accent)]"
            />
            <span className="text-[var(--wa-text)]">{p.label}</span>
          </label>
        ))}
      </div>
    </div>
  );
}
