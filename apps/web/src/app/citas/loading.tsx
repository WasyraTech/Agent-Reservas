import { PanelPageHeader } from "@/components/PanelPageHeader";
import { IconCalendar } from "@/components/panel-icons";

export default function CitasLoading() {
  return (
    <div className="min-h-0 flex-1 px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <PanelPageHeader
          eyebrow="Agenda"
          title="Citas"
          icon={<IconCalendar className="h-7 w-7" aria-hidden />}
          subtitle={<span className="text-[var(--wa-text-muted)]">Cargando citas…</span>}
        />
        <div className="mt-6 space-y-3">
          <div className="h-44 animate-pulse rounded-2xl bg-[var(--wa-panel)]" />
          <div className="flex flex-wrap gap-2">
            <div className="h-8 w-28 animate-pulse rounded-full bg-[var(--wa-panel)]" />
            <div className="h-8 w-36 animate-pulse rounded-full bg-[var(--wa-panel)]" />
          </div>
          <div className="h-56 animate-pulse rounded-2xl bg-[var(--wa-panel)]" />
        </div>
      </div>
    </div>
  );
}
