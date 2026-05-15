type PydanticErr = {
  type?: string;
  loc?: unknown;
  msg?: string;
  input?: unknown;
};

function locToLabel(loc: unknown): string {
  if (!Array.isArray(loc)) return "";
  const tail = loc[loc.length - 1];
  if (tail === "phone_e164") return "Teléfono";
  if (tail === "code") return "Código";
  if (tail === "business_name") return "Nombre del negocio";
  return String(tail ?? "");
}

/** Convierte detalles tipo Pydantic en texto legible (español). */
export function formatApiErrorDetail(detail: unknown): string {
  if (typeof detail === "string") return detail;
  if (!Array.isArray(detail)) {
    try {
      return JSON.stringify(detail);
    } catch {
      return "Error desconocido";
    }
  }
  const parts = (detail as PydanticErr[]).map((item) => {
    const label = locToLabel(item.loc);
    const msg = typeof item.msg === "string" ? item.msg : JSON.stringify(item);
    if (item.type === "string_too_short" && label === "Teléfono") {
      return "El teléfono es demasiado corto. Incluye código de país (ej. +51999888777 o 9 dígitos móvil PE).";
    }
    if (item.type === "string_too_long" && label) {
      return `${label}: demasiado largo.`;
    }
    return label ? `${label}: ${msg}` : msg;
  });
  return parts.filter(Boolean).join("\n") || "No se pudo completar la solicitud.";
}

export async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return d;
    }
    return formatApiErrorDetail(d);
  } catch {
    /* texto plano */
  }
  return (t || "").trim().slice(0, 800) || `Error HTTP ${res.status}`;
}
