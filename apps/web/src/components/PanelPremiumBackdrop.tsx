"use client";

/**
 * Fondo panel: capas y viñeta según tokens CSS (claro / oscuro).
 */
export function PanelPremiumBackdrop() {
  return (
    <div
      className="pointer-events-none fixed inset-0 z-0 overflow-hidden"
      style={{ backgroundColor: "var(--wa-backdrop-base)" }}
      aria-hidden
    >
      <div
        className="absolute inset-0"
        style={{
          background: `linear-gradient(180deg, var(--wa-backdrop-top) 0%, var(--wa-backdrop-mid) 45%, var(--wa-backdrop-bottom) 100%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          opacity: "var(--wa-backdrop-grain-opacity)",
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='72' height='72' viewBox='0 0 72 72' xmlns='http://www.w3.org/2000/svg'%3E%3Ccircle cx='4' cy='4' r='1' fill='%23000' fill-opacity='0.04'/%3E%3C/svg%3E")`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 85% 55% at 50% 0%, var(--wa-backdrop-vignette), transparent 55%)`,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          background: `radial-gradient(ellipse 60% 45% at 85% 100%, var(--wa-backdrop-accent-glow), transparent 50%)`,
        }}
      />
    </div>
  );
}
