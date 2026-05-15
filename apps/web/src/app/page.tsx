import Link from "next/link";

import { PanelGlassCard } from "@/components/PanelGlassCard";
import { PanelPageHeader } from "@/components/PanelPageHeader";
import {
  IconActivity,
  IconCalendar,
  IconChevronRight,
  IconCircleAlert,
  IconMessages,
  IconSettings,
  IconSparkles,
} from "@/components/panel-icons";
import {
  fetchAppointments,
  fetchConversations,
  type AppointmentListItem,
  type ConversationSummary,
} from "@/lib/server-api";
import { waChatTitle } from "@/lib/wa-display";

const shortcuts = [
  {
    href: "/chats",
    title: "Chats",
    desc: "Bandeja con búsqueda, filtros y detalle del cliente. Sincronización en segundo plano.",
    kicker: "Mensajes",
    Icon: IconMessages,
    accent: "from-[#25D366] to-[#1faa52]",
    elevated: true,
  },
  {
    href: "/citas",
    title: "Citas",
    desc: "Agenda del agente, estados y acceso directo al chat de cada reserva.",
    kicker: "Agenda",
    Icon: IconCalendar,
    accent: "from-[#008069] to-[#006b56]",
    elevated: true,
  },
  {
    href: "/estado",
    title: "Estado",
    desc: "Versión de la API, commit, base de datos y Redis en un vistazo.",
    kicker: "Sistema",
    Icon: IconActivity,
    accent: "from-[#5c6c74] to-[#3d4b52]",
    elevated: false,
  },
  {
    href: "/configuracion",
    title: "Ajustes",
    desc: "Twilio, motor de IA, Google Calendar y personalidad del agente.",
    kicker: "Config",
    Icon: IconSettings,
    accent: "from-[#8696a0] to-[#5f6f78]",
    elevated: false,
  },
] as const;

function limaTodayYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Lima",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

export default async function HomePage() {
  let recent: ConversationSummary[] = [];
  let todayAppts: AppointmentListItem[] = [];
  let hubErr: string | null = null;
  try {
    const today = limaTodayYmd();
    [recent, todayAppts] = await Promise.all([
      fetchConversations({ limit: 6 }),
      fetchAppointments({ date_from: today, date_to: today, limit: 80 }),
    ]);
  } catch (e) {
    hubErr = e instanceof Error ? e.message : "No se pudo cargar el resumen";
  }

  const llmIssues = recent.filter((c) => (c.last_agent_llm_status || "ok").toLowerCase() !== "ok").length;

  return (
    <div className="min-h-0 flex-1 px-4 py-8 sm:px-7 sm:py-12">
      <div className="mx-auto max-w-5xl">
        <PanelPageHeader
          eyebrow="Agent Reservas"
          title="Inicio"
          subtitle="Resumen operativo: últimos chats, citas de hoy (hora Lima) y accesos rápidos al resto del panel."
          icon={<IconSparkles className="h-7 w-7" />}
        />

        {hubErr ? (
          <div
            className="mb-6 flex gap-3 rounded-2xl border border-amber-100 bg-amber-50/90 p-4 text-sm text-amber-950"
            role="status"
          >
            <IconCircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-amber-700" />
            <p className="min-w-0 leading-relaxed">{hubErr}</p>
          </div>
        ) : null}

        <div className="mb-8 grid gap-4 lg:grid-cols-2">
          <PanelGlassCard elevated className="overflow-hidden">
            <div className="flex items-center justify-between gap-2 border-b border-[#e9edef]/80 pb-3">
              <p className="text-[13px] font-semibold text-[var(--wa-text)]">Últimos chats</p>
              <Link href="/chats" className="text-[12px] font-semibold text-[#027eb5] hover:underline">
                Ver todos
              </Link>
            </div>
            {recent.length === 0 ? (
              <p className="pt-4 text-sm text-[#667781]">Aún no hay conversaciones. Cuando llegue el primer mensaje, aparecerá aquí.</p>
            ) : (
              <ul className="divide-y divide-[#f0f2f5] pt-1">
                {recent.map((c) => {
                  const title = waChatTitle(c.twilio_from);
                  const bad = (c.last_agent_llm_status || "ok").toLowerCase() !== "ok";
                  return (
                    <li key={c.id}>
                      <Link
                        href={`/chats/${c.id}`}
                        className="flex items-center justify-between gap-3 py-3 transition hover:bg-[#f8faf9]/80"
                      >
                        <div className="min-w-0">
                          <p className="truncate font-medium text-[var(--wa-text)]">{title}</p>
                          <p className="mt-0.5 line-clamp-1 text-[12px] text-[#667781]">
                            {(c.last_message_preview ?? "").trim() || "Sin vista previa"}
                          </p>
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-1">
                          {bad ? (
                            <span className="rounded-full bg-red-50 px-2 py-0.5 text-[10px] font-bold uppercase text-red-700 ring-1 ring-red-100">
                              IA
                            </span>
                          ) : (
                            <span className="rounded-full bg-[#e7fce3] px-2 py-0.5 text-[10px] font-bold uppercase text-[#008069] ring-1 ring-[#b9e6c9]">
                              OK
                            </span>
                          )}
                          <span className="text-[10px] text-[#8696a0]">{c.message_count} msg</span>
                        </div>
                      </Link>
                    </li>
                  );
                })}
              </ul>
            )}
          </PanelGlassCard>

          <PanelGlassCard elevated className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-[#e9edef]/80 pb-3">
              <p className="text-[13px] font-semibold text-[var(--wa-text)]">Citas hoy (Lima)</p>
              <div className="flex items-center gap-2">
                {llmIssues > 0 ? (
                  <Link
                    href="/configuracion"
                    className="inline-flex items-center gap-1 rounded-full bg-red-50 px-2.5 py-1 text-[11px] font-semibold text-red-800 ring-1 ring-red-100"
                  >
                    <IconCircleAlert className="h-3.5 w-3.5" />
                    {llmIssues} error{llmIssues === 1 ? "" : "es"} IA
                  </Link>
                ) : null}
                <Link href="/citas" className="text-[12px] font-semibold text-[#027eb5] hover:underline">
                  Agenda
                </Link>
              </div>
            </div>
            {todayAppts.length === 0 ? (
              <p className="pt-4 text-sm text-[#667781]">No hay citas con inicio hoy en el filtro actual.</p>
            ) : (
              <ul className="divide-y divide-[#f0f2f5] pt-1">
                {todayAppts.slice(0, 8).map((a) => (
                  <li key={a.id}>
                    <Link href={`/chats/${a.conversation_id}`} className="flex items-center justify-between gap-3 py-3 transition hover:bg-[#f8faf9]/80">
                      <div className="min-w-0">
                        <p className="truncate font-medium text-[var(--wa-text)]">{a.client_name ?? "Cliente"}</p>
                        <p className="mt-0.5 truncate text-[12px] text-[#667781]">{a.service_label ?? "—"}</p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="font-mono text-[11px] text-[#3b4a54]">
                          {new Intl.DateTimeFormat("es-PE", { timeStyle: "short", timeZone: "America/Lima" }).format(
                            new Date(a.start_at),
                          )}
                        </p>
                        <p className="mt-0.5 text-[10px] font-semibold uppercase text-[#8696a0]">{a.status}</p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
            {todayAppts.length > 8 ? (
              <p className="pt-2 text-center text-[12px] text-[#667781]">+{todayAppts.length - 8} más en Citas</p>
            ) : null}
          </PanelGlassCard>
        </div>

        <div className="grid gap-5 sm:grid-cols-2">
          {shortcuts.map((s) => {
            const Icon = s.Icon;
            return (
              <Link key={s.href} href={s.href} className="group block min-h-0">
                <PanelGlassCard elevated={s.elevated} className="h-full">
                  <div className="flex items-start gap-4">
                    <span
                      className={[
                        "flex h-14 w-14 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-[0_8px_22px_-6px_rgba(11,20,26,0.35)] ring-1 ring-white/30 transition duration-300 group-hover:scale-[1.04] group-hover:shadow-[0_12px_28px_-6px_rgba(11,20,26,0.4)]",
                        s.accent,
                      ].join(" ")}
                    >
                      <Icon className="h-7 w-7" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] font-bold uppercase tracking-[0.14em] text-[#008069]">{s.kicker}</p>
                      <h2 className="mt-1 text-[1.125rem] font-semibold tracking-tight text-[var(--wa-text)]">{s.title}</h2>
                      <p className="mt-2 text-[14px] leading-relaxed text-[#667781]">{s.desc}</p>
                      <p className="mt-4 inline-flex items-center gap-2 text-[14px] font-semibold text-[#027eb5] transition duration-200 group-hover:gap-3">
                        Abrir sección
                        <IconChevronRight className="h-4 w-4 translate-y-px opacity-80 transition group-hover:translate-x-0.5 group-hover:opacity-100" />
                      </p>
                    </div>
                  </div>
                </PanelGlassCard>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
