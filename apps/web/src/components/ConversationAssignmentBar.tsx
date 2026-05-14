"use client";

import { useRouter } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

type OpRow = { id: string; display_name: string; phone_e164: string; role: string };

export function ConversationAssignmentBar({
  conversationId,
  assignedOperatorId: initialAid,
  isAdmin,
}: {
  conversationId: string;
  assignedOperatorId: string | null;
  isAdmin: boolean;
}) {
  const router = useRouter();
  const [assignedOperatorId, setAssignedOperatorId] = useState<string | null>(initialAid);
  const [operators, setOperators] = useState<OpRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    setAssignedOperatorId(initialAid);
  }, [initialAid]);

  const loadOps = useCallback(async () => {
    if (!isAdmin) return;
    const res = await fetch("/api/internal/panel/operators", { cache: "no-store" });
    if (!res.ok) return;
    const j = (await res.json()) as OpRow[];
    setOperators(Array.isArray(j) ? j : []);
  }, [isAdmin]);

  useEffect(() => {
    void loadOps();
  }, [loadOps]);

  async function claim() {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch(`/api/internal/conversations/${conversationId}/claim`, {
        method: "POST",
      });
      const t = await res.text();
      if (!res.ok) {
        setMsg(t || `Error ${res.status}`);
        return;
      }
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function assignTo(value: string) {
    setLoading(true);
    setMsg(null);
    const assigned_operator_id = value === "" ? null : value;
    try {
      const res = await fetch(`/api/internal/conversations/${conversationId}/assignment`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assigned_operator_id }),
      });
      const t = await res.text();
      if (!res.ok) {
        setMsg(t || `Error ${res.status}`);
        return;
      }
      setAssignedOperatorId(assigned_operator_id);
      router.refresh();
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  const unassigned = !assignedOperatorId;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-white/[0.06] bg-black/25 px-3 py-2 text-[11px] text-[var(--wa-text-muted)]">
      {unassigned ? (
        <button
          type="button"
          disabled={loading}
          onClick={() => void claim()}
          className="rounded-lg bg-[var(--wa-accent)]/20 px-2.5 py-1 font-medium text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-accent)]/35 hover:bg-[var(--wa-accent)]/30 disabled:opacity-50"
        >
          Tomar conversación
        </button>
      ) : (
        <span className="rounded bg-white/[0.06] px-2 py-0.5 text-[var(--wa-text)]">
          Asignada a operador
        </span>
      )}
      {isAdmin ? (
        <label className="flex items-center gap-1.5">
          <span className="uppercase tracking-wide">Reasignar</span>
          <select
            className="max-w-[14rem] rounded border border-white/10 bg-black/30 px-2 py-1 text-[11px] text-[var(--wa-text)]"
            disabled={loading}
            value={assignedOperatorId ?? ""}
            onChange={(e) => void assignTo(e.target.value)}
          >
            <option value="">Sin asignar</option>
            {operators.map((o) => (
              <option key={o.id} value={o.id}>
                {(o.display_name || o.phone_e164) + ` (${o.phone_e164})`}
              </option>
            ))}
          </select>
        </label>
      ) : null}
      {msg ? <span className="text-red-300/90">{msg}</span> : null}
    </div>
  );
}
