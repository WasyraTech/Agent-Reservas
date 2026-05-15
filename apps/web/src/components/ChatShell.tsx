"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  IconBolt,
  IconChevronDown,
  IconClock,
  IconInboxEmpty,
  IconRefresh,
  IconSearch,
  IconShieldCheck,
  IconTune,
  IconVolumeOff,
  IconVolumeOn,
} from "@/components/panel-icons";

import { conversationLooksUnread } from "@/lib/chat-read-state";
import { formatRelativeActivity } from "@/lib/relative-time";
import { waAvatarGlyph, waAvatarHue, waChatTitle } from "@/lib/wa-display";

const FILTER_KEYS = ["q", "status", "date_from", "date_to"] as const;
const POLL_MS = 18_000;

export type ChatSidebarRow = {
  id: string;
  twilio_from: string;
  status: string;
  updated_at: string;
  message_count: number;
  last_agent_llm_status: string;
  has_pending_handoff?: boolean;
  last_agent_llm_error_snippet?: string | null;
  last_message_preview?: string | null;
  last_message_direction?: string | null;
};

const SOUND_PREF_KEY = "ar_chat_sound_v1";

function playSoftBeep() {
  try {
    const Ctx = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (!Ctx) return;
    const ctx = new Ctx();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = "sine";
    o.frequency.value = 880;
    g.gain.value = 0.04;
    o.connect(g);
    g.connect(ctx.destination);
    o.start();
    o.stop(ctx.currentTime + 0.07);
    ctx.resume().catch(() => {});
  } catch {
    /* ignore */
  }
}

function activeConversationId(pathname: string): string | null {
  const m = pathname.match(/^\/chats\/([^/]+)$/);
  return m ? m[1] : null;
}

function filterQueryString(sp: URLSearchParams): string {
  const n = new URLSearchParams();
  for (const k of FILTER_KEYS) {
    const v = sp.get(k);
    if (v != null && v.trim() !== "") n.set(k, v.trim());
  }
  const s = n.toString();
  return s ? `?${s}` : "";
}

async function fetchConversationRows(fq: string): Promise<ChatSidebarRow[]> {
  const qs = new URLSearchParams(fq ? fq.slice(1) : "");
  qs.set("limit", "100");
  const res = await fetch(`/api/internal/conversations?${qs}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    const t = await res.text();
    throw new Error(t || `HTTP ${res.status}`);
  }
  const data = (await res.json()) as ChatSidebarRow[];
  return Array.isArray(data) ? data : [];
}

export function ChatShell({
  initialRows,
  children,
}: {
  initialRows: ChatSidebarRow[];
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const activeId = activeConversationId(pathname);

  const fq = useMemo(() => filterQueryString(searchParams), [searchParams]);
  const [rows, setRows] = useState<ChatSidebarRow[]>(initialRows);
  const [loading, setLoading] = useState(false);
  const [fetchErr, setFetchErr] = useState<string | null>(null);
  const [lastSync, setLastSync] = useState(() => new Date());

  const markSynced = useCallback(() => setLastSync(new Date()), []);

  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  useEffect(() => {
    setQ(searchParams.get("q") ?? "");
    setStatus(searchParams.get("status") ?? "");
    setDateFrom(searchParams.get("date_from") ?? "");
    setDateTo(searchParams.get("date_to") ?? "");
  }, [searchParams]);

  const [soundOn, setSoundOn] = useState(false);
  const prevCountsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    prevCountsRef.current = {};
  }, [fq]);

  useEffect(() => {
    try {
      setSoundOn(window.localStorage.getItem(SOUND_PREF_KEY) === "1");
    } catch {
      /* ignore */
    }
  }, []);

  const toggleSound = useCallback(() => {
    setSoundOn((v) => {
      const n = !v;
      try {
        window.localStorage.setItem(SOUND_PREF_KEY, n ? "1" : "0");
      } catch {
        /* ignore */
      }
      return n;
    });
  }, []);

  const silentPoll = useCallback(async () => {
    if (typeof document !== "undefined" && document.visibilityState !== "visible") return;
    try {
      const data = await fetchConversationRows(fq);
      const prev = prevCountsRef.current;
      const hadBaseline = Object.keys(prev).length > 0;
      let grew = false;
      if (soundOn && hadBaseline) {
        for (const r of data) {
          const p = prev[r.id] ?? 0;
          if (r.message_count > p) {
            grew = true;
            break;
          }
        }
      }
      if (grew) playSoftBeep();
      const next: Record<string, number> = {};
      for (const r of data) next[r.id] = r.message_count;
      prevCountsRef.current = next;
      setRows(data);
      markSynced();
      if (fq) setFetchErr(null);
    } catch {
      /* no molestar en polling silencioso */
    }
  }, [fq, markSynced, soundOn]);

  useEffect(() => {
    const id = setInterval(() => void silentPoll(), POLL_MS);
    const onVis = () => {
      if (document.visibilityState === "visible") void silentPoll();
    };
    document.addEventListener("visibilitychange", onVis);
    return () => {
      clearInterval(id);
      document.removeEventListener("visibilitychange", onVis);
    };
  }, [silentPoll]);

  useEffect(() => {
    if (!fq) {
      setRows(initialRows);
      setFetchErr(null);
      markSynced();
      return;
    }
    let cancelled = false;
    (async () => {
      setLoading(true);
      setFetchErr(null);
      try {
        const data = await fetchConversationRows(fq);
        if (!cancelled) {
          setRows(data);
          markSynced();
        }
      } catch (e) {
        if (!cancelled) setFetchErr(e instanceof Error ? e.message : "Error al filtrar");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [fq, initialRows, markSynced]);

  const applyFilters = useCallback(() => {
    const n = new URLSearchParams();
    if (q.trim()) n.set("q", q.trim());
    if (status.trim()) n.set("status", status.trim());
    if (dateFrom.trim()) n.set("date_from", dateFrom.trim());
    if (dateTo.trim()) n.set("date_to", dateTo.trim());
    const s = n.toString();
    router.replace(s ? `${pathname}?${s}` : pathname);
  }, [dateFrom, dateTo, pathname, q, router, status]);

  const clearFilters = useCallback(() => {
    setQ("");
    setStatus("");
    setDateFrom("");
    setDateTo("");
    router.replace(pathname);
  }, [pathname, router]);

  const tailQs = fq || "";

  const [filtersOpen, setFiltersOpen] = useState(() => {
    const st = searchParams.get("status")?.trim() ?? "";
    const df = searchParams.get("date_from")?.trim() ?? "";
    const dt = searchParams.get("date_to")?.trim() ?? "";
    return Boolean(st || df || dt);
  });

  return (
    <div className="flex min-h-0 flex-1 flex-col md:flex-row">
      <aside className="flex max-h-[min(58vh,calc(100dvh-11.5rem))] shrink-0 flex-col border-b border-[var(--wa-border)] bg-gradient-to-b from-[var(--wa-header)] to-[var(--wa-panel)] shadow-[4px_0_24px_-12px_rgba(11,20,26,0.08)] md:max-h-none md:h-full md:w-[min(100%,23rem)] md:max-w-[42vw] md:border-b-0 md:border-r md:border-[var(--wa-border)]">
        <div className="sticky top-0 z-20 border-b border-[var(--wa-border)] bg-gradient-to-b from-[var(--wa-header)] via-[var(--wa-header)]/98 to-[var(--wa-panel)]/95 px-3 pb-3 pt-3.5 backdrop-blur-md sm:px-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-[#e7fce3] text-[#008069] shadow-[inset_0_1px_0_rgba(255,255,255,0.8)] ring-1 ring-[#c8efd4]">
                <IconShieldCheck className="h-5 w-5" />
              </div>
              <div className="min-w-0">
                <h2 className="text-[17px] font-semibold leading-tight tracking-tight text-[var(--wa-text)]">Chats</h2>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-1.5 text-[12px] text-[var(--wa-text-muted)]">
                  <span className="inline-flex items-center gap-1 rounded-full bg-[var(--wa-header)] px-2 py-0.5 font-medium text-[var(--wa-text-muted)] ring-1 ring-[var(--wa-border)]">
                    {rows.length}
                  </span>
                  <span className="text-[var(--wa-text-muted)]">·</span>
                  <span className="min-w-0 truncate" title={lastSync.toLocaleString("es-PE")}>
                    {loading && fq ? "Buscando…" : `Lista · ${formatRelativeActivity(lastSync.toISOString())}`}
                  </span>
                  <span className="hidden text-[var(--wa-text-muted)] sm:inline">·</span>
                  <span className="hidden text-[11px] text-[var(--wa-text-muted)] sm:inline">Auto ~18s</span>
                </p>
              </div>
            </div>
            <div className="flex shrink-0 items-center gap-1">
              <button
                type="button"
                title={soundOn ? "Sonido de aviso activado" : "Activar sonido al llegar mensajes"}
                aria-pressed={soundOn}
                className={[
                  "flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel-hover)]",
                  soundOn ? "border-[#25D366]/50 text-[#008069]" : "",
                ].join(" ")}
                onClick={toggleSound}
              >
                {soundOn ? <IconVolumeOn className="h-4 w-4" /> : <IconVolumeOff className="h-4 w-4" />}
              </button>
              <button
                type="button"
                title="Actualizar ahora"
                className="flex h-9 w-9 items-center justify-center rounded-xl border border-[var(--wa-border)] bg-[var(--wa-panel)] text-[var(--wa-text-muted)] transition hover:bg-[var(--wa-panel-hover)] disabled:opacity-50"
                disabled={loading}
                onClick={() => void silentPoll()}
              >
                <IconRefresh className={`h-4 w-4 ${loading ? "animate-spin" : ""} motion-reduce:animate-none`} />
              </button>
              {loading ? (
                <span className="mt-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-[#25D366]" title="Sincronizando" />
              ) : null}
            </div>
          </div>

          <div className="relative mt-3">
            <IconSearch className="pointer-events-none absolute left-3.5 top-1/2 h-[18px] w-[18px] -translate-y-1/2 text-[var(--wa-text-muted)]" />
            <input
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") applyFilters();
              }}
              placeholder="Buscar por teléfono o nombre…"
              className="w-full rounded-full border border-[var(--wa-border)] bg-[var(--wa-header)] py-2.5 pl-10 pr-3 text-[14px] text-[var(--wa-text)] shadow-[inset_0_1px_2px_rgba(11,20,26,0.04)] outline-none transition placeholder:text-[var(--wa-text-muted)] focus:border-[#25D366]/50 focus:bg-[var(--wa-input-bg)] focus:ring-2 focus:ring-[#25D366]/20"
            />
          </div>

          <button
            type="button"
            onClick={() => setFiltersOpen((o) => !o)}
            className="mt-2.5 flex w-full items-center justify-between gap-2 rounded-xl border border-[var(--wa-border)]/90 bg-[var(--wa-panel)]/85 px-3 py-2 text-left text-[13px] font-medium text-[var(--wa-text-muted)] shadow-sm transition hover:bg-[var(--wa-panel-hover)] hover:text-[var(--wa-text)]"
            aria-expanded={filtersOpen}
          >
            <span className="flex items-center gap-2">
              <IconTune className="h-[17px] w-[17px] text-[#008069]" />
              Filtros avanzados
            </span>
            <IconChevronDown
              className={`h-[18px] w-[18px] text-[var(--wa-text-muted)] transition-transform duration-200 ${filtersOpen ? "rotate-180" : ""}`}
            />
          </button>

          <div
            className={[
              "grid overflow-hidden transition-[grid-template-rows,opacity] duration-300 ease-out",
              filtersOpen ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0",
            ].join(" ")}
          >
            <div className="min-h-0">
              <div className="mt-2 space-y-2 rounded-xl border border-[var(--wa-border)] bg-[var(--wa-strip-bg)] p-2.5">
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value)}
                  className="w-full rounded-lg border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-2.5 py-2 text-[13px] text-[var(--wa-text)] shadow-sm outline-none focus:border-[#25D366]/45 focus:ring-2 focus:ring-[#25D366]/15"
                >
                  <option value="">Estado (todos)</option>
                  <option value="open">open</option>
                  <option value="handed_off">handed_off</option>
                  <option value="closed">closed</option>
                </select>
                <div className="grid grid-cols-2 gap-2">
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                      <IconClock className="h-3.5 w-3.5" />
                      Desde
                    </span>
                    <input
                      type="date"
                      value={dateFrom}
                      onChange={(e) => setDateFrom(e.target.value)}
                      className="min-w-0 rounded-lg border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-1.5 py-1.5 text-[11px] text-[var(--wa-text)] shadow-sm outline-none focus:border-[#25D366]/45 focus:ring-2 focus:ring-[#25D366]/15"
                      title="Desde (UTC)"
                    />
                  </label>
                  <label className="flex flex-col gap-1">
                    <span className="flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-[var(--wa-text-muted)]">
                      <IconClock className="h-3.5 w-3.5" />
                      Hasta
                    </span>
                    <input
                      type="date"
                      value={dateTo}
                      onChange={(e) => setDateTo(e.target.value)}
                      className="min-w-0 rounded-lg border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-1.5 py-1.5 text-[11px] text-[var(--wa-text)] shadow-sm outline-none focus:border-[#25D366]/45 focus:ring-2 focus:ring-[#25D366]/15"
                      title="Hasta (UTC)"
                    />
                  </label>
                </div>
                <div className="flex gap-2 pt-0.5">
                  <button
                    type="button"
                    onClick={applyFilters}
                    className="flex flex-1 items-center justify-center gap-2 rounded-lg bg-[#25D366] px-2 py-2.5 text-[13px] font-semibold text-white shadow-[0_2px_6px_-1px_rgba(37,211,102,0.45)] transition hover:bg-[#20bd5a] active:scale-[0.99]"
                  >
                    <IconBolt className="h-4 w-4 opacity-90" />
                    Aplicar
                  </button>
                  <button
                    type="button"
                    onClick={clearFilters}
                    className="rounded-lg border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-2 text-[12px] font-semibold text-[var(--wa-text-muted)] shadow-sm transition hover:bg-[var(--wa-panel-hover)]"
                  >
                    Limpiar
                  </button>
                </div>
              </div>
            </div>
          </div>

          {fetchErr ? (
            <p className="mt-2 flex items-start gap-2 rounded-lg border border-red-100 bg-red-50/95 px-2.5 py-2 text-[11px] leading-snug text-red-800" role="alert">
              <span className="mt-0.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-red-500" />
              {fetchErr}
            </p>
          ) : null}
        </div>
        <nav className="wa-scroll flex-1 overflow-y-auto" aria-busy={loading} aria-live="polite">
          {loading && fq ? (
            <ul className="divide-y divide-[var(--wa-border)] py-1" aria-hidden>
              {Array.from({ length: 7 }).map((_, i) => (
                <li key={i} className="flex items-center gap-3 px-3 py-3 md:px-3.5">
                  <div className="h-[52px] w-[52px] shrink-0 animate-pulse rounded-full bg-[var(--wa-border)] motion-reduce:animate-none" />
                  <div className="min-w-0 flex-1 space-y-2">
                    <div className="h-4 max-w-[65%] animate-pulse rounded-md bg-[var(--wa-border)] motion-reduce:animate-none" />
                    <div className="h-3 max-w-[40%] animate-pulse rounded-md bg-[var(--wa-header)] motion-reduce:animate-none" />
                  </div>
                </li>
              ))}
            </ul>
          ) : rows.length === 0 ? (
            <div className="flex flex-col items-center px-5 py-12 text-center">
              <div className="mb-5 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-br from-[#e7fce3] to-[#d4f4e1] text-[#008069] shadow-[inset_0_1px_0_rgba(255,255,255,0.75),0_8px_28px_-10px_rgba(0,128,105,0.25)] ring-1 ring-[#b9e6c9]">
                <IconInboxEmpty className="h-11 w-11 opacity-90" />
              </div>
              {fq ? (
                <p className="max-w-xs text-[14px] font-medium text-[var(--wa-text)]">Nada coincide con ese filtro</p>
              ) : (
                <>
                  <p className="text-[16px] font-semibold text-[var(--wa-text)]">Tu bandeja está lista</p>
                  <p className="mt-2 max-w-sm text-[14px] leading-relaxed text-[var(--wa-text-muted)]">
                    Cuando llegue el primer mensaje de WhatsApp vía Twilio, verás la conversación aquí al instante.
                  </p>
                  <ol className="mt-6 w-full max-w-sm space-y-3 text-left text-[13px] text-[var(--wa-text-muted)]">
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--wa-card-bg)] text-[12px] font-bold text-[#008069] shadow-sm ring-1 ring-[var(--wa-border)]">
                        1
                      </span>
                      <span>
                        Configura el webhook en{" "}
                        <Link href="/configuracion" className="font-semibold text-[var(--wa-link)] underline decoration-[var(--wa-link)]/30 underline-offset-2 hover:decoration-[var(--wa-link)]">
                          Ajustes
                        </Link>
                        .
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--wa-card-bg)] text-[12px] font-bold text-[#008069] shadow-sm ring-1 ring-[var(--wa-border)]">
                        2
                      </span>
                      <span>
                        Verifica la API en{" "}
                        <Link href="/estado" className="font-semibold text-[var(--wa-link)] underline decoration-[var(--wa-link)]/30 underline-offset-2 hover:decoration-[var(--wa-link)]">
                          Estado
                        </Link>
                        .
                      </span>
                    </li>
                    <li className="flex gap-3">
                      <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--wa-card-bg)] text-[12px] font-bold text-[#008069] shadow-sm ring-1 ring-[var(--wa-border)]">
                        3
                      </span>
                      <span>Prueba con el sandbox de WhatsApp y espera unos segundos.</span>
                    </li>
                  </ol>
                </>
              )}
            </div>
          ) : (
            <ul className="py-1">
              {rows.map((r) => {
                const title = waChatTitle(r.twilio_from);
                const glyph = waAvatarGlyph(r.twilio_from);
                const hue = waAvatarHue(r.twilio_from);
                const isActive = r.id === activeId;
                const when = new Date(r.updated_at);
                const timeStr =
                  when.toDateString() === new Date().toDateString()
                    ? when.toLocaleTimeString(undefined, { hour: "2-digit", minute: "2-digit" })
                    : when.toLocaleDateString(undefined, { day: "numeric", month: "short" });
                const rel = formatRelativeActivity(r.updated_at);
                const llmBad = (r.last_agent_llm_status || "ok").toLowerCase() !== "ok";
                const llmTitle = llmBad
                  ? [
                      "El asistente automático falló en la última respuesta.",
                      r.last_agent_llm_error_snippet ? `Detalle: ${r.last_agent_llm_error_snippet}` : "",
                      "Revisa Motor de IA en Ajustes (clave, modelo, cuotas).",
                    ]
                      .filter(Boolean)
                      .join(" ")
                  : "Última respuesta del modelo: correcta.";
                const pending = Boolean(r.has_pending_handoff);
                const unread = conversationLooksUnread(r.id, r.updated_at, r.last_message_direction);
                const preview = (r.last_message_preview ?? "").trim();

                return (
                  <li key={r.id}>
                    <Link
                      href={`/chats/${r.id}${tailQs}`}
                      scroll={false}
                      className={[
                        "group flex items-center gap-3 px-3 py-2.5 transition-all duration-200 md:px-3.5 md:py-3",
                        isActive ? "wa-chat-row-active bg-[var(--wa-header)]" : "hover:bg-[var(--wa-panel-hover)]",
                      ].join(" ")}
                    >
                      <div
                        className="relative flex h-[52px] w-[52px] shrink-0 items-center justify-center rounded-full text-[15px] font-bold text-white shadow-md ring-2 ring-white transition group-hover:scale-[1.02] group-hover:shadow-lg"
                        style={{
                          background: `linear-gradient(145deg, hsl(${hue},58%,44%), hsl(${(hue + 42) % 360},52%,30%))`,
                        }}
                        aria-hidden
                      >
                        {glyph}
                        {pending ? (
                          <span
                            className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[1rem] items-center justify-center rounded-full bg-[#f59e0b] px-0.5 text-[9px] font-bold text-white ring-2 ring-white"
                            title="Escalado pendiente"
                          >
                            !
                          </span>
                        ) : null}
                        {unread ? (
                          <span
                            className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-[#25D366]"
                            title="Mensajes nuevos"
                          />
                        ) : null}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="truncate text-[16px] font-medium text-[var(--wa-text)]">{title}</span>
                          <div className="flex shrink-0 flex-col items-end gap-0.5">
                            <time
                              className="text-[11px] font-medium tabular-nums text-[var(--wa-text-muted)]"
                              dateTime={r.updated_at}
                            >
                              {timeStr}
                            </time>
                            {rel ? (
                              <span className="text-[10px] font-medium text-[var(--wa-text-muted)]" title="Actividad">
                                {rel}
                              </span>
                            ) : null}
                          </div>
                        </div>
                        <p className="mt-0.5 line-clamp-1 text-[13px] leading-snug text-[var(--wa-text-muted)]" title={preview || undefined}>
                          {preview ? (
                            <>
                              {r.last_message_direction === "inbound" ? (
                                <span className="font-medium text-[var(--wa-text)]/90">↩ </span>
                              ) : r.last_message_direction === "outbound" ? (
                                <span className="font-medium text-[#008069]/90">↪ </span>
                              ) : null}
                              {preview}
                            </>
                          ) : (
                            <span className="text-[var(--wa-text-muted)]">Sin vista previa</span>
                          )}
                        </p>
                        <p className="mt-0.5 flex flex-wrap items-center gap-1.5 text-[13px] text-[var(--wa-text-muted)]">
                          <span
                            className={
                              r.status === "open"
                                ? "inline-block rounded-full bg-[#d9fdd3] px-1.5 py-px text-[10px] font-semibold uppercase tracking-wide text-[#008069]"
                                : "text-[10px] uppercase text-[var(--wa-text-muted)]"
                            }
                          >
                            {r.status}
                          </span>
                          {pending ? (
                            <span className="rounded-full bg-[#fff8e6] px-1.5 py-px text-[9px] font-bold uppercase tracking-wide text-[#b45309] ring-1 ring-[#fde68a]">
                              Esc
                            </span>
                          ) : null}
                          <span
                            className="inline-flex shrink-0 items-center gap-0.5 rounded-full border px-1 py-px text-[9px] font-bold uppercase tracking-wide"
                            style={{
                              color: llmBad ? "#b91c1c" : "#008069",
                              background: llmBad ? "#fee2e2" : "#e7fce3",
                              borderColor: llmBad ? "#fecaca" : "#b9e6c9",
                            }}
                            title={llmTitle}
                          >
                            {llmBad ? "IA" : "OK"}
                          </span>
                          <span className="truncate text-[var(--wa-text-muted)]">{r.message_count} msg</span>
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </nav>
      </aside>

      <main className="relative flex min-h-0 min-w-0 flex-1 flex-col border-l border-[var(--wa-border)] bg-[var(--wa-bg)] md:border-l-0">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_30%_0%,rgba(255,255,255,0.35),transparent_50%)]" aria-hidden />
        <div className="relative flex min-h-0 flex-1 flex-col">{children}</div>
      </main>
    </div>
  );
}
