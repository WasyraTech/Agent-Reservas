"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";

import { IconMoon, IconSun } from "@/components/panel-icons";

const STORAGE_KEY = "ar_theme_v1";

export type ThemeChoice = "light" | "dark";

type Ctx = {
  theme: ThemeChoice;
  setTheme: (t: ThemeChoice) => void;
  resolved: ThemeChoice;
};

const ThemeContext = createContext<Ctx | null>(null);

function normalizeStored(raw: string | null | undefined): ThemeChoice {
  const t = raw?.trim();
  if (t === "dark") return "dark";
  if (t === "light") return "light";
  /* "system" u otro valor antiguo → claro por defecto */
  return "light";
}

function applyDom(theme: ThemeChoice) {
  document.documentElement.setAttribute("data-ar-theme", theme);
  return theme;
}

export function ThemeRoot({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeChoice>("light");

  useEffect(() => {
    let initial: ThemeChoice = "light";
    try {
      initial = normalizeStored(window.localStorage.getItem(STORAGE_KEY));
    } catch {
      /* ignore */
    }
    setThemeState(initial);
    applyDom(initial);
    try {
      window.localStorage.setItem(STORAGE_KEY, initial);
    } catch {
      /* ignore */
    }
  }, []);

  useEffect(() => {
    applyDom(theme);
  }, [theme]);

  const setTheme = useCallback((t: ThemeChoice) => {
    setThemeState(t);
    try {
      window.localStorage.setItem(STORAGE_KEY, t);
    } catch {
      /* ignore */
    }
    applyDom(t);
  }, []);

  const value = useMemo(
    () => ({ theme, setTheme, resolved: theme }),
    [theme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useThemeChoice() {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error("useThemeChoice outside ThemeRoot");
  return ctx;
}

/** Alterna claro ↔ oscuro; muestra la etiqueta del tema actual al lado del icono. */
export function ThemeCycleButton({ showLabelAlways = false }: { showLabelAlways?: boolean }) {
  const { resolved, setTheme } = useThemeChoice();
  const label = resolved === "light" ? "Claro" : "Oscuro";
  const next = resolved === "light" ? "dark" : "light";

  return (
    <button
      type="button"
      title={`Tema ${label}. Clic para cambiar a ${next === "light" ? "claro" : "oscuro"}`}
      aria-label={`Tema ${label}. Cambiar a ${next === "light" ? "claro" : "oscuro"}`}
      className="ar-focus-ring flex min-h-[44px] items-center gap-2 rounded-xl px-2 text-[var(--wa-text-muted)] transition-colors hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)] active:scale-[0.98] lg:px-2.5"
      onClick={() => setTheme(next)}
    >
      {resolved === "dark" ? (
        <IconSun className="h-[18px] w-[18px] shrink-0 text-[var(--wa-nav-indicator)]" />
      ) : (
        <IconMoon className="h-[18px] w-[18px] shrink-0 text-[var(--wa-accent-soft)]" />
      )}
      <span
        className={[
          "text-[12px] font-semibold tracking-tight text-[var(--wa-text)]",
          showLabelAlways ? "" : "hidden lg:inline",
        ].join(" ")}
      >
        {label}
      </span>
    </button>
  );
}
