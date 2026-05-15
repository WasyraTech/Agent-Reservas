"use client";

import { useState } from "react";

import { IconEscalate } from "@/components/panel-icons";

type Props = {
  conversationId: string;
  currentStatus: string;
};

export function HandoffButton({ conversationId, currentStatus }: Props) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function onHandoff() {
    setLoading(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/internal/conversations/${conversationId}/handoff`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "manual_from_next_panel" }),
      });
      if (!res.ok) {
        const t = await res.text();
        setMessage(t || `Error ${res.status}`);
        return;
      }
      window.location.reload();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  const disabled = loading || currentStatus === "handed_off";

  return (
    <div className="flex shrink-0 flex-col items-end gap-1">
      <button
        type="button"
        onClick={onHandoff}
        disabled={disabled}
        className="inline-flex items-center gap-1.5 rounded-full border border-[#fde68a] bg-[#fffbeb] px-3.5 py-2 text-[12px] font-semibold text-[#92400e] shadow-sm transition hover:bg-[#fef3c7] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <IconEscalate className="h-4 w-4 shrink-0 opacity-90" />
        {currentStatus === "handed_off" ? "Escalada" : loading ? "…" : "Escalar"}
      </button>
      {message ? (
        <p className="max-w-[10rem] text-right text-[10px] leading-tight text-[var(--wa-danger)]">
          {message}
        </p>
      ) : null}
    </div>
  );
}
