"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { usePanelToast } from "@/components/PanelToast";
import { IconCopy, IconMessages, IconCalendar } from "@/components/panel-icons";
import { waChatTitle, waMeChatUrl } from "@/lib/wa-display";

function digitsForWaMe(from: string) {
  return from.replace(/\D/g, "");
}

export function ChatConversationToolbar({
  conversationId,
  twilioFrom,
}: {
  conversationId: string;
  twilioFrom: string;
}) {
  const toast = usePanelToast();
  const [draft, setDraft] = useState("");
  const title = waChatTitle(twilioFrom);
  const waOpen = useMemo(() => waMeChatUrl(twilioFrom, draft || undefined), [twilioFrom, draft]);

  async function copyPhone() {
    const d = digitsForWaMe(twilioFrom);
    const text = d || twilioFrom;
    try {
      await navigator.clipboard.writeText(text);
      toast("Teléfono copiado");
    } catch {
      toast("No se pudo copiar");
    }
  }

  return (
    <div className="flex shrink-0 flex-col gap-2 border-b border-[var(--wa-border)] bg-[var(--wa-strip-bg)]/95 px-3 py-2 backdrop-blur-sm sm:flex-row sm:flex-wrap sm:items-center sm:gap-2 sm:px-4">
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={() => void copyPhone()}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--wa-text-muted)] shadow-sm transition hover:border-[#25D366]/35 hover:text-[var(--wa-text)]"
        >
          <IconCopy className="h-3.5 w-3.5 text-[var(--wa-accent-soft)]" />
          Copiar número
        </button>
        <a
          href={waMeChatUrl(twilioFrom)}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1.5 rounded-full bg-[#25D366] px-3 py-1.5 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#20bd5a]"
        >
          Abrir WhatsApp
        </a>
        <Link
          href="/citas"
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--wa-accent-soft)] shadow-sm transition hover:bg-[var(--wa-panel-hover)]"
        >
          <IconCalendar className="h-3.5 w-3.5" />
          Citas
        </Link>
        <Link
          href="/chats"
          scroll={false}
          className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-1.5 text-[12px] font-semibold text-[var(--wa-text-muted)] shadow-sm transition hover:bg-[var(--wa-panel-hover)] md:hidden"
        >
          <IconMessages className="h-3.5 w-3.5" />
          Lista
        </Link>
      </div>
      <div className="flex min-w-0 flex-1 flex-col gap-1.5 sm:max-w-md sm:flex-row sm:items-end">
        <label className="sr-only" htmlFor={`wa-draft-${conversationId}`}>
          Texto para enviar por WhatsApp
        </label>
        <textarea
          id={`wa-draft-${conversationId}`}
          rows={1}
          placeholder="Escribe un mensaje…"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          className="min-h-[2.5rem] w-full resize-none rounded-xl border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-2 text-[13px] text-[var(--wa-text)] shadow-inner outline-none placeholder:text-[var(--wa-text-muted)] focus:border-[#25D366]/45 focus:ring-2 focus:ring-[#25D366]/15"
        />
        <a
          href={waOpen}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex shrink-0 items-center justify-center rounded-xl bg-[#008069] px-4 py-2 text-center text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#075e54] sm:min-h-[2.5rem]"
          title={`Abrir chat con ${title}`}
        >
          Enviar en WA
        </a>
      </div>
    </div>
  );
}
