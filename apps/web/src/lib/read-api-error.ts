export async function readApiError(res: Response): Promise<string> {
  const t = await res.text();
  try {
    const j = JSON.parse(t) as { detail?: unknown };
    const d = j.detail;
    if (typeof d === "string") {
      return d;
    }
    if (Array.isArray(d)) {
      return JSON.stringify(d);
    }
  } catch {
    /* texto plano */
  }
  return (t || "").trim().slice(0, 800) || `Error HTTP ${res.status}`;
}
