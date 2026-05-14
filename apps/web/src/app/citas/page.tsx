import Link from "next/link";

import { AppointmentsExportButton } from "@/components/AppointmentsExportButton";
import { fetchAppointments } from "@/lib/server-api";

type PageProps = {
  searchParams?: Promise<Record<string, string | string[] | undefined>>;
};

function pickFirst(v: string | string[] | undefined): string | undefined {
  if (v == null) return undefined;
  return Array.isArray(v) ? v[0] : v;
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

export default async function CitasPage({ searchParams }: PageProps) {
  const sp = (await searchParams) ?? {};
  const status = pickFirst(sp.status);
  const date_from = pickFirst(sp.date_from);
  const date_to = pickFirst(sp.date_to);

  let rows: Awaited<ReturnType<typeof fetchAppointments>> = [];
  let err: string | null = null;
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

  const hasFilters = Boolean(
    (status && status.trim()) || (date_from && date_from.trim()) || (date_to && date_to.trim()),
  );

  return (
    <div className="min-h-[calc(100vh-52px)] bg-[var(--wa-bg)] pb-16">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <h1 className="text-2xl font-semibold text-[var(--wa-text)]">Citas</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-[var(--wa-text-muted)]">
          Citas registradas por el agente con <code className="rounded bg-black/35 px-1.5 py-0.5">book_appointment</code>{" "}
          y sincronizadas con Google Calendar cuando está configurado. Desde una fila puedes abrir el chat.
        </p>

        <form
          method="get"
          className="mt-6 flex flex-col gap-3 rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-panel)] p-4 sm:flex-row sm:flex-wrap sm:items-end"
        >
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Estado</label>
            <select
              name="status"
              defaultValue={status ?? ""}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--wa-text)]"
            >
              <option value="">Todos</option>
              <option value="confirmed">Confirmadas</option>
              <option value="pending_confirmation">Pend. confirmación</option>
              <option value="cancelled">Canceladas</option>
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Desde (inicio)</label>
            <input
              type="date"
              name="date_from"
              defaultValue={date_from ?? ""}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--wa-text)]"
            />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium text-[var(--wa-text-muted)]">Hasta (inicio)</label>
            <input
              type="date"
              name="date_to"
              defaultValue={date_to ?? ""}
              className="rounded-lg border border-white/10 bg-black/30 px-3 py-2 text-sm text-[var(--wa-text)]"
            />
          </div>
          <div className="flex gap-2">
            <button
              type="submit"
              className="rounded-lg bg-[var(--wa-accent)] px-4 py-2 text-sm font-semibold text-[#0b141a] shadow-lg transition hover:brightness-110"
            >
              Filtrar
            </button>
            {hasFilters ? (
              <Link
                href="/citas"
                className="rounded-lg border border-white/15 px-4 py-2 text-sm text-[var(--wa-text)] transition hover:bg-white/10"
              >
                Limpiar
              </Link>
            ) : null}
          </div>
        </form>

        {err ? (
          <p className="mt-6 rounded-lg border border-red-500/30 bg-red-950/40 px-4 py-3 text-sm text-red-100">
            {err}
          </p>
        ) : null}

        <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm text-[var(--wa-text-muted)]">
            {rows.length} registro{rows.length === 1 ? "" : "s"}
          </p>
          {rows.length > 0 ? <AppointmentsExportButton rows={rows} /> : null}
        </div>

        <div className="mt-4 overflow-x-auto rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-panel)] shadow-xl">
          <table className="min-w-full divide-y divide-white/[0.06] text-left text-sm">
            <thead className="bg-black/25 text-xs uppercase tracking-wide text-[var(--wa-text-muted)]">
              <tr>
                <th className="px-4 py-3 font-medium">Inicio</th>
                <th className="px-4 py-3 font-medium">Cliente</th>
                <th className="px-4 py-3 font-medium">Servicio</th>
                <th className="px-4 py-3 font-medium">Estado</th>
                <th className="px-4 py-3 font-medium">Chat</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-white/[0.06] text-[var(--wa-text)]">
              {rows.map((r) => (
                <tr key={r.id} className="transition hover:bg-white/[0.03]">
                  <td className="whitespace-nowrap px-4 py-3 font-mono text-xs">{formatDate(r.start_at)}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3">{r.client_name ?? "—"}</td>
                  <td className="max-w-[10rem] truncate px-4 py-3 text-[var(--wa-text-muted)]">
                    {r.service_label ?? "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={
                        r.status === "confirmed"
                          ? "rounded-full bg-emerald-500/15 px-2 py-0.5 text-xs text-emerald-200"
                          : "rounded-full bg-white/10 px-2 py-0.5 text-xs text-[var(--wa-text-muted)]"
                      }
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/chats/${r.conversation_id}`}
                      className="font-medium text-[var(--wa-link)] underline underline-offset-2"
                    >
                      Abrir
                    </Link>
                  </td>
                </tr>
              ))}
              {rows.length === 0 && !err ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-[var(--wa-text-muted)]">
                    Aún no hay citas en este filtro.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
