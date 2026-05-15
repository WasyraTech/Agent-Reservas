/** Título de fila / cabecera: quita prefijo whatsapp: y muestra dígitos legibles. */
export function waChatTitle(from: string): string {
  const t = from.replace(/^whatsapp:/i, "").trim();
  const digits = t.replace(/\D/g, "");
  if (digits.length >= 8) {
    return `+${digits}`;
  }
  return t || "—";
}

/** Etiqueta corta para avatar (último dígito o letra). */
export function waAvatarGlyph(from: string): string {
  const digits = from.replace(/\D/g, "");
  if (digits) return digits.slice(-1);
  const alnum = from.replace(/[^a-zA-Z0-9]/g, "");
  return alnum.slice(-1).toUpperCase() || "?";
}

/** Color de avatar estable a partir del identificador. */
export function waAvatarHue(from: string): number {
  let h = 0;
  for (let i = 0; i < from.length; i += 1) {
    h = (h + from.charCodeAt(i) * 13) % 360;
  }
  return h;
}

/** Título legible: quita prefijo whatsapp: y acorta. */
export function waMeChatUrl(from: string, prefilledText?: string): string {
  const digits = from.replace(/\D/g, "");
  if (!digits) return "https://wa.me/";
  const base = `https://wa.me/${digits}`;
  const t = prefilledText?.trim();
  return t ? `${base}?text=${encodeURIComponent(t)}` : base;
}
