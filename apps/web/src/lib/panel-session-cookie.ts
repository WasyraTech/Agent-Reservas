/** Duración de la cookie `ar_panel_session` según preferencia del usuario. */
export const PANEL_SESSION_MAX_AGE = {
  /** Sesión habitual en este dispositivo */
  standardSec: 60 * 60 * 24 * 7,
  /** “Mantener sesión conectada” */
  extendedSec: 60 * 60 * 24 * 60,
} as const;

export function panelSessionMaxAgeSec(rememberMe: boolean): number {
  return rememberMe ? PANEL_SESSION_MAX_AGE.extendedSec : PANEL_SESSION_MAX_AGE.standardSec;
}
