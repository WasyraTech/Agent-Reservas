"use client";

import { IconDownload } from "@/components/panel-icons";
import { usePanelToast } from "@/components/PanelToast";
import type { AppointmentListItem } from "@/lib/server-api";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function AppointmentsExportButton({ rows }: { rows: AppointmentListItem[] }) {
  const toast = usePanelToast();

  function downloadCsv() {
    const headers = [
      "id",
      "conversation_id",
      "twilio_from",
      "status",
      "start_at",
      "end_at",
      "client_name",
      "service_label",
      "google_event_id",
      "created_at",
    ];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push(
        [
          r.id,
          r.conversation_id,
          r.twilio_from,
          r.status,
          r.start_at,
          r.end_at,
          r.client_name ?? "",
          r.service_label ?? "",
          r.google_event_id ?? "",
          r.created_at,
        ]
          .map((c) => csvEscape(String(c)))
          .join(","),
      );
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `citas-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast("CSV descargado");
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      className="inline-flex items-center gap-2 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] px-4 py-2 text-sm font-semibold text-[var(--wa-accent-soft)] shadow-sm ring-1 ring-[var(--wa-border)]/80 transition hover:border-[var(--wa-accent)]/35 hover:bg-[var(--wa-panel-hover)] active:scale-[0.99] motion-reduce:active:scale-100"
    >
      <IconDownload className="h-4 w-4 shrink-0" aria-hidden />
      Exportar CSV
    </button>
  );
}
