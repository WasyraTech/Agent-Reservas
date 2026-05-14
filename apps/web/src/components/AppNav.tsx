"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

import type { PanelUser } from "@/lib/server-api";

const items = [
  { href: "/chats", label: "Bandeja" },
  { href: "/citas", label: "Citas" },
  { href: "/estado", label: "Estado" },
  { href: "/configuracion", label: "Ajustes" },
] as const;

function isActive(pathname: string, href: string) {
  if (href === "/chats") return pathname === "/chats" || pathname.startsWith("/chats/");
  if (href === "/citas") return pathname === "/citas" || pathname.startsWith("/citas/");
  if (href === "/estado") return pathname === "/estado" || pathname.startsWith("/estado/");
  return pathname === href || pathname.startsWith(`${href}/`);
}

function LogoutButton() {
  const router = useRouter();
  return (
    <button
      type="button"
      className="rounded-lg px-2 py-1.5 text-[11px] font-medium uppercase tracking-wide text-[var(--wa-text-muted)] ring-1 ring-white/10 hover:bg-white/[0.06] hover:text-[var(--wa-text)] sm:normal-case sm:tracking-normal"
      onClick={async () => {
        await fetch("/api/internal/panel/auth/logout", { method: "POST" });
        router.push("/login");
        router.refresh();
      }}
    >
      Salir
    </button>
  );
}

export function AppNav({ panelUser }: { panelUser: PanelUser | null }) {
  const pathname = usePathname();
  const onLogin = pathname === "/login";
  const visible = onLogin
    ? []
    : items.filter((i) => panelUser?.role === "admin" || i.href !== "/configuracion");

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--wa-border)] bg-[var(--wa-bg-elevated)]/90 backdrop-blur-md">
      <div className="mx-auto flex max-w-[1600px] items-center gap-4 px-4 py-3 sm:px-6">
        <Link href="/chats" className="group flex shrink-0 items-center gap-3">
          <span
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--wa-accent)]/25 to-transparent text-xs font-bold uppercase tracking-widest text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-accent)]/30"
            aria-hidden
          >
            AR
          </span>
          <div className="hidden min-w-0 sm:block">
            <p className="truncate font-[family-name:var(--font-display)] text-sm font-semibold tracking-tight text-[var(--wa-text)]">
              Agent Reservas
            </p>
            <p className="text-[10px] font-medium uppercase tracking-[0.18em] text-[var(--wa-text-muted)]">
              Console
            </p>
          </div>
        </Link>
        {!onLogin ? (
          <nav className="flex flex-1 flex-wrap items-center justify-end gap-1 sm:justify-start">
            {visible.map(({ href, label }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  className={[
                    "rounded-lg px-3 py-2 text-xs font-medium uppercase tracking-wide transition sm:text-[13px] sm:normal-case sm:tracking-normal",
                    active
                      ? "bg-[var(--wa-accent)]/15 text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-accent)]/35"
                      : "text-[var(--wa-text-muted)] hover:bg-white/[0.04] hover:text-[var(--wa-text)]",
                  ].join(" ")}
                >
                  {label}
                </Link>
              );
            })}
          </nav>
        ) : (
          <div className="flex-1" />
        )}
        {panelUser && !onLogin ? (
          <div className="flex shrink-0 items-center gap-2">
            <span
              className="hidden max-w-[11rem] truncate text-xs text-[var(--wa-text-muted)] sm:inline"
              title={panelUser.phone_e164}
            >
              {panelUser.display_name?.trim() || panelUser.phone_e164}
            </span>
            <LogoutButton />
          </div>
        ) : null}
      </div>
    </header>
  );
}
