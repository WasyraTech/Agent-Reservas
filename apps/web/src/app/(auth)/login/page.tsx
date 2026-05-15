"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

import { AuthPremiumRoot } from "@/components/auth/auth-premium-layout";
import {
  AuthChatsShortcut,
  AuthFieldLabel,
  AuthFormEyebrow,
  AuthFormSubtitle,
  AuthFormTitle,
  AuthHomeLink,
  AuthInputWithIcon,
  AuthLinearSteps,
  AuthMessageModal,
  AuthMethodDivider,
  AuthPrimaryButton,
  AuthRememberRow,
  AuthTrustMicrocopy,
  IconChatWhatsApp,
  IconShieldCode,
} from "@/components/auth/AuthShell";
import { mapAuthApiErrorToFields } from "@/lib/auth-field-errors";
import { normalizePanelPhoneE164 } from "@/lib/phone-e164";
import { readApiError } from "@/lib/read-api-error";

const RESEND_COOLDOWN_SEC = 45;

type AlertDialog = { variant: "error" | "info"; title?: string; message: string };

function StepCaption({ step }: { step: "phone" | "code" }) {
  return (
    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
      {step === "phone" ? "Paso 1 · Número" : "Paso 2 · Código"}
    </p>
  );
}

function LoginForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/chats";
  const registerHref = `/register?next=${encodeURIComponent(next)}`;

  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"phone" | "code">("phone");
  const [alertDialog, setAlertDialog] = useState<AlertDialog | null>(null);
  const [phoneError, setPhoneError] = useState<string | null>(null);
  const [codeError, setCodeError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [resendSec, setResendSec] = useState(0);

  useEffect(() => {
    if (resendSec <= 0) return;
    const t = window.setInterval(() => {
      setResendSec((s) => (s <= 1 ? 0 : s - 1));
    }, 1000);
    return () => window.clearInterval(t);
  }, [resendSec]);

  function clearPhoneErrors() {
    setPhoneError(null);
    setAlertDialog(null);
  }

  function clearCodeErrors() {
    setCodeError(null);
    setAlertDialog(null);
  }

  async function postStartCode(): Promise<boolean> {
    let phoneE164: string;
    try {
      phoneE164 = normalizePanelPhoneE164(phone.trim());
    } catch (e) {
      setAlertDialog({
        variant: "error",
        title: "Teléfono",
        message: e instanceof Error ? e.message : "Número no válido.",
      });
      return false;
    }

    const res = await fetch("/api/internal/panel/auth/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone_e164: phoneE164 }),
    });
    if (!res.ok) {
      const detail = await readApiError(res);
      const m = mapAuthApiErrorToFields(detail, { flow: "login", step: "phone" });
      setPhoneError(m.phone ?? null);
      setCodeError(null);
      setAlertDialog({ variant: "error", title: "No se pudo enviar el código", message: detail });
      return false;
    }
    setPhone(phoneE164);
    return true;
  }

  async function onSendCode(e: React.FormEvent) {
    e.preventDefault();
    clearPhoneErrors();
    setLoading(true);
    try {
      const ok = await postStartCode();
      if (!ok) return;
      setStep("code");
      setAlertDialog({
        variant: "info",
        title: "Código enviado",
        message:
          "Si ya tienes negocio con este número, deberías recibir el código por WhatsApp en segundos. Revisa también solicitudes o spam.",
      });
    } catch (err) {
      setAlertDialog({
        variant: "error",
        title: "Error de red",
        message: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onResendCode() {
    if (loading || resendSec > 0) return;
    clearCodeErrors();
    setLoading(true);
    try {
      const ok = await postStartCode();
      if (!ok) return;
      setAlertDialog({
        variant: "info",
        title: "Código reenviado",
        message: "Te enviamos otro código por WhatsApp.",
      });
      setResendSec(RESEND_COOLDOWN_SEC);
    } catch (err) {
      setAlertDialog({
        variant: "error",
        title: "Error de red",
        message: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setLoading(false);
    }
  }

  async function onVerify(e: React.FormEvent) {
    e.preventDefault();
    setCodeError(null);
    setPhoneError(null);
    setAlertDialog(null);
    setLoading(true);
    try {
      let phoneE164: string;
      try {
        phoneE164 = normalizePanelPhoneE164(phone.trim());
      } catch (e) {
        setAlertDialog({
          variant: "error",
          title: "Teléfono",
          message: e instanceof Error ? e.message : "Número no válido.",
        });
        return;
      }

      const res = await fetch("/api/internal/panel/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phoneE164,
          code: code.trim(),
          remember_me: rememberMe,
        }),
      });
      if (!res.ok) {
        const detail = await readApiError(res);
        const m = mapAuthApiErrorToFields(detail, { flow: "login", step: "code" });
        setPhoneError(m.phone ?? null);
        setCodeError(m.code ?? null);
        setAlertDialog({
          variant: "error",
          title: res.status === 503 ? "Servicio no disponible" : "No se pudo entrar",
          message: detail,
        });
        return;
      }
      await res.json().catch(() => ({}));
      router.replace(next);
      router.refresh();
    } catch (err) {
      setAlertDialog({
        variant: "error",
        title: "Error de red",
        message: err instanceof Error ? err.message : "Error de red",
      });
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <AuthPremiumRoot
        mode="login"
        crossHref={registerHref}
        crossLabel="Crear cuenta"
        crossHint="¿Primera vez en Agent Reservas?"
        topBar={
          <div className="mb-2 flex flex-wrap items-center gap-2 sm:mb-3 sm:gap-2.5">
            <div className="flex min-w-0 items-center gap-2">
              <AuthHomeLink />
              <AuthChatsShortcut href={next} />
            </div>
          </div>
        }
      >
        <div className="flex w-full max-w-full flex-col">
          <div className="shrink-0 flex flex-col gap-0.5 sm:gap-1">
            <AuthFormEyebrow>Acceso al panel</AuthFormEyebrow>
            <AuthFormTitle align="start" size="display">
              {step === "phone" ? "Hola de nuevo" : "Casi listo"}
            </AuthFormTitle>
            <AuthFormSubtitle align="start" className="mt-0 text-[12px] leading-snug sm:text-[13px]">
              {step === "phone" ? (
                <>
                  Entra con un <span className="font-medium text-[#008069]">código por WhatsApp</span> (Twilio Verify).
                  Puedes usar +51… o solo 9 dígitos móvil (9…).
                </>
              ) : (
                <>
                  Código enviado a <span className="font-medium text-slate-800">{phone}</span>. Revísalo en WhatsApp e
                  introdúcelo abajo.
                </>
              )}
            </AuthFormSubtitle>
            <AuthLinearSteps stepIndex={step === "phone" ? 0 : 1} />
            <StepCaption step={step} />
          </div>

          <div className="mt-1.5 w-full shrink-0 sm:mt-2">
            {step === "phone" ? (
              <form className="flex w-full flex-col gap-2 py-0.5 sm:gap-2.5 sm:py-1" onSubmit={onSendCode}>
                <AuthMethodDivider>Acceso con tu número</AuthMethodDivider>
                <div>
                  <AuthFieldLabel>Teléfono del negocio</AuthFieldLabel>
                  <AuthInputWithIcon
                    type="tel"
                    autoComplete="tel"
                    placeholder="+51999888777 o 999888777"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      clearPhoneErrors();
                    }}
                    icon={<IconChatWhatsApp className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" />}
                    error={phoneError}
                    required
                  />
                </div>
                <AuthRememberRow id="login-remember-phone" checked={rememberMe} onChange={setRememberMe} dense />
                <AuthPrimaryButton busy={loading}>Enviar código</AuthPrimaryButton>
                <AuthTrustMicrocopy className="mt-2.5" />
              </form>
            ) : (
              <form className="flex w-full flex-col gap-2 py-0.5 sm:gap-2.5 sm:py-1" onSubmit={onVerify}>
                <AuthMethodDivider>Código de verificación</AuthMethodDivider>
                <p className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white px-3 py-2 text-left text-[12px] text-slate-600 shadow-sm sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:text-sm">
                  <span className="block text-[9px] font-bold uppercase tracking-[0.14em] text-slate-400 sm:text-[10px]">
                    Destino
                  </span>
                  <span className="mt-0.5 block break-all font-semibold tracking-tight text-[var(--wa-text)]">{phone}</span>
                </p>
                {phoneError ? (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2 text-[11px] font-medium leading-snug text-red-800 sm:text-xs"
                  >
                    {phoneError}
                  </p>
                ) : null}
                <div>
                  <AuthFieldLabel>Código de verificación</AuthFieldLabel>
                  <AuthInputWithIcon
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    placeholder="Código de WhatsApp"
                    value={code}
                    onChange={(e) => {
                      setCode(e.target.value);
                      clearCodeErrors();
                    }}
                    icon={<IconShieldCode className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" />}
                    error={codeError}
                    required
                  />
                </div>
                <AuthRememberRow id="login-remember-code" checked={rememberMe} onChange={setRememberMe} dense />
                <AuthPrimaryButton busy={loading}>Entrar al panel</AuthPrimaryButton>
                <AuthTrustMicrocopy className="mt-2.5" />
                <div className="flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:justify-center sm:gap-2.5">
                  <button
                    type="button"
                    disabled={loading || resendSec > 0}
                    className="min-h-[2.25rem] touch-manipulation text-center text-[12px] font-semibold text-[#008069] transition hover:underline enabled:active:scale-[0.99] disabled:cursor-not-allowed disabled:opacity-45 sm:min-h-[2.5rem] sm:text-sm"
                    onClick={() => void onResendCode()}
                  >
                    {resendSec > 0 ? `Reenviar código (${resendSec}s)` : "Reenviar código"}
                  </button>
                  <span className="hidden text-slate-300 sm:inline" aria-hidden>
                    ·
                  </span>
                  <button
                    type="button"
                    className="min-h-[2.25rem] shrink-0 touch-manipulation text-center text-[12px] font-semibold text-slate-600 transition hover:text-[#008069] hover:underline sm:min-h-[2.5rem] sm:text-sm"
                    onClick={() => {
                      setStep("phone");
                      setCode("");
                      setResendSec(0);
                      setCodeError(null);
                      setPhoneError(null);
                      setAlertDialog(null);
                    }}
                  >
                    Cambiar número
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </AuthPremiumRoot>

      <AuthMessageModal
        open={!!alertDialog}
        variant={alertDialog?.variant ?? "info"}
        title={alertDialog?.title}
        onClose={() => setAlertDialog(null)}
      >
        {alertDialog?.message}
      </AuthMessageModal>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#f0f2f5] text-sm text-[#667781]">
          Cargando…
        </div>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
