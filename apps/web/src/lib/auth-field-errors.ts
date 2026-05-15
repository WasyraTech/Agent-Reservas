export type AuthFormStep = "phone" | "code" | "details" | "verify";

export type AuthFieldErrors = {
  phone?: string;
  code?: string;
  business?: string;
  general?: string;
};

function norm(s: string) {
  return s.toLowerCase();
}

/**
 * Asigna el texto de error del panel a un campo cuando el mensaje lo sugiere.
 * Si no hay coincidencia clara, va a `general`.
 */
export function mapAuthApiErrorToFields(
  detail: string,
  ctx: { flow: "login" | "register"; step: AuthFormStep },
): AuthFieldErrors {
  const t = norm(detail);
  const out: AuthFieldErrors = {};

  const codeHints =
    /\b(c[oó]digo|code|otp|verify|incorrect|invalid|expired|caduc|twilio|max\s*attempt|intent)\b/i.test(detail) ||
    t.includes("código") ||
    t.includes(" codigo") ||
    t.includes("otp");
  const phoneHints =
    /\b(e\.?164|phone|tel[eé]fono|n[uú]mero|whatsapp|format|invalid\s*phone)\b/i.test(detail) ||
    t.includes("teléfono") ||
    t.includes("telefono") ||
    t.includes("número") ||
    t.includes("numero");
  const businessHints =
    /\b(business|negocio|nombre|name|organization|empresa)\b/i.test(detail) ||
    t.includes("negocio") ||
    t.includes("nombre del");

  if (ctx.step === "code" || ctx.step === "verify") {
    if (codeHints) {
      out.code = detail;
      return out;
    }
    if (phoneHints) {
      out.phone = detail;
      return out;
    }
    if (ctx.flow === "register" && businessHints) {
      out.business = detail;
      return out;
    }
  }

  if (ctx.step === "phone" || ctx.step === "details") {
    if (phoneHints) {
      out.phone = detail;
      return out;
    }
    if (ctx.flow === "register" && businessHints) {
      out.business = detail;
      return out;
    }
  }

  out.general = detail;
  return out;
}
