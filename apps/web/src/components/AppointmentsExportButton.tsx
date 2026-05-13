"use client";

import type { AppointmentListItem } from "@/lib/server-api";

function csvEscape(s: string): string {
  if (/[",\n\r]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function AppointmentsExportButton({ rows }: { rows: AppointmentListItem[] }) {
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
  }

  return (
    <button
      type="button"
      onClick={downloadCsv}
      className="rounded-lg border border-white/15 bg-black/30 px-4 py-2 text-sm font-medium text-[var(--wa-text)] transition hover:bg-white/10"
    >
      Exportar CSV
    </button>
  );
}
