export const inputClass =
  "wa-input mt-1 w-full rounded-lg px-3 py-2.5 text-sm shadow-sm placeholder:text-[var(--wa-text-muted)] focus:ring-2 focus:ring-[#25D366]/25";

export const textareaClass = `${inputClass} min-h-[120px] resize-y leading-relaxed`;

/** Texto unificado bajo campos secretos del panel (no se muestra lo guardado; vacío = no cambiar). */
export const SECRET_PANEL_FIELD_NOTE =
  "El valor guardado no se muestra en pantalla. Deja el campo vacío para no cambiarlo; solo se envía al pulsar «Guardar configuración».";

/** IDs válidos para la API Gemini (Developer); elige según cuotas en Google AI Studio. */
export const GEMINI_MODEL_PRESETS: { value: string; label: string }[] = [
  { value: "gemini-2.5-flash", label: "Gemini 2.5 Flash (recomendado, plan gratuito típico)" },
  { value: "gemini-2.5-flash-lite", label: "Gemini 2.5 Flash Lite" },
  { value: "gemini-flash-latest", label: "Gemini Flash (última versión estable)" },
  { value: "gemini-2.0-flash", label: "Gemini 2.0 Flash" },
  { value: "gemini-2.5-pro", label: "Gemini 2.5 Pro (más capacidad, cuotas distintas)" },
];

export const GEMINI_MODEL_CUSTOM = "__custom__";

export function geminiModelSelectValue(model: string): string {
  return GEMINI_MODEL_PRESETS.some((p) => p.value === model) ? model : GEMINI_MODEL_CUSTOM;
}
