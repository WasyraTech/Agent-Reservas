import Link from "next/link";

import { AppointmentsExportButton } from "@/components/AppointmentsExportButton";
import { PanelGlassCard } from "@/components/PanelGlassCard";
import { PanelPageHeader } from "@/components/PanelPageHeader";
import { IconCalendar, IconCircleAlert } from "@/components/panel-icons";
import { fetchAppointments, type AppointmentListItem } from "@/lib/server-api";

import { CitasFiltersForm } from "./citas-filters-form";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
}

const STATUS_FILTER_LABELS: Record<string, string> = {
  confirmed: "Confirmadas",
  pending_confirmation: "Pend. confirmación",
  cancelled: "Canceladas",
};

function formatYmdEs(ymd: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", { dateStyle: "medium" }).format(new Date(`${ymd}T12:00:00`));
  } catch {
    return ymd;
  }
}

const LIMA_TZ = "America/Lima";
const LIMA_UTC = "-05:00";

function limaTodayYmd(): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(new Date());
  const y = parts.find((p) => p.type === "year")?.value ?? "1970";
  const m = parts.find((p) => p.type === "month")?.value ?? "01";
  const d = parts.find((p) => p.type === "day")?.value ?? "01";
  return `${y}-${m}-${d}`;
}

function ymdLimaFromIso(iso: string): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: LIMA_TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function limaDayStartMs(ymd: string): number {
  return new Date(`${ymd}T00:00:00${LIMA_UTC}`).getTime();
}

function groupUpcomingByDay(rows: AppointmentListItem[], days: number) {
  const today = limaTodayYmd();
  const startMs = limaDayStartMs(today);
  const endMs = startMs + days * 24 * 60 * 60 * 1000;
  const upcoming = rows.filter((r) => {
    const t = new Date(r.start_at).getTime();
    return t >= startMs && t < endMs;
  });
  const map = new Map<string, AppointmentListItem[]>();
  for (const r of upcoming) {
    const k = ymdLimaFromIso(r.start_at);
    const list = map.get(k) ?? [];
    list.push(r);
    map.set(k, list);
  }
  const keys = [...map.keys()].sort();
  return keys.map((k) => ({
    key: k,
    label: new Intl.DateTimeFormat("es-PE", {
      timeZone: LIMA_TZ,
      weekday: "long",
      day: "numeric",
      month: "short",
    }).format(new Date(`${k}T12:00:00${LIMA_UTC}`)),
    items: (map.get(k) ?? []).sort((a, b) => new Date(a.start_at).getTime() - new Date(b.start_at).getTime()),
  }));
}

function formatDate(iso: string) {
  try {
    return new Intl.DateTimeFormat("es-PE", {
      dateStyle: "short",
      timeStyle: "short",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function statusChipClass(status: string) {
  if (status === "confirmed") {
    return "border border-emerald-200/80 bg-gradient-to-br from-emerald-50 to-emerald-100/70 px-2.5 py-0.5 text-xs font-semibold text-emerald-900 shadow-[inset_0_1px_0_rgba(255,255,255,0.6)] dark:border-emerald-700/45 dark:from-emerald-950/85 dark:to-emerald-900/55 dark:text-emerald-100 dark:shadow-none";
  }
  if (status === "cancelled") {
    return "border border-red-100 bg-red-50/90 px-2.5 py-0.5 text-xs font-medium text-red-800 dark:border-red-800/45 dark:bg-red-950/55 dark:text-red-100";
  }
  if (status === "pending_confirmation") {
    return "border border-amber-100 bg-amber-50/90 px-2.5 py-0.5 text-xs font-medium text-amber-900 dark:border-amber-800/45 dark:bg-amber-950/55 dark:text-amber-100";
  }
  return "rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-2.5 py-0.5 text-xs font-medium text-[var(--wa-text-muted)]";
}

export default async function CitasPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const status = pickFirst(sp.status);
  const date_from = pickFirst(sp.date_from);
  const date_to = pickFirst(sp.date_to);

  const st = (status ?? "").trim();
  const df = (date_from ?? "").trim();
  const dt = (date_to ?? "").trim();
  const dateRangeInvalid = Boolean(df && dt && df > dt);

  let rows: Awaited<ReturnType<typeof fetchAppointments>> = [];
  let err: string | null = null;
  if (!dateRangeInvalid) {
    try {
      rows = await fetchAppointments({
        limit: 300,
        offset: 0,
        status,
        date_from,
        date_to,
      });
    } catch (e) {
      err = e instanceof Error ? e.message : "Error al cargar";
    }
  }

  const hasFilters = Boolean(st || df || dt);

  const agendaByDay = !err && rows.length > 0 ? groupUpcomingByDay(rows, 7) : [];
  const agendaTotal = agendaByDay.reduce((n, g) => n + g.items.length, 0);

  return (
    <div className="min-h-0 flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <PanelPageHeader
          eyebrow="Agenda"
          title="Citas"
          icon={<IconCalendar className="h-7 w-7" />}
          subtitle={
            <>
              Citas registradas por el agente con{" "}
              <code className="rounded-md bg-[var(--wa-chip-bg)] px-1.5 py-0.5 text-[13px] text-[var(--wa-text)] ring-1 ring-[var(--wa-border)]">
                book_appointment
              </code>{" "}
              y sincronizadas con Google Calendar cuando está configurado. Desde una fila puedes abrir el chat.
            </>
          }
        />

        <CitasFiltersForm
          defaultStatus={st}
          defaultDateFrom={df}
          defaultDateTo={dt}
          hasFilters={hasFilters}
          serverDateRangeInvalid={dateRangeInvalid}
        />

        {hasFilters && !dateRangeInvalid ? (
          <ul className="mt-3 flex flex-wrap gap-2" aria-label="Filtros aplicados">
            {st ? (
              <li
                key="f-status"
                className="inline-flex items-center rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-3 py-1 text-[12px] font-medium text-[var(--wa-text)]"
              >
                Estado: {STATUS_FILTER_LABELS[st] ?? st}
              </li>
            ) : null}
            {df ? (
              <li
                key="f-from"
                className="inline-flex items-center rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-3 py-1 text-[12px] font-medium text-[var(--wa-text)]"
              >
                Desde: {formatYmdEs(df)}
              </li>
            ) : null}
            {dt ? (
              <li
                key="f-to"
                className="inline-flex items-center rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-3 py-1 text-[12px] font-medium text-[var(--wa-text)]"
              >
                Hasta: {formatYmdEs(dt)}
              </li>
            ) : null}
          </ul>
        ) : null}

        {err ? (
          <div
            className="mt-6 flex gap-3 rounded-2xl border border-red-200/80 bg-gradient-to-br from-red-50/95 via-[var(--wa-card-bg)] to-rose-50/40 p-4 shadow-sm dark:border-red-900/50 dark:from-red-950/45 dark:via-[var(--wa-card-bg)] dark:to-red-950/25"
            role="alert"
          >
            <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100/80 text-red-600 ring-1 ring-red-200/60 dark:bg-red-950/60 dark:text-red-300 dark:ring-red-800/50">
              <IconCircleAlert className="h-5 w-5" />
            </span>
            <p className="min-w-0 pt-1 text-sm leading-relaxed text-red-950 dark:text-red-100">{err}</p>
          </div>
        ) : null}

        {!err && agendaTotal > 0 ? (
          <div className="mt-8">
            <div className="mb-3 flex flex-wrap items-end justify-between gap-2">
              <div>
                <p className="text-[13px] font-semibold text-[var(--wa-text)]">Próximos días (Lima)</p>
                <p className="text-[12px] text-[var(--wa-text-muted)]">
                  Citas con inicio en los próximos 7 días, agrupadas por día ({agendaTotal} en ventana).
                </p>
              </div>
            </div>
            <div className="space-y-5">
              {agendaByDay.map((g) => (
                <div key={g.key}>
                  <p className="mb-2 capitalize text-[12px] font-bold uppercase tracking-wide text-[var(--wa-accent-soft)]">{g.label}</p>
                  <div className="space-y-2">
                    {g.items.map((r) => (
                      <div
                        key={r.id}
                        className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] px-4 py-3 shadow-[0_2px_8px_-4px_rgba(11,20,26,0.06)] dark:shadow-[0_2px_12px_-6px_rgba(0,0,0,0.35)]"
                      >
                        <div className="min-w-0">
                          <p className="font-mono text-xs text-[var(--wa-text-muted)]">
                            {new Intl.DateTimeFormat("es-PE", {
                              timeStyle: "short",
                              timeZone: LIMA_TZ,
                            }).format(new Date(r.start_at))}
                          </p>
                          <p className="mt-0.5 truncate font-semibold text-[var(--wa-text)]">{r.client_name ?? "—"}</p>
                          <p className="truncate text-sm text-[var(--wa-text-muted)]">{r.service_label ?? "—"}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-2">
                          <span className={`inline-flex rounded-full ${statusChipClass(r.status)}`}>{r.status}</span>
                          <Link
                            href={`/chats/${r.conversation_id}`}
                            className="inline-flex items-center rounded-full bg-[var(--wa-ok-banner-bg)] px-3 py-1.5 text-xs font-semibold text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-border)]"
                          >
                            Chat
                          </Link>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--wa-border)] bg-[var(--wa-chip-bg)] px-3 py-1 text-[13px] font-medium text-[var(--wa-text)]">
              <span className="h-1.5 w-1.5 rounded-full bg-[#25D366]" aria-hidden />
              {rows.length} cita{rows.length === 1 ? "" : "s"}
            </span>
            {hasFilters ? (
              <span className="rounded-full border border-amber-100 bg-amber-50/90 px-3 py-1 text-[12px] font-semibold text-amber-900 dark:border-amber-800/50 dark:bg-amber-950/55 dark:text-amber-100">
                Filtros activos
              </span>
            ) : null}
          </div>
          {rows.length > 0 ? <AppointmentsExportButton rows={rows} /> : null}
        </div>

        {dateRangeInvalid ? (
          <PanelGlassCard className="mt-6 overflow-hidden px-4 py-12 text-center sm:px-6">
            <p className="mx-auto max-w-md text-sm text-[var(--wa-text-muted)]">
              El rango de fechas no es válido: corrige «Desde» y «Hasta» y pulsa <strong className="text-[var(--wa-text)]">Aplicar</strong>.
            </p>
          </PanelGlassCard>
        ) : rows.length === 0 && !err ? (
          <PanelGlassCard className="mt-6 overflow-hidden px-4 py-14 text-center sm:px-6">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[var(--wa-ok-banner-bg)] text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-border)]">
              <IconCalendar className="h-7 w-7" aria-hidden />
            </div>
            <p className="mx-auto max-w-sm text-sm text-[var(--wa-text-muted)]">
              No hay citas con este criterio. Prueba otro rango o estado, revisa los{" "}
              <Link href="/configuracion" className="font-medium text-[var(--wa-link)] underline underline-offset-2">
                ajustes del agente
              </Link>{" "}
              o abre un{" "}
              <Link href="/chats" className="font-medium text-[var(--wa-link)] underline underline-offset-2">
                chat
              </Link>{" "}
              para comprobar conversaciones.
            </p>
          </PanelGlassCard>
        ) : rows.length > 0 ? (
          <>
            <div className="mt-6 space-y-3 md:hidden">
              {rows.map((r) => (
                <div
                  key={r.id}
                  className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 shadow-[0_2px_8px_-4px_rgba(11,20,26,0.06)] dark:shadow-[0_2px_12px_-6px_rgba(0,0,0,0.35)]"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-mono text-xs text-[var(--wa-text-muted)]">{formatDate(r.start_at)}</p>
                      <p className="mt-1 truncate text-[15px] font-semibold text-[var(--wa-text)]">{r.client_name ?? "—"}</p>
                      <p className="mt-0.5 truncate text-sm text-[var(--wa-text-muted)]">{r.service_label ?? "—"}</p>
                    </div>
                    <span className={`inline-flex shrink-0 rounded-full ${statusChipClass(r.status)}`}>{r.status}</span>
                  </div>
                  <div className="mt-4 flex justify-end border-t border-[var(--wa-border)] pt-3">
                    <Link
                      href={`/chats/${r.conversation_id}`}
                      className="inline-flex items-center rounded-full bg-[var(--wa-ok-banner-bg)] px-4 py-2 text-xs font-semibold text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-border)]"
                    >
                      Abrir chat
                    </Link>
                  </div>
                </div>
              ))}
            </div>
            <PanelGlassCard className="mt-6 hidden overflow-hidden p-0 sm:p-0 md:block" flush>
              <table className="min-w-full divide-y divide-[var(--wa-border)] text-left text-sm">
                <thead className="bg-gradient-to-b from-[var(--wa-strip-bg)] to-[var(--wa-panel)] text-xs text-[var(--wa-text-muted)]">
                  <tr>
                    <th className="px-4 py-3 font-semibold">Inicio</th>
                    <th className="px-4 py-3 font-semibold">Cliente</th>
                    <th className="px-4 py-3 font-semibold">Servicio</th>
                    <th className="px-4 py-3 font-semibold">Estado</th>
                    <th className="px-4 py-3 font-semibold">Chat</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--wa-border)] text-[var(--wa-text)]">
                  {rows.map((r, idx) => (
                    <tr
                      key={r.id}
                      className={[
                        "transition-colors hover:bg-[var(--wa-panel-hover)] motion-reduce:transition-none",
                        idx % 2 === 1 ? "bg-[var(--wa-panel)]/50" : "",
                      ].join(" ")}
                    >
                      <td className="whitespace-nowrap px-4 py-3 font-mono text-xs text-[var(--wa-text-muted)]">
                        {formatDate(r.start_at)}
                      </td>
                      <td className="max-w-[10rem] truncate px-4 py-3 font-medium">{r.client_name ?? "—"}</td>
                      <td className="max-w-[10rem] truncate px-4 py-3 text-[var(--wa-text-muted)]">
                        {r.service_label ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex rounded-full ${statusChipClass(r.status)}`}>{r.status}</span>
                      </td>
                      <td className="px-4 py-3">
                        <Link
                          href={`/chats/${r.conversation_id}`}
                          className="inline-flex items-center rounded-full bg-[var(--wa-ok-banner-bg)] px-3 py-1 text-xs font-semibold text-[var(--wa-accent-soft)] ring-1 ring-[var(--wa-border)] transition hover:brightness-110 hover:ring-[var(--wa-accent)]/35"
                        >
                          Abrir chat
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </PanelGlassCard>
          </>
        ) : null}
      </div>
    </div>
  );
}
