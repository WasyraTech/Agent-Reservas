"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { readApiError } from "@/lib/read-api-error";

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/chats";

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/panel/auth/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_e164: phone.trim() }),
      });
      if (!res.ok) {
        setMsg(await readApiError(res));
        return;
      }
      setStep("code");
      setMsg(
        [
          "Si ya creaste tu negocio con este número, deberías recibir el código por WhatsApp en segundos.",
          "",
          "¿Primera vez? Crea tu cuenta en «Registrar negocio» (cada número tiene su propio espacio aislado).",
        ].join("\n"),
      );
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/panel/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone_e164: phone.trim(), code: code.trim() }),
      });
      if (!res.ok) {
        setMsg(await readApiError(res));
        return;
      }
      await res.json().catch(() => ({}));
      router.replace(next);
      router.refresh();
    } catch (err) {
      setMsg(err instanceof Error ? err.message : "Error de red");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-[calc(100vh-52px)] max-w-md flex-col justify-center px-4 py-12">
      <div className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-bg-elevated)] p-6 shadow-xl">
        <h1 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--wa-text)]">
          Iniciar sesión
        </h1>
        <p className="mt-1 text-sm text-[var(--wa-text-muted)]">
          Código por WhatsApp (Twilio Verify). Un número = un negocio; tus datos no se mezclan con otros usuarios.
        </p>

        {step === "phone" ? (
          <form className="mt-6 space-y-4" onSubmit={onSendCode}>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--wa-text-muted)]">
              Teléfono (E.164)
              <input
                type="tel"
                autoComplete="tel"
                placeholder="+51999888777"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--wa-border)] bg-black/20 px-3 py-2 text-sm text-[var(--wa-text)] outline-none ring-[var(--wa-accent)]/40 focus:ring-2"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--wa-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Enviando…" : "Enviar código por WhatsApp"}
            </button>
          </form>
        ) : (
          <form className="mt-6 flex flex-col gap-3" onSubmit={onVerify}>
            <p className="text-xs text-[var(--wa-text-muted)]">Teléfono: {phone}</p>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--wa-text-muted)]">
              Código
              <input
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                placeholder="Código de WhatsApp"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--wa-border)] bg-black/20 px-3 py-2 text-sm text-[var(--wa-text)] outline-none ring-[var(--wa-accent)]/40 focus:ring-2"
                required
              />
            </label>
            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg bg-[var(--wa-accent)] px-4 py-2.5 text-sm font-semibold text-white transition hover:opacity-95 disabled:opacity-50"
            >
              {loading ? "Comprobando…" : "Entrar"}
            </button>
            <button
              type="button"
              className="w-full text-xs text-[var(--wa-link)] underline"
              onClick={() => {
                setStep("phone");
                setCode("");
                setMsg(null);
              }}
            >
              Cambiar número
            </button>
          </form>
        )}

        {msg ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--wa-text-muted)]">{msg}</p>
        ) : null}

        <details className="mt-6 rounded-lg border border-[var(--wa-border)] bg-black/15 px-3 py-2 text-left">
          <summary className="cursor-pointer text-xs font-medium text-[var(--wa-text-muted)]">
            Quién configura Twilio
          </summary>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--wa-text-muted)]">
            El <strong className="text-[var(--wa-text)]">proveedor del software</strong> (quien aloja la API) configura
            en el servidor las credenciales de <strong className="text-[var(--wa-text)]">Twilio Verify</strong> para
            enviar los códigos de acceso por WhatsApp a cualquier usuario. Eso no lo ve el dueño del negocio.
          </p>
          <p className="mt-2 text-[11px] leading-relaxed text-[var(--wa-text-muted)]">
            Cada negocio, dentro del panel en <strong className="text-[var(--wa-text)]">Ajustes</strong>, configura
            sus propias credenciales de Twilio/OpenAI para el <strong className="text-[var(--wa-text)]">bot de
            WhatsApp de su negocio</strong> (mensajes con clientes). Son cosas distintas.
          </p>
        </details>

        <p className="mt-6 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 text-center text-xs text-[var(--wa-text-muted)]">
          <Link href="/register" className="text-[var(--wa-link)] underline">
            Registrar negocio
          </Link>
          <span aria-hidden className="text-white/20">
            ·
          </span>
          <Link href="/chats" className="text-[var(--wa-link)] underline">
            Volver al panel
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--wa-text-muted)]">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
