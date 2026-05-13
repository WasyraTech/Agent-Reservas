/**
 * Convierte entre JSON guardado en la API y estado amigable para formularios.
 * Formato compatible con `app/services/booking_config.py` (working_hours, services, etc.).
 */

export const WEEKDAY_ORDER = ["mon", "tue", "wed", "thu", "fri", "sat", "sun"] as const;
export type WeekdayKey = (typeof WEEKDAY_ORDER)[number];

export const WEEKDAY_LABELS: Record<WeekdayKey, string> = {
  mon: "Lunes",
  tue: "Martes",
  wed: "Miércoles",
  thu: "Jueves",
  fri: "Viernes",
  sat: "Sábado",
  sun: "Domingo",
};

export type DayScheduleRow = {
  key: WeekdayKey;
  open: boolean;
  amStart: string;
  amEnd: string;
  hasAfternoon: boolean;
  pmStart: string;
  pmEnd: string;
};

function isTime(s: string): boolean {
  return /^\d{2}:\d{2}$/.test(s.trim());
}

function intervalValid(start: string, end: string): boolean {
  if (!isTime(start) || !isTime(end)) return false;
  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  return sh * 60 + sm < eh * 60 + em;
}

function defaultDayRow(key: WeekdayKey): DayScheduleRow {
  return {
    key,
    open: key !== "sun",
    amStart: "09:00",
    amEnd: "13:00",
    hasAfternoon: key !== "sun" && key !== "sat",
    pmStart: "15:00",
    pmEnd: "19:00",
  };
}

export function parseWorkingHoursToRows(json: string): DayScheduleRow[] {
  let data: Record<string, unknown> | null = null;
  try {
    if (json?.trim()) data = JSON.parse(json) as Record<string, unknown>;
  } catch {
    data = null;
  }
  return WEEKDAY_ORDER.map((key) => {
    const base = defaultDayRow(key);
    if (!data || typeof data !== "object") return base;
    const raw = data[key];
    if (!Array.isArray(raw) || raw.length === 0) {
      return { ...base, open: false, hasAfternoon: false };
    }
    const ivs = raw
      .filter((x): x is { start: string; end: string } => {
        if (!x || typeof x !== "object") return false;
        const o = x as Record<string, unknown>;
        return typeof o.start === "string" && typeof o.end === "string";
      })
      .map((x) => ({ start: x.start.trim(), end: x.end.trim() }))
      .filter((x) => intervalValid(x.start, x.end));

    if (ivs.length === 0) return { ...base, open: false, hasAfternoon: false };
    const first = ivs[0]!;
    if (ivs.length === 1) {
      return {
        ...base,
        open: true,
        amStart: first.start,
        amEnd: first.end,
        hasAfternoon: false,
        pmStart: "15:00",
        pmEnd: "19:00",
      };
    }
    const second = ivs[1]!;
    return {
      ...base,
      open: true,
      amStart: first.start,
      amEnd: first.end,
      hasAfternoon: true,
      pmStart: second.start,
      pmEnd: second.end,
    };
  });
}

export function serializeWorkingHoursFromRows(rows: DayScheduleRow[]): string {
  const out: Record<string, { start: string; end: string }[]> = {};
  for (const d of rows) {
    if (!d.open) {
      out[d.key] = [];
      continue;
    }
    const parts: { start: string; end: string }[] = [];
    if (intervalValid(d.amStart, d.amEnd)) parts.push({ start: d.amStart.trim(), end: d.amEnd.trim() });
    if (d.hasAfternoon && intervalValid(d.pmStart, d.pmEnd)) {
      parts.push({ start: d.pmStart.trim(), end: d.pmEnd.trim() });
    }
    out[d.key] = parts;
  }
  return JSON.stringify(out, null, 2);
}

export function parseClosedDates(json: string): string[] {
  try {
    if (!json?.trim()) return [];
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return [];
    return v
      .map((x) => String(x).trim())
      .filter((s) => /^\d{4}-\d{2}-\d{2}$/.test(s))
      .sort();
  } catch {
    return [];
  }
}

export function serializeClosedDates(dates: string[]): string {
  const unique = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  return unique.length ? JSON.stringify(unique, null, 2) : "";
}

export type ServiceFormRow = {
  id: string;
  name: string;
  duration_minutes: number;
  price: string;
  description: string;
  requires_deposit: boolean;
  prep_instructions: string;
};

export function parseServicesToRows(json: string): ServiceFormRow[] {
  let arr: unknown[] = [];
  try {
    if (json?.trim()) {
      const v = JSON.parse(json);
      if (Array.isArray(v)) arr = v;
    }
  } catch {
    arr = [];
  }
  const mkId = () =>
    typeof crypto !== "undefined" && crypto.randomUUID
      ? crypto.randomUUID()
      : `svc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

  const rows: ServiceFormRow[] = [];
  for (const item of arr) {
    if (!item || typeof item !== "object") continue;
    const o = item as Record<string, unknown>;
    const name = String(o.name ?? "").trim();
    if (!name) continue;
    let dur = Number(o.duration_minutes);
    if (!Number.isFinite(dur)) dur = 30;
    dur = Math.min(480, Math.max(5, Math.round(dur)));
    rows.push({
      id: mkId(),
      name,
      duration_minutes: dur,
      price: String(o.price ?? "").trim(),
      description: String(o.description ?? "").trim(),
      requires_deposit: Boolean(o.requires_deposit),
      prep_instructions: String(o.prep_instructions ?? "").trim(),
    });
  }
  return rows;
}

export function serializeServicesFromRows(rows: ServiceFormRow[]): string {
  const payload = rows
    .filter((r) => r.name.trim())
    .map((r) => ({
      name: r.name.trim(),
      duration_minutes: r.duration_minutes,
      price: r.price.trim(),
      description: r.description.trim(),
      requires_deposit: r.requires_deposit,
      prep_instructions: r.prep_instructions.trim(),
    }));
  return payload.length ? JSON.stringify(payload, null, 2) : "";
}

export type WelcomeMenuSimple = {
  opt1Label: string;
  opt1Hint: string;
  opt2Label: string;
  opt2Hint: string;
};

export function parseWelcomeMenuSimple(json: string): WelcomeMenuSimple {
  const empty: WelcomeMenuSimple = {
    opt1Label: "",
    opt1Hint: "",
    opt2Label: "",
    opt2Hint: "",
  };
  try {
    if (!json?.trim()) return empty;
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return empty;
    const o1 = v[0];
    const o2 = v[1];
    const label1 =
      typeof o1 === "string"
        ? o1.trim()
        : o1 && typeof o1 === "object" && typeof (o1 as { label?: unknown }).label === "string"
          ? String((o1 as { label: string }).label).trim()
          : "";
    const hint1 =
      o1 && typeof o1 === "object" && typeof (o1 as { description?: unknown }).description === "string"
        ? String((o1 as { description: string }).description).trim()
        : "";
    const label2 =
      typeof o2 === "string"
        ? o2.trim()
        : o2 && typeof o2 === "object" && typeof (o2 as { label?: unknown }).label === "string"
          ? String((o2 as { label: string }).label).trim()
          : "";
    const hint2 =
      o2 && typeof o2 === "object" && typeof (o2 as { description?: unknown }).description === "string"
        ? String((o2 as { description: string }).description).trim()
        : "";
    return { opt1Label: label1, opt1Hint: hint1, opt2Label: label2, opt2Hint: hint2 };
  } catch {
    return empty;
  }
}

export function serializeWelcomeMenuSimple(m: WelcomeMenuSimple): string {
  const opts: { label: string; description?: string }[] = [];
  if (m.opt1Label.trim()) {
    const o: { label: string; description?: string } = { label: m.opt1Label.trim() };
    if (m.opt1Hint.trim()) o.description = m.opt1Hint.trim();
    opts.push(o);
  }
  if (m.opt2Label.trim()) {
    const o: { label: string; description?: string } = { label: m.opt2Label.trim() };
    if (m.opt2Hint.trim()) o.description = m.opt2Hint.trim();
    opts.push(o);
  }
  return opts.length ? JSON.stringify(opts, null, 2) : "";
}

/** Campos que el bot puede pedir (referencia en prompt). */
export const REQUIRED_FIELD_PRESETS: { key: string; label: string }[] = [
  { key: "full_name", label: "Nombre completo" },
  { key: "phone", label: "Teléfono de contacto" },
  { key: "id_document", label: "DNI o documento" },
  { key: "email", label: "Correo electrónico" },
  { key: "reason_for_visit", label: "Motivo de la visita" },
  { key: "first_time", label: "¿Primera vez en el local?" },
  { key: "birth_date", label: "Fecha de nacimiento" },
  { key: "insurance", label: "Seguro / convenio" },
];

export function parseRequiredFieldsKeys(json: string): Set<string> {
  try {
    if (!json?.trim()) return new Set();
    const v = JSON.parse(json) as unknown;
    if (!Array.isArray(v)) return new Set();
    return new Set(v.map((x) => String(x).trim()).filter(Boolean));
  } catch {
    return new Set();
  }
}

export function serializeRequiredFieldsKeys(keys: Set<string>): string {
  const ordered = REQUIRED_FIELD_PRESETS.map((p) => p.key).filter((k) => keys.has(k));
  const extras = [...keys].filter((k) => !REQUIRED_FIELD_PRESETS.some((p) => p.key === k));
  const all = [...ordered, ...extras.sort()];
  return all.length ? JSON.stringify(all, null, 2) : "";
}
