"use client";

import { useState } from "react";

import { IconCheckCircle } from "@/components/panel-icons";

export function ResolveHandoffButton({
  conversationId,
  hasPendingHandoff,
}: {
  conversationId: string;
  hasPendingHandoff: boolean;
}) {
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  if (!hasPendingHandoff) return null;

  async function onResolve() {
    if (!confirm("¿Marcar este escalado como resuelto? La conversación volverá a estado abierto.")) return;
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/internal/conversations/${conversationId}/handoff/resolve`, {
        method: "POST",
      });
      const j = (await res.json().catch(() => ({}))) as { detail?: unknown };
      if (!res.ok) {
        setMsg(typeof j.detail === "string" ? j.detail : `Error ${res.status}`);
        return;
      }
      window.location.reload();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={() => void onResolve()}
        disabled={loading}
        className="inline-flex items-center gap-1 rounded-full border border-[#b9e6c9] bg-[#e7fce3] px-3 py-1.5 text-[11px] font-semibold text-[#008069] shadow-sm transition hover:bg-[#dcf8c6] disabled:opacity-50"
      >
        <IconCheckCircle className="h-3.5 w-3.5 shrink-0" />
        {loading ? "…" : "Marcar resuelto"}
      </button>
      {msg ? <p className="max-w-[12rem] text-right text-[10px] text-[#ea0038]">{msg}</p> : null}
    </div>
  );
}
