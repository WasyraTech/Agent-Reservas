/** Clave compartida con `(auth)/template.tsx`: solo debe persistir entre navegaciones dentro de /login ↔ /register. */
export const AUTH_ROUTE_TRANSITION_KEY = "ar-auth-prev-path";

export function clearAuthRouteTransitionMarker(): void {
  if (typeof window === "undefined") return;
  try {
    sessionStorage.removeItem(AUTH_ROUTE_TRANSITION_KEY);
  } catch {
    /* ignore */
  }
}
