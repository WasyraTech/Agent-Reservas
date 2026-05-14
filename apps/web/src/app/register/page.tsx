"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useState } from "react";

import { readApiError } from "@/lib/read-api-error";

function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/chats";

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [msg, setMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    setMsg(null);
    setLoading(true);
    try {
      const res = await fetch("/api/internal/panel/auth/register/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phone.trim(),
          business_name: businessName.trim(),
        }),
      });
      if (!res.ok) {
        setMsg(await readApiError(res));
        return;
      }
      setStep("code");
      setMsg(
        "Te enviamos un código por WhatsApp (Twilio Verify). Úsalo abajo para crear tu negocio y entrar al panel.",
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
      const res = await fetch("/api/internal/panel/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phone.trim(),
          code: code.trim(),
          business_name: businessName.trim(),
        }),
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
          Crear tu negocio
        </h1>
        <p className="mt-1 text-sm text-[var(--wa-text-muted)]">
          Cada número crea un espacio aislado (tu WhatsApp de negocio, citas y chats). Después podrás configurar
          Twilio y la IA en Ajustes.
        </p>

        {step === "form" ? (
          <form className="mt-6 space-y-4" onSubmit={onSendCode}>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--wa-text-muted)]">
              Nombre del negocio
              <input
                type="text"
                autoComplete="organization"
                placeholder="Ej. Peluquería Ana"
                value={businessName}
                onChange={(e) => setBusinessName(e.target.value)}
                className="mt-1 w-full rounded-lg border border-[var(--wa-border)] bg-black/20 px-3 py-2 text-sm text-[var(--wa-text)] outline-none ring-[var(--wa-accent)]/40 focus:ring-2"
                required
                minLength={2}
                maxLength={120}
              />
            </label>
            <label className="block text-xs font-medium uppercase tracking-wide text-[var(--wa-text-muted)]">
              Tu WhatsApp (E.164)
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
            <p className="text-xs text-[var(--wa-text-muted)]">
              Negocio: <span className="text-[var(--wa-text)]">{businessName}</span> · Teléfono: {phone}
            </p>
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
              {loading ? "Creando cuenta…" : "Crear cuenta y entrar"}
            </button>
            <button
              type="button"
              className="w-full text-xs text-[var(--wa-link)] underline"
              onClick={() => {
                setStep("form");
                setCode("");
                setMsg(null);
              }}
            >
              Volver
            </button>
          </form>
        )}

        {msg ? (
          <p className="mt-4 whitespace-pre-wrap text-sm leading-relaxed text-[var(--wa-text-muted)]">{msg}</p>
        ) : null}

        <p className="mt-6 text-center text-xs text-[var(--wa-text-muted)]">
          ¿Ya tienes cuenta?{" "}
          <Link href="/login" className="text-[var(--wa-link)] underline">
            Iniciar sesión
          </Link>
        </p>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-[40vh] items-center justify-center text-sm text-[var(--wa-text-muted)]">
          Cargando…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
