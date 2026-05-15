"use client";

import { createContext, useCallback, useContext, useMemo, useState } from "react";

import { IconCheckCircle, IconCircleAlert } from "@/components/panel-icons";

export type PanelToastKind = "ok" | "err" | "info";

type ToastItem = { id: number; message: string; kind: PanelToastKind };

type PushToast = (message: string, kind?: PanelToastKind) => void;

const PanelToastContext = createContext<PushToast>(() => {});

function toastDurationMs(kind: PanelToastKind) {
  if (kind === "err") return 5200;
  if (kind === "info") return 4000;
  return 3400;
}

export function PanelToastProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<ToastItem[]>([]);

  const push = useCallback<PushToast>((message, kind = "ok") => {
    const id = Date.now() + Math.random();
    const k = kind;
    setItems((prev) => [...prev, { id, message, kind: k }]);
    window.setTimeout(() => {
      setItems((prev) => prev.filter((t) => t.id !== id));
    }, toastDurationMs(k));
  }, []);

  const value = useMemo(() => push, [push]);

  return (
    <PanelToastContext.Provider value={value}>
      {children}
      <div
        className="pointer-events-none fixed inset-x-0 bottom-0 z-[280] flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-2 sm:pb-6"
        aria-live="polite"
        aria-relevant="additions text"
      >
        {items.map((t) => (
          <ToastSurface key={t.id} item={t} />
        ))}
      </div>
    </PanelToastContext.Provider>
  );
}

function ToastSurface({ item: t }: { item: ToastItem }) {
  const isErr = t.kind === "err";
  const isInfo = t.kind === "info";
  const shell = isErr
    ? "border border-red-400/35 bg-[#1f1416] text-red-50 shadow-[0_12px_32px_-12px_rgba(0,0,0,0.55)]"
    : isInfo
      ? "border border-[var(--wa-border)] bg-[var(--wa-card-bg)] text-[var(--wa-text)] shadow-[0_12px_32px_-12px_rgba(11,20,26,0.25)] dark:shadow-[0_12px_32px_-12px_rgba(0,0,0,0.45)]"
      : "border border-[#e9edef]/80 bg-[#111b21] text-white shadow-[0_12px_32px_-12px_rgba(11,20,26,0.45)]";

  return (
    <div
      className={[
        "wa-toast-in pointer-events-auto flex max-w-[min(100%,24rem)] items-start gap-2.5 rounded-2xl px-4 py-3 text-[14px] font-medium leading-snug",
        shell,
      ].join(" ")}
      role={isErr ? "alert" : "status"}
    >
      {isErr ? (
        <IconCircleAlert className="mt-0.5 h-5 w-5 shrink-0 text-red-300" />
      ) : (
        <IconCheckCircle
          className={[
            "mt-0.5 h-5 w-5 shrink-0",
            isInfo ? "text-[var(--wa-link)]" : "text-[#25D366]",
          ].join(" ")}
        />
      )}
      <span className="min-w-0 [overflow-wrap:anywhere]">{t.message}</span>
    </div>
  );
}

export function usePanelToast() {
  return useContext(PanelToastContext);
}
