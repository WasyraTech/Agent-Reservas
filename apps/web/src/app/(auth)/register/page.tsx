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
  IconBrainChip,
  IconChatWhatsApp,
  IconShieldCode,
} from "@/components/auth/AuthShell";
import { mapAuthApiErrorToFields } from "@/lib/auth-field-errors";
import { normalizePanelPhoneE164 } from "@/lib/phone-e164";
import { readApiError } from "@/lib/read-api-error";

const RESEND_COOLDOWN_SEC = 45;

type AlertDialog = { variant: "error" | "info"; title?: string; message: string };

function StepCaption({ step }: { step: "form" | "code" }) {
  return (
    <p className="mt-1 text-[10px] font-medium uppercase tracking-[0.18em] text-slate-400 sm:text-[11px]">
      {step === "form" ? "Paso 1 · Datos" : "Paso 2 · Código"}
    </p>
  );
}

function RegisterForm() {
  const router = useRouter();
  const sp = useSearchParams();
  const nextRaw = sp.get("next");
  const next = nextRaw?.startsWith("/") ? nextRaw : "/chats";
  const loginHref = `/login?next=${encodeURIComponent(next)}`;

  const [businessName, setBusinessName] = useState("");
  const [phone, setPhone] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"form" | "code">("form");
  const [alertDialog, setAlertDialog] = useState<AlertDialog | null>(null);
  const [businessError, setBusinessError] = useState<string | null>(null);
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

  function clearFormErrors() {
    setBusinessError(null);
    setPhoneError(null);
    setAlertDialog(null);
  }

  function clearCodeErrors() {
    setCodeError(null);
    setAlertDialog(null);
  }

  async function postRegisterStart(): Promise<boolean> {
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

    const res = await fetch("/api/internal/panel/auth/register/start", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        phone_e164: phoneE164,
        business_name: businessName.trim(),
      }),
    });
    if (!res.ok) {
      const detail = await readApiError(res);
      const m = mapAuthApiErrorToFields(detail, { flow: "register", step: "details" });
      setBusinessError(m.business ?? null);
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
    clearFormErrors();
    setLoading(true);
    try {
      const ok = await postRegisterStart();
      if (!ok) return;
      setStep("code");
      setAlertDialog({
        variant: "info",
        title: "Código enviado",
        message:
          "Te enviamos un código por WhatsApp (Twilio Verify). Úsalo abajo para crear tu negocio y entrar al panel.",
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
      const ok = await postRegisterStart();
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
    setBusinessError(null);
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

      const res = await fetch("/api/internal/panel/auth/register/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone_e164: phoneE164,
          code: code.trim(),
          business_name: businessName.trim(),
          remember_me: rememberMe,
        }),
      });
      if (!res.ok) {
        const detail = await readApiError(res);
        const m = mapAuthApiErrorToFields(detail, { flow: "register", step: "verify" });
        setBusinessError(m.business ?? null);
        setPhoneError(m.phone ?? null);
        setCodeError(m.code ?? null);
        setAlertDialog({
          variant: "error",
          title: res.status === 503 ? "Servicio no disponible" : "No se pudo completar el registro",
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
        mode="register"
        crossHref={loginHref}
        crossLabel="Iniciar sesión"
        crossHint="¿Ya tienes cuenta en Agent Reservas?"
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
            <AuthFormEyebrow>Alta segura</AuthFormEyebrow>
            <AuthFormTitle align="start" size="display">
              {step === "form" ? "Crea tu espacio" : "Confirma y entra"}
            </AuthFormTitle>
            <AuthFormSubtitle align="start" className="mt-0 text-[12px] leading-snug sm:text-[13px]">
              {step === "form" ? (
                <>
                  Agente <span className="font-medium text-[#008069]">WhatsApp + IA</span> para citas y mensajes con
                  clientes. WhatsApp: +51… o 9 dígitos móvil (9…).
                </>
              ) : (
                <>Introduce el código que enviamos al número que indicaste.</>
              )}
            </AuthFormSubtitle>
            <AuthLinearSteps stepIndex={step === "form" ? 0 : 1} />
            <StepCaption step={step} />
          </div>

          <div className="mt-1.5 w-full shrink-0 sm:mt-2">
            {step === "form" ? (
              <form className="flex w-full flex-col gap-1.5 py-0.5 sm:gap-2 sm:py-1" onSubmit={onSendCode}>
                <AuthMethodDivider>Datos del negocio</AuthMethodDivider>
                <div>
                  <AuthFieldLabel>Nombre del negocio</AuthFieldLabel>
                  <AuthInputWithIcon
                    type="text"
                    autoComplete="organization"
                    placeholder="Ej. Peluquería Ana"
                    value={businessName}
                    onChange={(e) => {
                      setBusinessName(e.target.value);
                      setBusinessError(null);
                      setAlertDialog(null);
                    }}
                    icon={<IconBrainChip className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" />}
                    error={businessError}
                    required
                    minLength={2}
                    maxLength={120}
                  />
                </div>
                <div>
                  <AuthFieldLabel>Tu WhatsApp</AuthFieldLabel>
                  <AuthInputWithIcon
                    type="tel"
                    autoComplete="tel"
                    placeholder="+51999888777 o 999888777"
                    value={phone}
                    onChange={(e) => {
                      setPhone(e.target.value);
                      setPhoneError(null);
                      setAlertDialog(null);
                    }}
                    icon={<IconChatWhatsApp className="h-5 w-5 sm:h-[1.35rem] sm:w-[1.35rem]" />}
                    error={phoneError}
                    required
                  />
                </div>
                <AuthRememberRow id="register-remember-form" checked={rememberMe} onChange={setRememberMe} dense />
                <AuthPrimaryButton busy={loading}>Enviar código</AuthPrimaryButton>
                <AuthTrustMicrocopy className="mt-2.5" />
              </form>
            ) : (
              <form className="flex w-full flex-col gap-2 py-0.5 sm:gap-2.5 sm:py-1" onSubmit={onVerify}>
                <AuthMethodDivider>Código de verificación</AuthMethodDivider>
                <p className="rounded-xl border border-slate-200/70 bg-gradient-to-br from-slate-50 to-white px-3 py-2 text-left text-[12px] text-slate-600 shadow-sm sm:rounded-2xl sm:px-3.5 sm:py-2.5 sm:text-sm">
                  <span className="font-semibold tracking-tight text-[var(--wa-text)]">{businessName}</span>
                  <span className="text-slate-400"> · </span>
                  <span className="break-all font-medium text-slate-700">{phone}</span>
                </p>
                {businessError || phoneError ? (
                  <div className="flex flex-col gap-1.5" role="alert">
                    {businessError ? (
                      <p className="rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2 text-[11px] font-medium leading-snug text-red-800 sm:text-xs">
                        {businessError}
                      </p>
                    ) : null}
                    {phoneError ? (
                      <p className="rounded-xl border border-red-200/80 bg-red-50/95 px-3 py-2 text-[11px] font-medium leading-snug text-red-800 sm:text-xs">
                        {phoneError}
                      </p>
                    ) : null}
                  </div>
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
                <AuthRememberRow id="register-remember-code" checked={rememberMe} onChange={setRememberMe} dense />
                <AuthPrimaryButton busy={loading}>Crear cuenta y entrar</AuthPrimaryButton>
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
                      setStep("form");
                      setCode("");
                      setResendSec(0);
                      clearCodeErrors();
                      setBusinessError(null);
                      setPhoneError(null);
                      setAlertDialog(null);
                    }}
                  >
                    Volver y editar datos
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

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex h-full min-h-0 flex-1 items-center justify-center bg-[#f0f2f5] text-sm text-[#667781]">
          Cargando…
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}