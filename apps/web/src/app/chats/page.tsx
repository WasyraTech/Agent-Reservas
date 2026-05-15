import Link from "next/link";

import { PanelGlassCard } from "@/components/PanelGlassCard";
import { IconChevronRight, IconHome, IconMessages } from "@/components/panel-icons";

export default function ChatsIndexPage() {
  return (
    <div className="wa-chat-canvas flex flex-1 flex-col items-center justify-center px-4 py-14 sm:px-8">
      <PanelGlassCard className="max-w-md text-center" elevated>
        <div className="mx-auto mb-5 flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-[#e7fce3] to-[#c8efd4] text-[#008069] shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] ring-1 ring-[#b9e6c9]">
          <IconMessages className="h-9 w-9" />
        </div>
        <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-[var(--wa-accent-soft)]">Chats</p>
        <h1 className="mt-2 text-[1.35rem] font-semibold tracking-tight text-[var(--wa-text)]">Elige una conversación</h1>
        <p className="mt-3 text-[15px] leading-relaxed text-[var(--wa-text-muted)]">
          La lista está a la izquierda. Este espacio se usa cuando aún no has abierto ningún chat: mantén el contexto
          claro y vuelve cuando quieras.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            href="/"
            className="ar-focus-ring inline-flex items-center gap-2 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 py-2.5 text-sm font-semibold text-[var(--wa-text)] transition hover:bg-[var(--wa-panel-hover)]"
          >
            <IconHome className="h-4 w-4" aria-hidden />
            Inicio
          </Link>
          <Link
            href="/citas"
            className="ar-focus-ring inline-flex items-center gap-2 rounded-xl bg-[var(--wa-accent)] px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:brightness-110"
          >
            Ver citas
          </Link>
        </div>
        <p className="mt-8 inline-flex items-center gap-2 text-[13px] font-medium text-[var(--wa-text-muted)]">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-3 py-1.5">
            Tip
            <IconChevronRight className="h-3.5 w-3.5 text-[var(--wa-text-muted)]" />
          </span>
          Usa la búsqueda redondeada para saltar entre números
        </p>
      </PanelGlassCard>
    </div>
  );
}
