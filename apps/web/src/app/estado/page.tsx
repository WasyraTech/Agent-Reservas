"use client";

import { useCallback, useEffect, useState } from "react";

import { PanelPageHeader } from "@/components/PanelPageHeader";
import { usePanelToast } from "@/components/PanelToast";
import { IconActivity, IconCheckCircle, IconCircleAlert, IconCopy, IconRefresh } from "@/components/panel-icons";
import { formatRelativeActivity } from "@/lib/relative-time";

type StatusPayload = {
  api_version: string;
  git_commit: string;
  database: string;
  redis_configured: boolean;
};

function StatTile({
  label,
  value,
  mono,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="group relative overflow-hidden rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 shadow-[0_8px_28px_-16px_rgba(11,20,26,0.12)] backdrop-blur-sm transition hover:border-[var(--wa-nav-indicator)]/40 hover:shadow-[0_12px_32px_-14px_rgba(0,128,105,0.12)] motion-reduce:transition-none">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--wa-nav-indicator)]/50 to-transparent opacity-80" />
      <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">{label}</p>
      <p
        className={[
          "mt-2 break-all text-[15px] font-semibold leading-snug text-[var(--wa-text)]",
          mono ? "font-mono text-xs sm:text-sm" : "",
        ].join(" ")}
      >
        {value}
      </p>
    </div>
  );
}

function LoadingSkeleton() {
  return (
    <div className="mt-8 grid gap-3 sm:grid-cols-2" aria-busy="true" aria-label="Cargando estado">
      {[0, 1, 2, 3].map((i) => (
        <div
          key={i}
          className="h-24 animate-pulse rounded-2xl border border-[var(--wa-border)]/80 bg-gradient-to-br from-[var(--wa-panel)] to-[var(--wa-card-bg)] motion-reduce:animate-none"
        />
      ))}
    </div>
  );
}

export default function EstadoPage() {
  const toast = usePanelToast();
  const [data, setData] = useState<StatusPayload | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [rid, setRid] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [lastCheckedAt, setLastCheckedAt] = useState<Date | null>(null);

  const load = useCallback(async () => {
    setErr(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/status", { cache: "no-store" });
      const id = res.headers.get("X-Request-ID");
      if (id) setRid(id);
      const j = (await res.json()) as { detail?: unknown } & Partial<StatusPayload>;
      if (!res.ok) {
        const d = j.detail;
        setData(null);
        setErr(typeof d === "string" ? d : JSON.stringify(d));
        return;
      }
      setData(j as StatusPayload);
    } catch (e) {
      setData(null);
      setErr(e instanceof Error ? e.message : "Error de red");
    } finally {
      setLoading(false);
      setLastCheckedAt(new Date());
    }
  }, []);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8 sm:px-6 sm:py-10">
      <PanelPageHeader
        eyebrow="Sistema"
        title="Estado del despliegue"
        icon={<IconActivity className="h-7 w-7" />}
        subtitle={
          <>
            Respuesta de{" "}
            <code className="rounded-md bg-[var(--wa-chip-bg)] px-1.5 py-0.5 text-[13px] text-[var(--wa-text)] ring-1 ring-[var(--wa-border)]">
              /api/internal/status
            </code>{" "}
            (misma autenticación interna que el resto del panel).
          </>
        }
      />
      {rid ? (
        <p className="mt-3 font-mono text-[11px] text-[var(--wa-text-muted)]">
          X-Request-ID: <span className="text-[var(--wa-text)]">{rid}</span>
        </p>
      ) : null}
      {lastCheckedAt ? (
        <p className="mt-2 text-[12px] text-[var(--wa-text-muted)]" title={lastCheckedAt.toLocaleString("es-PE")}>
          Última comprobación {formatRelativeActivity(lastCheckedAt.toISOString())}
        </p>
      ) : null}

      {err ? (
        <div
          className="mt-6 flex gap-3 rounded-2xl border border-red-100 bg-gradient-to-br from-red-50/95 via-white to-rose-50/40 p-4 shadow-sm"
          role="alert"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-red-100/80 text-red-600 ring-1 ring-red-200/60">
            <IconCircleAlert className="h-5 w-5" />
          </span>
          <p className="min-w-0 pt-1 text-sm leading-relaxed text-red-950">{err}</p>
        </div>
      ) : null}

      {loading && !data && !err ? <LoadingSkeleton /> : null}

      {data ? (
        <div className="mt-8 space-y-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <StatTile label="API" value={data.api_version} mono />
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 shadow-[0_8px_28px_-16px_rgba(11,20,26,0.12)] backdrop-blur-sm transition hover:border-[var(--wa-nav-indicator)]/40 hover:shadow-[0_12px_32px_-14px_rgba(0,128,105,0.12)] motion-reduce:transition-none">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--wa-nav-indicator)]/50 to-transparent opacity-80" />
              <div className="flex items-center justify-between gap-2">
                <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                  Git commit
                </p>
                <button
                  type="button"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] text-[var(--wa-accent-soft)] transition hover:border-[var(--wa-nav-indicator)]/45 hover:bg-[var(--wa-panel-hover)] active:scale-[0.98]"
                  aria-label="Copiar hash de commit completo"
                  title="Copiar"
                  onClick={() => {
                    void navigator.clipboard
                      .writeText(data.git_commit)
                      .then(() => {
                        toast("Commit copiado");
                      })
                      .catch(() => {
                        toast("No se pudo copiar");
                      });
                  }}
                >
                  <IconCopy className="h-4 w-4" />
                </button>
              </div>
              <p
                className="mt-2 break-all font-mono text-xs font-semibold leading-snug text-[var(--wa-text)] sm:text-sm"
                title={data.git_commit}
              >
                {data.git_commit.length > 28
                  ? `${data.git_commit.slice(0, 12)}…${data.git_commit.slice(-10)}`
                  : data.git_commit}
              </p>
            </div>
            <StatTile label="Base de datos" value={data.database} />
            <div className="group relative overflow-hidden rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-4 shadow-[0_8px_28px_-16px_rgba(11,20,26,0.12)] backdrop-blur-sm transition hover:border-[var(--wa-nav-indicator)]/40 motion-reduce:transition-none">
              <div className="pointer-events-none absolute inset-x-0 top-0 h-0.5 bg-gradient-to-r from-transparent via-[var(--wa-nav-indicator)]/50 to-transparent opacity-80" />
              <p className="text-[12px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                Redis (rate limit)
              </p>
              <div className="mt-2 flex items-center gap-2">
                {data.redis_configured ? (
                  <IconCheckCircle className="h-5 w-5 shrink-0 text-[#008069]" aria-hidden />
                ) : (
                  <span className="h-2 w-2 shrink-0 rounded-full bg-amber-400" aria-hidden />
                )}
                <p className="text-[15px] font-semibold text-[var(--wa-text)]">
                  {data.redis_configured ? "Configurado" : "No (memoria local)"}
                </p>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <button
        type="button"
        onClick={() => void load()}
        disabled={loading}
        className="mt-8 inline-flex min-h-[2.75rem] items-center justify-center gap-2 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] px-5 py-2.5 text-sm font-semibold text-[var(--wa-text)] shadow-sm transition hover:border-[var(--wa-nav-indicator)]/35 hover:bg-[var(--wa-panel-hover)] disabled:opacity-60 motion-reduce:transition-none"
      >
        <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""} motion-reduce:animate-none`} aria-hidden />
        {loading ? "Actualizando…" : "Recargar"}
      </button>
    </div>
  );
}
