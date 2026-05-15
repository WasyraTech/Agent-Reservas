import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";
import Link from "next/link";

/** Volver al sitio — control premium */
export function AuthHomeLink() {
  return (
    <Link
      href="/"
      aria-label="Volver al inicio"
      className="group inline-flex min-h-[2.75rem] min-w-[2.75rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/60 bg-white/90 text-slate-500 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] backdrop-blur-sm transition duration-200 hover:border-[#008069]/35 hover:bg-white hover:text-[#008069] hover:shadow-[0_10px_28px_-10px_rgba(0,128,105,0.28)] active:scale-[0.97]"
    >
      <svg viewBox="0 0 24 24" fill="none" className="h-[1.15rem] w-[1.15rem] transition-transform duration-200 group-hover:-translate-y-px" aria-hidden>
        <path
          d="M4 11 12 4l8 7v9a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9Z"
          stroke="currentColor"
          strokeWidth="1.75"
          strokeLinejoin="round"
        />
      </svg>
    </Link>
  );
}

/** Acceso al panel (misma altura que la casita; texto truncable en móvil muy estrecho) */
export function AuthChatsShortcut({ href }: { href: string }) {
  return (
    <Link
      href={href}
      prefetch
      aria-label="Ir al panel de conversaciones"
      title="Ir al panel de conversaciones"
      className="inline-flex min-h-[2.75rem] min-w-0 max-w-[8.5rem] shrink-0 items-center justify-center rounded-2xl border border-slate-200/60 bg-white/90 px-2.5 text-center text-[10px] font-semibold leading-tight text-slate-600 shadow-[0_2px_10px_-4px_rgba(15,23,42,0.1)] backdrop-blur-sm transition duration-200 hover:border-[#008069]/35 hover:bg-white hover:text-[#008069] hover:shadow-[0_10px_28px_-10px_rgba(0,128,105,0.28)] active:scale-[0.97] min-[360px]:max-w-[10rem] min-[360px]:px-3 min-[360px]:text-[11px] sm:max-w-none sm:px-3.5 sm:text-xs"
    >
      <span className="truncate">Ir al panel</span>
    </Link>
  );
}

/** Alerta en modal (errores / avisos), encima del layout auth */
export function AuthMessageModal({
  open,
  variant,
  title,
  children,
  onClose,
}: {
  open: boolean;
  variant: "error" | "info";
  title?: string;
  children: ReactNode;
  onClose: () => void;
}) {
  if (!open) return null;
  const shell =
    variant === "error"
      ? "border-red-200/90 bg-gradient-to-b from-red-50/98 to-white shadow-[0_24px_48px_-20px_rgba(127,29,29,0.35)]"
      : "border-emerald-200/90 bg-gradient-to-b from-emerald-50/98 to-white shadow-[0_24px_48px_-20px_rgba(5,95,70,0.22)]";
  const btn =
    variant === "error"
      ? "bg-gradient-to-b from-[#25D366] to-[#128C7E] text-white hover:from-[#2fe077] hover:to-[#0f766e]"
      : "border border-emerald-200/80 bg-white text-emerald-900 hover:bg-emerald-50/90";

  return (
    <div
      className="fixed inset-0 z-[200] flex items-end justify-center p-0 sm:items-center sm:p-4"
      role="alertdialog"
      aria-modal="true"
      aria-labelledby={title ? "auth-msg-modal-title" : undefined}
    >
      <button
        type="button"
        className="absolute inset-0 bg-[#0b141a]/50 backdrop-blur-[3px] sm:bg-[#0b141a]/45"
        aria-label="Cerrar mensaje"
        onClick={onClose}
      />
      <div
        className={[
          "relative z-10 flex max-h-[min(78dvh,520px)] w-full max-w-md flex-col gap-3 rounded-t-[1.35rem] border p-4 pb-[max(1rem,env(safe-area-inset-bottom))] shadow-2xl sm:rounded-2xl sm:p-5",
          shell,
        ].join(" ")}
      >
        {title ? (
          <h2 id="auth-msg-modal-title" className="text-base font-semibold tracking-tight text-[var(--wa-text)] sm:text-lg">
            {title}
          </h2>
        ) : (
          <h2 className="sr-only">{variant === "error" ? "Error" : "Aviso"}</h2>
        )}
        <div className="min-h-0 flex-1 overflow-y-auto text-[13px] leading-relaxed text-[var(--wa-text-muted)] sm:text-sm">{children}</div>
        <button
          type="button"
          className={[
            "flex min-h-[2.75rem] w-full items-center justify-center rounded-2xl px-4 text-sm font-semibold transition active:scale-[0.99]",
            btn,
          ].join(" ")}
          onClick={onClose}
        >
          Entendido
        </button>
      </div>
    </div>
  );
}

/** Rótulo pequeño sobre el título (jerarquía editorial) */
export function AuthFormEyebrow({ children }: { children: ReactNode }) {
  return (
    <p className="mb-0.5 text-[10px] font-semibold uppercase tracking-[0.28em] text-[#008069] sm:text-[11px] sm:tracking-[0.3em]">
      {children}
    </p>
  );
}

/** Marca AR + titular (login / registro) */
export function AuthBrandMarque({ headline, tagline }: { headline: string; tagline: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col items-end">
      <div className="flex items-center gap-2.5">
        <div className="relative flex h-10 w-10 shrink-0 items-center justify-center overflow-hidden rounded-[11px] bg-gradient-to-br from-[#25D366] via-[#008069] to-[#075E54] text-[11px] font-bold tracking-tight text-white shadow-[0_4px_14px_-2px_rgba(0,128,105,0.45),inset_0_1px_0_rgba(255,255,255,0.35)] ring-1 ring-white/25">
          <span className="relative z-10">AR</span>
          <span className="pointer-events-none absolute inset-0 bg-gradient-to-tr from-transparent via-white/10 to-transparent" aria-hidden />
        </div>
        <span className="truncate text-[0.9375rem] font-semibold tracking-[-0.02em] text-[var(--wa-text)] sm:text-base">{headline}</span>
      </div>
      <span className="mt-1 hidden max-w-[16rem] text-right text-[10px] font-semibold uppercase leading-tight tracking-[0.2em] text-slate-400 sm:block sm:text-[11px]">
        {tagline}
      </span>
    </div>
  );
}

export function AuthFormTitle({
  children,
  align = "center",
  size = "default",
  className = "",
}: {
  children: ReactNode;
  /** "start" = bloque tipo SaaS / plantillas split (Figma login) */
  align?: "center" | "start";
  /** "display" = titular premium más grande en auth */
  size?: "default" | "display";
  className?: string;
}) {
  const alignCls = align === "start" ? "text-left" : "text-center";
  const sizeCls =
    size === "display"
      ? "text-[clamp(1.5rem,3.8vw,2.05rem)] font-semibold leading-[1.08] tracking-[-0.045em] text-pretty sm:text-[clamp(1.65rem,3.2vw,2.15rem)] lg:text-[clamp(1.55rem,2.2vw,2rem)]"
      : "text-[clamp(1.25rem,2.5vw,1.7rem)] font-medium leading-[1.15] tracking-[-0.02em] sm:text-2xl lg:text-[clamp(1.4rem,2.1vw,1.85rem)]";
  return (
    <h1 className={`text-[var(--wa-text)] ${sizeCls} ${alignCls} ${className}`.trim()}>
      {children}
    </h1>
  );
}

export function AuthFormSubtitle({
  children,
  align = "center",
  className = "",
}: {
  children: ReactNode;
  align?: "center" | "start";
  className?: string;
}) {
  const alignCls =
    align === "start"
      ? "mx-0 max-w-[min(100%,26rem)] text-left"
      : "mx-auto mt-2 max-w-[22rem] text-center";
  return (
    <p
      className={`mt-0 text-[13px] leading-relaxed text-[var(--wa-text-muted)] sm:text-[0.9375rem] sm:leading-relaxed ${alignCls} text-pretty ${className}`.trim()}
    >
      {children}
    </p>
  );
}

/** Línea + rótulo (equivalente visual a “OR continue with email” en plantillas login) */
export function AuthMethodDivider({ children }: { children: ReactNode }) {
  return (
    <div className="relative my-1.5 flex items-center gap-2 sm:my-2">
      <div className="h-px flex-1 bg-gradient-to-r from-transparent via-slate-200/80 to-slate-200/50" aria-hidden />
      <span className="shrink-0 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-1 text-[9px] font-semibold uppercase tracking-[0.16em] text-slate-500 shadow-[0_1px_2px_rgba(15,23,42,0.04)] sm:px-3 sm:text-[10px] sm:tracking-[0.18em]">
        {children}
      </span>
      <div className="h-px flex-1 bg-gradient-to-l from-transparent via-slate-200/80 to-slate-200/50" aria-hidden />
    </div>
  );
}

/** Fondo auth (compat layouts simples) — alineado con paleta premium */
export function AuthPageBackground({ children }: { children: ReactNode }) {
  return (
    <div className="relative isolate flex h-full min-h-0 flex-1 flex-col overflow-hidden bg-[#dadbd7] pt-[max(0px,env(safe-area-inset-top))] pb-[max(0px,env(safe-area-inset-bottom))]">
      <div
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(120%_85%_at_50%_-15%,rgba(255,255,255,0.65)_0%,transparent_52%)]"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/45 via-[#f0f2f5]/95 to-[#25D366]/[0.06]"
        aria-hidden
      />
      <div className="auth-premium-grain pointer-events-none absolute inset-0 opacity-[0.05]" aria-hidden />
      <div
        className="pointer-events-none absolute -left-32 top-0 h-[24rem] w-[24rem] rounded-full bg-[#25D366]/14 blur-3xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-24 -right-20 h-[28rem] w-[28rem] rounded-full bg-emerald-900/12 blur-3xl"
        aria-hidden
      />
      <div className="relative z-10 flex min-h-0 flex-1 flex-col">{children}</div>
    </div>
  );
}

/** Panel derecho (o izquierdo si reverse): azul con formas fluidas y patrón sutil */
export function AuthBluePanel({
  title,
  subtitle,
  buttonHref,
  buttonLabel,
  reverse = false,
}: {
  title: string;
  subtitle: string;
  buttonHref: string;
  buttonLabel: string;
  /** Panel a la izquierda (registro): bordes redondeados a la izquierda */
  reverse?: boolean;
}) {
  const radius = reverse
    ? "rounded-[1.25rem] shadow-[12px_0_40px_-12px_rgba(5,80,60,0.18)] lg:rounded-l-[1.35rem] lg:rounded-r-none"
    : "rounded-[1.25rem] shadow-[-12px_0_40px_-12px_rgba(5,80,60,0.18)] lg:rounded-r-[1.35rem] lg:rounded-l-none";

  return (
    <div
      className={`relative flex h-full min-h-[12rem] w-full flex-col justify-center self-stretch overflow-hidden p-7 text-white sm:min-h-[13rem] sm:p-8 lg:min-h-0 lg:max-w-none lg:p-9 xl:p-10 ${radius}`}
      style={{
        background:
          "linear-gradient(168deg, #128C7E 0%, #008069 42%, #075E54 78%, #064e43 100%)",
      }}
    >
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/[0.14] via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.06]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M30 0L30 60M0 30L60 30' stroke='%23fff' stroke-width='0.5' fill='none'/%3E%3C/svg%3E")`,
        }}
        aria-hidden
      />
      <div className="pointer-events-none absolute -right-24 -top-24 h-72 w-72 rounded-[45%] bg-white/12 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute -bottom-36 -left-20 h-[22rem] w-[22rem] rounded-[50%] bg-black/25 blur-3xl" aria-hidden />
      <div className="pointer-events-none absolute bottom-0 right-0 h-52 w-72 rounded-tl-[100%] bg-white/[0.07]" aria-hidden />
      <div
        className="pointer-events-none absolute inset-0 ring-1 ring-inset ring-white/10"
        aria-hidden
      />

      <div
        className={[
          "relative z-10 flex flex-col",
          reverse ? "items-center text-center lg:items-end lg:text-right" : "items-center text-center lg:items-start lg:text-left",
        ].join(" ")}
      >
        <div
          className={`mb-5 flex lg:mb-6 ${reverse ? "justify-center lg:justify-end" : "justify-center lg:justify-start"}`}
        >
          <div className="rounded-2xl border border-white/20 bg-white/[0.08] p-3.5 shadow-[inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-md">
            <IconBotSpark className="h-11 w-11 text-white drop-shadow-md sm:h-12 sm:w-12" />
          </div>
        </div>
        <h2 className="max-w-[20ch] text-xl font-semibold uppercase tracking-[0.14em] text-white drop-shadow-sm sm:text-2xl lg:max-w-none lg:text-[clamp(1.05rem,2vw,1.5rem)] lg:leading-snug lg:tracking-[0.16em]">
          {title}
        </h2>
        <p className="mt-3 max-w-[22rem] text-[13px] leading-relaxed text-white/[0.88] sm:mt-4 sm:max-w-xs sm:text-sm lg:mt-3.5 lg:text-[13px] lg:leading-relaxed">
          {subtitle}
        </p>
        <Link
          prefetch
          href={buttonHref}
          className="mt-7 inline-flex min-h-[2.875rem] touch-manipulation items-center justify-center rounded-xl border border-white/40 bg-white/[0.12] px-7 py-2.5 text-[11px] font-bold uppercase tracking-[0.2em] text-white shadow-[0_8px_24px_-6px_rgba(0,0,0,0.35),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-sm transition duration-200 hover:border-white/55 hover:bg-white/[0.2] hover:shadow-[0_12px_28px_-8px_rgba(0,0,0,0.4)] active:scale-[0.98] sm:mt-8 sm:min-h-[3rem] sm:px-9 sm:text-xs lg:mt-7"
        >
          {buttonLabel}
        </Link>
      </div>
    </div>
  );
}

/** Columna blanca con sombra; opcional solapamiento en desktop */
export function AuthWhiteCard({
  children,
  overlap = "left",
}: {
  children: ReactNode;
  /** Solapamiento sobre el panel azul */
  overlap?: "left" | "right";
}) {
  const overlapCls =
    overlap === "left"
      ? "lg:-mr-5 lg:max-w-[min(100%,min(420px,44vw))] xl:-mr-7 xl:max-w-[420px]"
      : "lg:-ml-5 lg:max-w-[min(100%,min(420px,44vw))] xl:-ml-7 xl:max-w-[420px]";
  return (
    <div
      className={`relative z-20 flex max-h-full min-h-0 w-full max-w-md flex-col overflow-hidden rounded-[1.25rem] border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-6 text-[var(--wa-text)] shadow-[0_1px_0_rgba(255,255,255,0.06)_inset,0_32px_64px_-28px_rgba(15,23,42,0.14)] ring-1 ring-[var(--wa-border)]/40 sm:max-w-[min(100%,26.5rem)] sm:rounded-[1.35rem] sm:p-8 lg:p-7 xl:p-8 ${overlapCls}`}
    >
      <div
        className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-[var(--wa-border)] to-transparent opacity-80"
        aria-hidden
      />
      {children}
    </div>
  );
}

export function AuthSplitColumns({
  whiteCard,
  bluePanel,
  reverse = false,
}: {
  whiteCard: ReactNode;
  bluePanel: ReactNode;
  /** Escritorio: panel azul a la izquierda, formulario a la derecha (móvil: siempre formulario arriba) */
  reverse?: boolean;
}) {
  return (
    <div
      className={[
        "mx-auto flex min-h-0 w-full max-w-[min(100%,1080px)] flex-1 flex-col items-stretch justify-center gap-[clamp(0.65rem,2vw,1.1rem)] px-[clamp(0.875rem,3vw,1.5rem)] py-[clamp(0.5rem,1.5vh,1rem)] sm:gap-4 sm:py-4 md:px-6 md:py-5 lg:max-h-full lg:flex-row lg:items-stretch lg:gap-[clamp(1rem,2.5vw,1.75rem)] lg:px-8 lg:py-4 xl:max-w-[min(100%,1180px)] xl:gap-6 xl:px-10 2xl:max-w-[min(100%,1280px)]",
        reverse ? "lg:flex-row-reverse" : "",
      ].join(" ")}
    >
      <div
        className={[
          "flex min-h-0 w-full min-w-0 shrink-0 justify-center lg:flex-[1_1_0%] lg:items-center",
          reverse ? "lg:justify-start lg:pl-0" : "lg:justify-end lg:pr-0",
        ].join(" ")}
      >
        {whiteCard}
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col justify-center lg:flex-[1_1_0%]">
        {bluePanel}
      </div>
    </div>
  );
}

export function AuthFieldLabel({ children }: { children: ReactNode }) {
  return (
    <span className="mb-1.5 block text-[10px] font-medium uppercase tracking-[0.14em] text-slate-500 sm:mb-2 sm:text-[11px] sm:tracking-[0.16em]">
      {children}
    </span>
  );
}

export function AuthRememberRow({
  id,
  checked,
  onChange,
  dense = false,
}: {
  id: string;
  checked: boolean;
  onChange: (next: boolean) => void;
  /** Menos padding y tipografía (pantallas auth compactas) */
  dense?: boolean;
}) {
  return (
    <label
      htmlFor={id}
      className={[
        "flex cursor-pointer select-none items-start rounded-2xl border border-slate-200/50 bg-white/55 shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] backdrop-blur-sm transition duration-200 hover:border-[#008069]/25 hover:bg-white/75 hover:shadow-[0_6px_20px_-12px_rgba(0,128,105,0.12)] active:scale-[0.995]",
        dense ? "gap-2 p-2 sm:gap-2 sm:p-2.5" : "gap-2.5 p-2.5 sm:gap-3 sm:p-3",
      ].join(" ")}
    >
      <input
        id={id}
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className={[
          "mt-0.5 shrink-0 rounded border-slate-300/90 text-[#008069] shadow-sm focus:ring-2 focus:ring-[#008069]/25",
          dense ? "h-4 w-4" : "h-[1.125rem] w-[1.125rem]",
        ].join(" ")}
      />
      <span className={["min-w-0 leading-snug text-slate-600", dense ? "text-xs sm:text-[13px]" : "text-sm"].join(" ")}>
        <span className="font-semibold text-[var(--wa-text)]">Mantener sesión conectada</span>
        <span
          className={[
            "mt-0.5 block font-normal leading-snug text-slate-500 line-clamp-2",
            dense ? "text-[10px] sm:text-[11px] sm:leading-relaxed" : "text-[11px] sm:text-xs sm:leading-relaxed",
          ].join(" ")}
        >
          Cookie de panel más larga en este navegador (hasta 60 días si la marcas; si no, unos 7 días).
        </span>
      </span>
    </label>
  );
}

/** Una línea de confianza (Twilio) — va debajo del CTA, no en el header del layout */
export function AuthTrustMicrocopy({ className = "" }: { className?: string }) {
  return (
    <p
      className={[
        "text-center text-[9px] font-medium leading-snug text-slate-400 sm:text-[10px]",
        className,
      ].join(" ")}
    >
      Verificación con <span className="font-semibold text-slate-500">Twilio Verify</span>
      <span className="text-slate-300"> · </span>
      Sin contraseña almacenada
    </p>
  );
}

/** Campo con icono + mensaje de error opcional */
export function AuthInputWithIcon({
  icon,
  error,
  ...props
}: InputHTMLAttributes<HTMLInputElement> & { icon: ReactNode; error?: string | null }) {
  const { className = "", ...rest } = props;
  const err = error?.trim();
  return (
    <div className="w-full">
      <div
        className={[
          "group flex min-h-[2.625rem] items-stretch overflow-hidden rounded-2xl border bg-gradient-to-b from-white to-slate-50/90 shadow-[inset_0_1px_0_rgba(255,255,255,0.95),0_2px_8px_-4px_rgba(15,23,42,0.06)] transition duration-200 sm:min-h-[2.75rem]",
          err
            ? "border-red-400/70 focus-within:border-red-500 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0_0_3px_rgba(248,113,113,0.15)]"
            : "border-slate-200/55 focus-within:border-[#008069]/40 focus-within:shadow-[inset_0_1px_0_rgba(255,255,255,1),0_0_0_3px_rgba(0,128,105,0.08),0_10px_28px_-12px_rgba(0,128,105,0.16)]",
        ].join(" ")}
      >
        <span
          className={[
            "flex shrink-0 items-center border-r bg-slate-50/80 px-3 transition-colors duration-200 sm:px-3.5",
            err ? "border-red-100 text-red-400" : "border-slate-100/80 text-slate-400 group-focus-within:text-[#008069]/70",
          ].join(" ")}
        >
          {icon}
        </span>
        <input
          {...rest}
          aria-invalid={err ? true : undefined}
          className={[
            "min-w-0 flex-1 border-0 bg-transparent py-2 pr-2.5 text-[16px] text-[var(--wa-text)] placeholder:text-slate-400 focus:outline-none focus:ring-0 sm:py-2.5 sm:pr-3 sm:text-[15px]",
            className,
          ].join(" ")}
        />
      </div>
      {err ? (
        <p className="mt-1.5 text-[11px] font-medium leading-snug text-red-600 sm:text-xs" role="alert">
          {err}
        </p>
      ) : null}
    </div>
  );
}

/** Barra de progreso (2 pasos) */
export function AuthLinearSteps({ stepIndex }: { stepIndex: 0 | 1 }) {
  return (
    <div className="mt-1.5 flex gap-1.5 sm:mt-2" role="presentation" aria-hidden>
      <div
        className={[
          "h-1 flex-1 rounded-full transition-colors duration-300",
          stepIndex >= 0 ? "bg-[#008069]" : "bg-slate-200/90",
        ].join(" ")}
      />
      <div
        className={[
          "h-1 flex-1 rounded-full transition-colors duration-300",
          stepIndex >= 1 ? "bg-[#008069]" : "bg-slate-200/90",
        ].join(" ")}
      />
    </div>
  );
}

function IconSpinner({ className }: { className?: string }) {
  return (
    <svg className={["animate-spin", className].filter(Boolean).join(" ")} viewBox="0 0 24 24" fill="none" aria-hidden>
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-90"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  );
}

export function AuthPrimaryButton({
  className = "",
  children,
  type = "submit",
  busy,
  disabled,
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { busy?: boolean }) {
  const isBusy = Boolean(busy);
  const isDisabled = Boolean(disabled) || isBusy;
  return (
    <button
      type={type}
      {...rest}
      disabled={isDisabled}
      aria-busy={isBusy || undefined}
      className={[
        "auth-primary-cta flex min-h-[2.875rem] w-full touch-manipulation items-center justify-center gap-2.5 rounded-2xl bg-gradient-to-b from-[#3ae087] via-[#25D366] to-[#128C7E] px-5 py-3 text-[15px] font-semibold tracking-tight text-white shadow-[0_2px_0_rgba(255,255,255,0.35)_inset,0_4px_0_rgba(5,80,60,0.22),0_14px_36px_-8px_rgba(0,128,105,0.45),0_0_0_1px_rgba(255,255,255,0.22)_inset] ring-2 ring-white/25 transition duration-200 hover:from-[#4ade80] hover:via-[#2fe077] hover:to-[#0f766e] hover:shadow-[0_2px_0_rgba(255,255,255,0.4)_inset,0_18px_44px_-10px_rgba(0,128,105,0.4)] active:scale-[0.98] active:brightness-[0.97] disabled:cursor-not-allowed disabled:opacity-65 sm:min-h-[3rem] sm:px-6",
        className,
      ].join(" ")}
    >
      {isBusy ? <IconSpinner className="h-5 w-5 shrink-0 sm:h-[1.15rem] sm:w-[1.15rem]" /> : <IconLoginArrow className="h-5 w-5 shrink-0 sm:h-[1.1rem] sm:w-[1.1rem]" />}
      {children}
    </button>
  );
}

/* —— Iconos orientados a chatbot / WhatsApp / verificación —— */

export function IconBotSpark({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 48 48" fill="none" className={className} aria-hidden>
      <circle cx="24" cy="22" r="14" stroke="currentColor" strokeWidth="2" />
      <circle cx="18" cy="20" r="2" fill="currentColor" />
      <circle cx="30" cy="20" r="2" fill="currentColor" />
      <path d="M16 26c2 3 14 3 16 0" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M24 36v4M18 40h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      <path d="M38 8l2 4 4 2-4 2-2 4-2-4-4-2 4-2 2-4Z" fill="#fcd34d" stroke="white" strokeWidth="0.5" />
    </svg>
  );
}

export function IconChatWhatsApp({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 21c-4.4 0-8-3-8.8-7L3 20l6.2-1.6C10.4 19.4 11.2 19.6 12 19.6c4.4 0 8-3.6 8-8s-3.6-8-8-8-8 3.6-8 8c0 1 .2 1.9.5 2.8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M9 11h.01M15 11h.01M9.5 14c1 1.2 2.8 2 4.5 2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </svg>
  );
}

export function IconBrainChip({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 4c-1.5 0-2.8.8-3.5 2-.4-.1-.8-.2-1.2-.2-2 0-3.5 1.8-3.3 3.8-.8.6-1.3 1.5-1.3 2.6 0 1.2.6 2.2 1.5 2.8-.1.3-.2.7-.2 1.1 0 2 1.5 3.6 3.4 3.9.7 1.2 2 2 3.6 2s2.9-.8 3.6-2c1.9-.3 3.4-1.9 3.4-3.9 0-.4-.1-.8-.2-1.1.9-.6 1.5-1.6 1.5-2.8 0-1.1-.5-2-1.3-2.6.2-2-1.3-3.8-3.3-3.8-.4 0-.8.1-1.2.2-.7-1.2-2-2-3.5-2Z"
        stroke="currentColor"
        strokeWidth="1.3"
        strokeLinejoin="round"
      />
      <path d="M9 12h2M13 12h2M11 15h2" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
    </svg>
  );
}

export function IconShieldCode({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M12 3l8 3v6c0 5-3.5 9-8 10-4.5-1-8-5-8-10V6l8-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M9 12l2 2 4-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

function IconLoginArrow({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" className={className} aria-hidden>
      <path
        d="M15 3h4v4M10 14L21 3M21 3v7M21 10v8a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h7"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Enlace secundario estilo “pill” gris */
export function AuthSecondaryLink({ href, children }: { href: string; children: ReactNode }) {
  return (
    <Link
      href={href}
      prefetch
      className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-slate-200/80 bg-white px-4 py-2 text-sm font-medium text-[var(--wa-text-muted)] shadow-[0_1px_2px_rgba(15,23,42,0.05)] transition duration-200 hover:border-[#008069]/22 hover:bg-slate-50/90 hover:text-[var(--wa-text)] hover:shadow-[0_4px_14px_-4px_rgba(0,128,105,0.12)] active:scale-[0.98]"
    >
      {children}
    </Link>
  );
}

/** Compat: formularios que aún importen AuthInput → mismo borde que el campo con icono, sin icono */
export function AuthInput(props: InputHTMLAttributes<HTMLInputElement>) {
  const { className = "", ...rest } = props;
  return (
    <input
      {...rest}
      className={[
        "w-full rounded-lg border border-[var(--wa-border)] bg-[var(--wa-input-bg)] px-3 py-3 text-[15px] text-[var(--wa-text)] shadow-sm placeholder:text-[var(--wa-text-muted)] focus:border-[#008069] focus:outline-none focus:ring-2 focus:ring-[#008069]/20",
        className,
      ].join(" ")}
    />
  );
}

/** Compat: layout centrado antiguo — ya no usado en login/register; se mantiene por si acaso */
export function AuthShell({
  title,
  description,
  badge,
  children,
}: {
  title: string;
  description: string;
  badge?: ReactNode;
  children: ReactNode;
}) {
  return (
    <AuthPageBackground>
      <div className="mx-auto flex w-full max-w-md flex-1 flex-col justify-center px-5 py-10">
        <div className="rounded-2xl border border-[var(--wa-border)] bg-[var(--wa-card-bg)] p-6 text-[var(--wa-text)] shadow-xl">
          <h1 className="text-center text-xl font-semibold text-[var(--wa-text)]">{title}</h1>
          {badge ? <div className="mt-3 flex justify-center">{badge}</div> : null}
          <p className="mt-2 text-center text-sm text-[var(--wa-text-muted)]">{description}</p>
          <div className="mt-6">{children}</div>
        </div>
      </div>
    </AuthPageBackground>
  );
}
