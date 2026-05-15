import Link from "next/link";
import { notFound } from "next/navigation";

import { ChatConversationToolbar } from "@/components/ChatConversationToolbar";
import { ChatMarkRead } from "@/components/ChatMarkRead";
import { ChatMessageThread } from "@/components/ChatMessageThread";
import { IconChevronLeft, IconDotFilled } from "@/components/panel-icons";
import { ChatDetailRefresh } from "@/components/ChatDetailRefresh";
import { ConversationAssignmentBar } from "@/components/ConversationAssignmentBar";
import { ConversationNotesPanel } from "@/components/ConversationNotesPanel";
import { HandoffButton } from "@/components/HandoffButton";
import { LeadQualificationChips } from "@/components/LeadQualificationChips";
import { ResolveHandoffButton } from "@/components/ResolveHandoffButton";
import { fetchConversation, fetchPanelMe } from "@/lib/server-api";
import { waAvatarGlyph, waAvatarHue, waChatTitle } from "@/lib/wa-display";

type Props = { params: Promise<{ id: string }> };

export default async function ChatDetailPage({ params }: Props) {
  const { id } = await params;
  let data: Awaited<ReturnType<typeof fetchConversation>>;
  try {
    data = await fetchConversation(id);
  } catch {
    notFound();
  }

  const me = await fetchPanelMe();
  const title = waChatTitle(data.twilio_from);
  const glyph = waAvatarGlyph(data.twilio_from);
  const hue = waAvatarHue(data.twilio_from);
  const llmBad = (data.last_agent_llm_status || "ok").toLowerCase() !== "ok";
  const showHandoffStrip = data.pending_handoff || data.status === "handed_off";
  const lastMsg = data.messages.length ? data.messages[data.messages.length - 1]! : null;
  const appts = data.appointments ?? [];
  const hasAppts = appts.length > 0;

  return (
    <div className="flex h-full min-h-0 flex-col">
      <ChatMarkRead conversationId={data.id} />
      <ChatDetailRefresh
        conversationId={data.id}
        initialUpdatedAt={data.updated_at}
        initialLastMessageId={lastMsg?.id ?? ""}
      />
      {me ? (
        <ConversationAssignmentBar
          conversationId={data.id}
          assignedOperatorId={data.assigned_operator_id ?? null}
          isAdmin={me.role === "admin"}
        />
      ) : null}
      <header className="flex shrink-0 items-center gap-3 border-b border-[#e9edef] bg-[#f0f2f5]/95 px-3 py-2 shadow-[0_1px_0_rgba(255,255,255,0.85)_inset] backdrop-blur-sm sm:px-4">
        <Link
          href="/chats"
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)] active:scale-95 md:hidden"
          aria-label="Lista de chats"
        >
          <IconChevronLeft className="h-6 w-6" />
        </Link>
        <div
          className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-sm font-bold text-white shadow-sm ring-1 ring-black/5 sm:h-11 sm:w-11"
          style={{
            background: `linear-gradient(145deg, hsl(${hue},58%,44%), hsl(${(hue + 42) % 360},52%,30%))`,
          }}
          aria-hidden
        >
          {glyph}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-base font-semibold text-[var(--wa-text)] sm:text-[17px]">
            {title}
          </h1>
          <p className="flex flex-wrap items-center gap-x-2 gap-y-1 truncate text-[11px] text-[var(--wa-text-muted)]">
            {data.status === "open" ? (
              <span className="inline-flex items-center" title="Conversación abierta">
                <IconDotFilled className="h-2.5 w-2.5 text-[#25D366]" aria-hidden />
                <span className="sr-only">Conversación abierta</span>
              </span>
            ) : null}
            <span className="rounded-md bg-white/80 px-1.5 py-px font-medium text-[#54656f] ring-1 ring-[#e9edef]">
              {data.status}
            </span>
            <span className="hidden text-[#c8ccd0] sm:inline" aria-hidden>
              ·
            </span>
            <span className="hidden sm:inline" title="El panel consulta la conversación en segundo plano">
              Auto-actualización ~16 s
            </span>
            {llmBad ? (
              <>
                <span
                  className="inline-flex cursor-help items-center rounded-md bg-red-50 px-1.5 py-px text-[10px] font-semibold uppercase text-red-700 ring-1 ring-red-100"
                  title={
                    [
                      "El asistente automático no pudo generar bien la última respuesta.",
                      data.last_agent_llm_error
                        ? `Técnico: ${data.last_agent_llm_error.slice(0, 400)}${data.last_agent_llm_error.length > 400 ? "…" : ""}`
                        : "",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  }
                >
                  IA con error
                </span>
                <Link
                  href="/configuracion"
                  className="shrink-0 font-medium text-[var(--wa-link)] underline underline-offset-2"
                >
                  Revisar Ajustes
                </Link>
              </>
            ) : null}
          </p>
        </div>
        <HandoffButton conversationId={data.id} currentStatus={data.status} />
      </header>

      <ChatConversationToolbar conversationId={data.id} twilioFrom={data.twilio_from} />

      {(showHandoffStrip || data.lead || hasAppts) && (
        <div className="flex shrink-0 flex-wrap items-center gap-x-2 gap-y-1 border-b border-[var(--wa-strip-border)] bg-[var(--wa-strip-bg)] px-2.5 py-1.5 sm:px-3">
          {showHandoffStrip ? (
            <span
              className="inline-flex max-w-full items-center gap-1 rounded-full border border-[#fde68a] bg-[#fffbeb] px-2 py-0.5 text-[11px] text-[#92400e]"
              title={
                data.pending_handoff
                  ? `Motivo: ${data.pending_handoff.reason}`
                  : "Conversación marcada como handed_off"
              }
            >
              <span className="font-semibold text-[#78350f]">Escalado</span>
              {data.pending_handoff ? (
                <span className="max-w-[12rem] truncate text-[#92400e]">
                  · {data.pending_handoff.reason}
                </span>
              ) : null}
            </span>
          ) : null}

          <ResolveHandoffButton conversationId={data.id} hasPendingHandoff={Boolean(data.pending_handoff)} />

          {data.lead ? (
            <>
              {showHandoffStrip ? <span className="hidden h-3 w-px bg-[var(--wa-border)] sm:block" aria-hidden /> : null}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                Lead
              </span>
              <span className="max-w-[8rem] truncate text-[12px] font-medium text-[var(--wa-text)] sm:max-w-[10rem]">
                {data.lead.name ?? "Sin nombre"}
              </span>
              <span className="rounded bg-[var(--wa-chip-bg)] px-1.5 py-px text-[10px] font-medium uppercase text-[var(--wa-text-muted)]">
                {data.lead.stage}
              </span>
              <div className="flex w-full min-w-0 basis-full flex-wrap items-center gap-1 sm:basis-auto sm:w-auto">
                <LeadQualificationChips q={data.lead.qualification} />
              </div>
            </>
          ) : null}

          {hasAppts ? (
            <>
              {showHandoffStrip || data.lead ? (
                <span className="hidden h-3 w-px bg-[var(--wa-border)] sm:block" aria-hidden />
              ) : null}
              <span className="text-[10px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                Citas
              </span>
              <div className="flex max-w-full flex-wrap items-center gap-1.5">
                {appts.slice(0, 4).map((a) => (
                  <span
                    key={a.id}
                    title={a.service_label ?? ""}
                    className="max-w-[10rem] truncate rounded-full bg-[var(--wa-chip-bg)] px-2 py-0.5 text-[11px] text-[var(--wa-text)]"
                  >
                    {new Date(a.start_at).toLocaleString(undefined, {
                      month: "short",
                      day: "numeric",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}{" "}
                    <span className="text-[var(--wa-text-muted)]">· {a.status}</span>
                  </span>
                ))}
                {appts.length > 4 ? (
                  <Link href="/citas" className="text-[11px] font-medium text-[var(--wa-link)] underline">
                    +{appts.length - 4} en lista
                  </Link>
                ) : null}
              </div>
            </>
          ) : null}

          {showHandoffStrip ? (
            <details className="ml-auto min-w-0 text-[11px]">
              <summary className="cursor-pointer list-none text-[var(--wa-link)] marker:content-none [&::-webkit-details-marker]:hidden hover:underline">
                ¿Qué implica el escalado?
              </summary>
              <p className="mt-1.5 max-w-md rounded-md border border-[var(--wa-border)] bg-[var(--wa-panel-hover)] p-2 text-[11px] leading-relaxed text-[var(--wa-text-muted)]">
                El cliente sigue en WhatsApp con el último mensaje del flujo. Aquí ves{" "}
                <strong className="text-[var(--wa-text)]">handed_off</strong>
                {data.pending_handoff ? (
                  <>
                    {" "}
                    y una solicitud <strong className="text-[var(--wa-text)]">pendiente</strong>.
                  </>
                ) : (
                  "."
                )}{" "}
                Cuando atiendas el caso, usa <strong className="text-[var(--wa-text)]">Marcar resuelto</strong> para
                reabrir el chat al bot.
              </p>
            </details>
          ) : null}
        </div>
      )}

      <div className="flex min-h-0 flex-1 flex-col">
        <div className="wa-chat-canvas wa-scroll min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-5 sm:py-4">
          <div className="mx-auto flex w-full max-w-2xl flex-col gap-2 pb-4">
            <ChatMessageThread
              messages={data.messages}
              llmBad={llmBad}
              lastAgentLlmError={data.last_agent_llm_error}
            />
          </div>
        </div>

        {data.lead ? (
          <details className="shrink-0 border-t border-[var(--wa-strip-border)] bg-[var(--wa-strip-bg)]">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-2 px-3 py-2 text-left marker:content-none [&::-webkit-details-marker]:hidden sm:px-4">
              <span className="flex items-center gap-2 text-[12px] font-medium text-[var(--wa-text)]">
                <span className="w-4 text-[var(--wa-text-muted)]">›</span>
                Ficha lead completa
              </span>
              <span className="text-[10px] text-[var(--wa-text-muted)]">Email, teléfono, CRM</span>
            </summary>
            <div className="border-t border-[var(--wa-border)] px-3 pb-3 pt-2 sm:px-4">
              <dl className="mx-auto grid max-w-2xl grid-cols-2 gap-x-4 gap-y-2 text-sm sm:grid-cols-4">
                <div>
                  <dt className="text-[10px] uppercase text-[var(--wa-text-muted)]">Nombre</dt>
                  <dd className="truncate font-medium text-[var(--wa-text)]">{data.lead.name ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-[var(--wa-text-muted)]">Email</dt>
                  <dd className="truncate text-[var(--wa-text)]">{data.lead.email ?? "—"}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-[var(--wa-text-muted)]">Teléfono</dt>
                  <dd className="truncate font-mono text-xs text-[var(--wa-text)]">{data.lead.phone}</dd>
                </div>
                <div>
                  <dt className="text-[10px] uppercase text-[var(--wa-text-muted)]">Etapa</dt>
                  <dd className="truncate text-[var(--wa-text)]">{data.lead.stage}</dd>
                </div>
              </dl>
              {data.lead.qualification && Object.keys(data.lead.qualification).length > 0 ? (
                <div className="mx-auto mt-3 max-w-2xl">
                  <p className="mb-1.5 text-[10px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                    Calificación
                  </p>
                  <LeadQualificationChips q={data.lead.qualification} />
                </div>
              ) : null}
            </div>
          </details>
        ) : null}

        <ConversationNotesPanel
          conversationId={data.id}
          initialNotes={data.internal_notes}
          initialTags={data.internal_tags ?? []}
        />
      </div>
    </div>
  );
}
