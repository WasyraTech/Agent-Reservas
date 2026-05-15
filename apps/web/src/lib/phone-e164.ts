/**
 * Alineado con `apps/api/app/services/phone_e164.normalize_e164` para que el panel
 * envíe el mismo E.164 que validará el backend.
 */
export function normalizePanelPhoneE164(raw: string): string {
  let s = (raw ?? "").trim().replace(/\s/g, "").replace(/-/g, "");
  if (!s.startsWith("+")) {
    const digits = s.replace(/\D/g, "");
    if (!digits) {
      throw new Error(
        "Indica un número válido (con o sin +, ej. +51999888777 o 999888777).",
      );
    }
    if (digits.length === 9 && digits[0] === "9") {
      s = `+51${digits}`;
    } else if (digits.length >= 10 && digits.length <= 15) {
      s = `+${digits}`;
    } else {
      throw new Error(
        "Número incompleto o no reconocido. Usa código de país (ej. +51999888777) o 9 dígitos de móvil peruano (9…).",
      );
    }
  }
  const rest = s.slice(1);
  if (!/^\d+$/.test(rest) || rest.length < 8 || rest.length > 18) {
    throw new Error("Número de teléfono inválido (revisa el código de país y los dígitos).");
  }
  return s;
}
