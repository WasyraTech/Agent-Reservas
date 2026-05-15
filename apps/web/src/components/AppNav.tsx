"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import {
  IconActivity,
  IconCalendar,
  IconHome,
  IconLogout,
  IconMessages,
  IconSettings,
} from "@/components/panel-icons";
import { ThemeCycleButton } from "@/components/ThemeRoot";
import type { PanelUser } from "@/lib/server-api";

const items = [
  { href: "/", label: "Inicio", Icon: IconHome },
  { href: "/chats", label: "Chats", Icon: IconMessages },
  { href: "/citas", label: "Citas", Icon: IconCalendar },
  { href: "/estado", label: "Estado", Icon: IconActivity },
  { href: "/configuracion", label: "Ajustes", Icon: IconSettings },
] as const;

export function isNavActive(pathname: string, href: string) {
  if (href === "/") return pathname === "/" || pathname === "";
  if (href === "/chats") return pathname === "/chats" || pathname.startsWith("/chats/");
  if (href === "/citas") return pathname === "/citas" || pathname.startsWith("/citas/");
  if (href === "/estado") return pathname === "/estado" || pathname.startsWith("/estado/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function userInitials(panelUser: PanelUser): string {
  const name = panelUser.display_name?.trim();
  if (name && name.length >= 2) {
    const parts = name.split(/\s+/).filter(Boolean);
    if (parts.length >= 2) return (parts[0]![0]! + parts[1]![0]!).toUpperCase();
    return name.slice(0, 2).toUpperCase();
  }
  const d = panelUser.phone_e164.replace(/\D/g, "");
  return d.slice(-2) || "AR";
}

function LogoutButton({ compact }: { compact?: boolean }) {
  const router = useRouter();
  return (
    <button
      type="button"
      title="Cerrar sesión"
      aria-label="Cerrar sesión"
      className={[
        "ar-focus-ring flex min-h-[44px] items-center justify-center gap-2 rounded-xl text-[var(--wa-text-muted)] transition-colors hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)] active:scale-[0.96]",
        compact ? "px-2" : "w-full justify-center px-2 lg:justify-start lg:px-2.5",
      ].join(" ")}
      onClick={async () => {
        await fetch("/api/internal/panel/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      <IconLogout className="h-[18px] w-[18px] shrink-0" />
      {compact ? (
        <span className="max-w-[4.5rem] truncate text-[12px] font-semibold text-[var(--wa-text)] sm:max-w-none">
          Salir
        </span>
      ) : (
        <>
          <span className="text-[12px] font-semibold text-[var(--wa-text)] lg:hidden">Salir</span>
          <span className="hidden text-[12px] font-semibold tracking-tight text-[var(--wa-text)] lg:inline">
            Cerrar sesión
          </span>
        </>
      )}
    </button>
  );
}

export function AppNav({ panelUser }: { panelUser: PanelUser | null }) {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/register";

  if (isAuth) {
    return null;
  }

  const visible = items.filter((i) => panelUser?.role === "admin" || i.href !== "/configuracion");

  return (
    <>
      {/* Escritorio: rail — iconos md; barra ancha + etiquetas lg (misma “personalidad” que el tab bar móvil) */}
      <aside className="fixed bottom-0 left-0 top-0 z-50 hidden w-[4.75rem] shrink-0 flex-col border-r border-[var(--wa-border)] bg-[var(--wa-header)]/95 pb-2 shadow-[6px_0_36px_-18px_rgba(11,20,26,0.14)] backdrop-blur-xl supports-[backdrop-filter]:bg-[var(--wa-header)]/88 md:flex md:pt-[max(0.5rem,env(safe-area-inset-top))] lg:w-56 lg:shadow-[10px_0_44px_-20px_rgba(11,20,26,0.16)] dark:shadow-[8px_0_48px_-16px_rgba(0,0,0,0.5)]">
        <div className="pointer-events-none absolute inset-y-0 right-0 w-px bg-gradient-to-b from-transparent via-[var(--wa-border)]/80 to-transparent" aria-hidden />

        <Link
          href="/"
          className="ar-focus-ring relative z-[1] mx-auto mt-2 flex h-11 min-h-[44px] w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-[#2fe077] to-[#159947] text-[10px] font-bold text-white shadow-[0_6px_20px_-6px_rgba(37,211,102,0.55)] ring-1 ring-white/30 transition-transform hover:brightness-105 hover:shadow-[0_8px_24px_-6px_rgba(37,211,102,0.5)] active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100 lg:mx-3 lg:h-auto lg:min-h-[48px] lg:w-auto lg:justify-start lg:gap-3 lg:px-3 lg:py-2.5"
        >
          <span className="leading-none">AR</span>
          <span className="hidden min-w-0 flex-1 truncate text-left text-[13px] font-semibold tracking-tight text-white lg:inline">
            Agent Reservas
          </span>
        </Link>

        <nav
          className="relative z-[1] mt-4 flex flex-1 flex-col gap-1 overflow-y-auto overflow-x-hidden px-2 pb-2 lg:mt-5 lg:gap-1.5 lg:px-3"
          aria-label="Principal"
        >
          {visible.map(({ href, label, Icon }) => {
            const active = isNavActive(pathname, href);
            return (
              <Link
                key={href}
                href={href}
                title={label}
                className={[
                  "ar-focus-ring group relative flex min-h-[48px] items-center justify-center rounded-2xl border border-transparent transition-all duration-200 ease-out md:w-12 md:shrink-0 lg:w-full lg:justify-start lg:gap-3 lg:rounded-xl lg:border-0 lg:px-2.5 lg:py-2.5",
                  active
                    ? "border-[var(--wa-nav-indicator)]/35 bg-[var(--wa-panel)] text-[var(--wa-text)] shadow-[0_4px_18px_-10px_rgba(37,211,102,0.4)] ring-1 ring-[var(--wa-nav-indicator)]/25 lg:border-transparent lg:bg-[var(--wa-panel-hover)] lg:shadow-[inset_0_0_0_1px_rgba(47,224,119,0.12)] lg:ring-0 lg:before:absolute lg:before:left-0 lg:before:top-1.5 lg:before:bottom-1.5 lg:before:w-[3px] lg:before:rounded-r-full lg:before:bg-[var(--wa-nav-indicator)] lg:before:content-['']"
                    : "text-[var(--wa-text-muted)] hover:border-[var(--wa-border)] hover:bg-[var(--wa-panel-hover)]/80 hover:text-[var(--wa-text)] lg:hover:border-transparent",
                ].join(" ")}
              >
                <Icon
                  className={[
                    "h-6 w-6 shrink-0 transition-colors duration-200 md:h-[22px] md:w-[22px] lg:mx-0 lg:h-[22px] lg:w-[22px]",
                    active
                      ? "text-[var(--wa-nav-indicator)] drop-shadow-[0_0_10px_rgba(47,224,119,0.35)]"
                      : "text-[var(--wa-text-muted)] group-hover:text-[var(--wa-text)]",
                  ].join(" ")}
                />
                <span
                  className={[
                    "hidden min-w-0 flex-1 truncate lg:inline",
                    active ? "text-[13px] font-semibold tracking-tight text-[var(--wa-text)]" : "text-[13px] font-medium text-[var(--wa-text)]",
                  ].join(" ")}
                >
                  {label}
                </span>
              </Link>
            );
          })}
        </nav>

        <div className="relative z-[1] mt-auto flex flex-col gap-2 border-t border-[var(--wa-border)]/90 bg-gradient-to-t from-[var(--wa-panel)]/35 to-transparent px-2 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-3 lg:gap-2.5 lg:rounded-t-2xl lg:px-3 lg:pt-3.5">
          <div className="flex w-full justify-center lg:justify-start">
            <ThemeCycleButton />
          </div>
          {panelUser ? (
            <>
              <div
                className="hidden max-w-full items-center gap-2.5 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)]/90 px-2.5 py-2 shadow-sm ring-1 ring-[var(--wa-border)]/40 backdrop-blur-sm lg:flex"
                title={panelUser.phone_e164}
              >
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[var(--wa-chip-bg)] to-[var(--wa-border)] text-[11px] font-bold text-[var(--wa-text)] ring-1 ring-[var(--wa-border)]/60">
                  {userInitials(panelUser)}
                </span>
                <span className="min-w-0 flex-1 truncate text-left text-[12px] font-semibold leading-snug text-[var(--wa-text)]">
                  {panelUser.display_name?.trim() || panelUser.phone_e164}
                </span>
              </div>
              <div className="flex w-full justify-center lg:block lg:w-full">
                <LogoutButton />
              </div>
            </>
          ) : (
            <div className="flex w-full justify-center">
              <LogoutButton />
            </div>
          )}
        </div>
      </aside>

      {/* Móvil: cabecera compacta */}
      <header className="sticky top-0 z-40 flex min-h-[3.25rem] shrink-0 items-center justify-between gap-2 border-b border-[var(--wa-border)] bg-[var(--wa-header)]/95 px-2 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--wa-header)]/88 sm:px-3 md:hidden">
        <Link href="/" className="ar-focus-ring flex min-h-[44px] min-w-0 flex-1 items-center gap-2 rounded-xl py-1.5 pl-1 pr-2">
          <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-[#2fe077] to-[#1faa52] text-[10px] font-bold text-white shadow-sm">
            AR
          </span>
          <span className="truncate text-[clamp(13px,3.5vw,15px)] font-semibold tracking-tight text-[var(--wa-text)]">
            Agent Reservas
          </span>
        </Link>
        <div className="flex min-w-0 shrink-0 items-center gap-1 sm:gap-1.5">
          <ThemeCycleButton showLabelAlways />
          <LogoutButton compact />
        </div>
      </header>

      {/* Móvil: barra inferior — área táctil ≥ 44px */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-50 flex border-t border-[var(--wa-border)] bg-[var(--wa-header)]/98 px-0.5 pb-[max(0.5rem,env(safe-area-inset-bottom))] pt-1.5 backdrop-blur-md supports-[backdrop-filter]:bg-[var(--wa-header)]/92 md:hidden"
        aria-label="Principal móvil"
      >
        {visible.map(({ href, label, Icon }) => {
          const active = isNavActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              className={[
                "ar-focus-ring flex min-h-[48px] min-w-0 flex-1 flex-col items-center justify-center gap-0.5 rounded-lg px-0.5 text-[10px] font-semibold transition-colors max-[360px]:text-[9px]",
                active ? "text-[var(--wa-accent-soft)]" : "text-[var(--wa-text-muted)]",
              ].join(" ")}
            >
              <Icon
                className={`h-6 w-6 shrink-0 sm:h-[26px] sm:w-[26px] ${active ? "text-[var(--wa-nav-indicator)]" : "text-[var(--wa-text-muted)]"}`}
              />
              <span className="max-w-full truncate leading-tight">{label}</span>
            </Link>
          );
        })}
      </nav>
    </>
  );
}
