"use client";

import type { ReactNode } from "react";
import Link from "next/link";

type Msg = {
  id: string;
  direction: string;
  body: string;
  created_at: string;
};

function startOfLocalDay(d: Date) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}

/** Rótulo tipo WhatsApp Web: Hoy / Ayer / fecha larga. */
function conversationDayLabel(iso: string): string {
  const msg = new Date(iso);
  if (Number.isNaN(msg.getTime())) return "";
  const t0 = startOfLocalDay(new Date());
  const t1 = startOfLocalDay(msg);
  const diffDays = Math.round((t0 - t1) / 86400000);
  if (diffDays === 0) return "Hoy";
  if (diffDays === 1) return "Ayer";
  return new Intl.DateTimeFormat("es", {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  }).format(msg);
}

export function ChatMessageThread({
  messages,
  llmBad,
  lastAgentLlmError,
}: {
  messages: Msg[];
  llmBad: boolean;
  lastAgentLlmError: string | null;
}) {
  let lastDay = "";

  const nodes: ReactNode[] = [];

  if (messages.length === 0) {
    nodes.push(
      <p key="empty" className="py-12 text-center text-sm text-[var(--wa-text-muted)]">
        Sin mensajes aún.
      </p>,
    );
  } else {
    for (const m of messages) {
      const inbound = m.direction === "inbound";
      const day = conversationDayLabel(m.created_at);
      const showDay = day && day !== lastDay;
      if (day) lastDay = day;

      if (showDay) {
        nodes.push(
          <div key={`day-${m.id}`} className="flex w-full justify-center py-3">
            <span className="rounded-lg bg-white/90 px-3 py-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#54656f] shadow-[0_1px_2px_rgba(11,20,26,0.08)] ring-1 ring-[#000000]/6">
              {day}
            </span>
          </div>,
        );
      }

      nodes.push(
        <div key={m.id} className={`flex w-full ${inbound ? "justify-start" : "justify-end"}`}>
          <div
            className={[
              "relative max-w-[min(88%,30rem)] rounded-lg px-3.5 py-2.5 sm:px-4 sm:py-3",
              inbound
                ? "rounded-tl-md bg-[var(--wa-bubble-in)] text-[var(--wa-text)] shadow-[0_1px_0.5px_rgba(11,20,26,0.06)] ring-1 ring-[var(--wa-border)]"
                : "rounded-tr-md bg-[var(--wa-bubble-out)] text-[var(--wa-text)] shadow-[0_1px_0.5px_rgba(11,20,26,0.06)] ring-1 ring-[var(--wa-border)]",
            ].join(" ")}
          >
            <div className="mb-1 flex items-center justify-between gap-3">
              <span
                className={
                  inbound
                    ? "text-[10px] font-bold uppercase tracking-wider text-[var(--wa-accent-soft)]"
                    : "wa-msg-out-meta text-[10px] font-bold uppercase tracking-wider"
                }
              >
                {inbound ? "Cliente" : "Agente"}
              </span>
              <time
                className={
                  inbound
                    ? "text-[10px] tabular-nums text-[var(--wa-text-muted)]"
                    : "wa-msg-out-meta text-[10px] tabular-nums"
                }
                dateTime={m.created_at}
              >
                {new Date(m.created_at).toLocaleTimeString(undefined, {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </time>
            </div>
            <p className="whitespace-pre-wrap text-[15px] leading-relaxed [word-break:break-word]">{m.body}</p>
          </div>
        </div>,
      );
    }
  }

  nodes.push(
    <div key="llm-foot" className="flex flex-col items-end gap-2 px-0.5 pt-1">
      {llmBad ? (
        <div className="max-w-[min(88%,30rem)] rounded-lg border border-red-100 bg-red-50 px-3 py-2.5 text-left text-[12px] leading-snug text-red-900">
          <p className="font-semibold text-red-800">El asistente automático tuvo un problema</p>
          <p className="mt-1 text-[11px] text-red-800/90">
            Suele deberse a clave sin saldo, modelo incorrecto o límites de la API (OpenAI / Gemini). Puedes seguir
            atendiendo por WhatsApp como humano.
          </p>
          {lastAgentLlmError ? (
            <p className="mt-2 font-mono text-[10px] leading-snug text-red-700/90 [word-break:break-word]">
              {lastAgentLlmError.length > 600 ? `${lastAgentLlmError.slice(0, 600)}…` : lastAgentLlmError}
            </p>
          ) : null}
          <p className="mt-2">
            <Link href="/configuracion" className="font-medium text-[#027eb5] underline underline-offset-2">
              Abrir Ajustes (Motor de IA)
            </Link>
          </p>
        </div>
      ) : (
        <p className="wa-ok-banner rounded-lg px-2 py-1 text-[10px]">
          Última respuesta del modelo: <span className="font-mono font-medium text-[#008069]">ok</span>
        </p>
      )}
    </div>,
  );

  return <>{nodes}</>;
}
