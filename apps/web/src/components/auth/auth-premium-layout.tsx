import type { ComponentType, ReactNode } from "react";
import { useId } from "react";
import Link from "next/link";

import { IconBotSpark, IconBrainChip } from "./AuthShell";

/** Iconos bot / IA dispersos (quedan suavizados por el velo blur encima) */
export function AuthPremiumBgAiMarks() {
  const marks: { Icon: ComponentType<{ className?: string }>; cls: string }[] = [
    { Icon: IconBotSpark, cls: "left-[2%] top-[10%] h-12 w-12 -rotate-12 text-[#008069] opacity-[0.14]" },
    { Icon: IconBrainChip, cls: "left-[14%] top-[4%] h-9 w-9 rotate-6 text-[#0f766e] opacity-[0.12]" },
    { Icon: IconBotSpark, cls: "left-[28%] top-[18%] h-10 w-10 rotate-[18deg] text-[#008069] opacity-[0.1]" },
    { Icon: IconBrainChip, cls: "left-[8%] top-[32%] h-8 w-8 -rotate-[10deg] text-[#3730a3] opacity-[0.11]" },
    { Icon: IconBotSpark, cls: "left-[22%] top-[48%] h-11 w-11 rotate-3 text-[#056956] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "left-[4%] top-[58%] h-9 w-9 -rotate-6 text-[#4f46e5] opacity-[0.12]" },
    { Icon: IconBotSpark, cls: "left-[16%] top-[72%] h-10 w-10 -rotate-[14deg] text-[#008069] opacity-[0.1]" },
    { Icon: IconBrainChip, cls: "left-[32%] top-[82%] h-8 w-8 rotate-12 text-[#0f766e] opacity-[0.11]" },
    { Icon: IconBotSpark, cls: "right-[6%] top-[8%] h-11 w-11 rotate-12 text-[#075e54] opacity-[0.13]" },
    { Icon: IconBrainChip, cls: "right-[18%] top-[20%] h-9 w-9 -rotate-3 text-[#064e3b] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[3%] top-[36%] h-12 w-12 -rotate-[8deg] text-[#008069] opacity-[0.11]" },
    { Icon: IconBrainChip, cls: "right-[24%] top-[44%] h-8 w-8 rotate-6 text-[#0f766e] opacity-[0.12]" },
    { Icon: IconBotSpark, cls: "right-[10%] top-[56%] h-10 w-10 rotate-[15deg] text-[#008069] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "right-[20%] top-[68%] h-9 w-9 -rotate-12 text-[#3730a3] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[4%] top-[78%] h-11 w-11 rotate-6 text-[#056956] opacity-[0.12]" },
    { Icon: IconBrainChip, cls: "left-[42%] top-[6%] h-7 w-7 text-[#34d399] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[38%] top-[12%] h-9 w-9 -rotate-6 text-[#10b981] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "left-[48%] top-[28%] h-8 w-8 rotate-[22deg] text-[#4f46e5] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[44%] top-[38%] h-10 w-10 text-[#008069] opacity-[0.08]" },
    { Icon: IconBrainChip, cls: "left-[52%] top-[52%] h-7 w-7 -rotate-6 text-[#0f766e] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[48%] top-[62%] h-9 w-9 rotate-12 text-[#008069] opacity-[0.1]" },
    { Icon: IconBrainChip, cls: "left-[38%] top-[70%] h-8 w-8 text-[#064e3b] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[32%] top-[84%] h-10 w-10 -rotate-[18deg] text-[#056956] opacity-[0.11]" },
    { Icon: IconBrainChip, cls: "left-[60%] top-[88%] h-7 w-7 rotate-3 text-[#34d399] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[72%] top-[14%] h-9 w-9 rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "right-[52%] top-[92%] h-8 w-8 -rotate-6 text-[#3730a3] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[1%] top-[45%] h-7 w-7 rotate-[8deg] text-[#056956] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[11%] top-[95%] h-8 w-8 -rotate-3 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[25%] top-[3%] h-6 w-6 rotate-12 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[35%] top-[40%] h-9 w-9 -rotate-[22deg] text-[#075e54] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[50%] top-[2%] h-7 w-7 rotate-6 text-[#008069] opacity-[0.11]" },
    { Icon: IconBotSpark, cls: "left-[58%] top-[35%] h-10 w-10 -rotate-6 text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[66%] top-[58%] h-8 w-8 rotate-[14deg] text-[#056956] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[78%] top-[42%] h-9 w-9 -rotate-12 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[88%] top-[25%] h-7 w-7 rotate-3 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[92%] top-[65%] h-8 w-8 rotate-[20deg] text-[#075e54] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[1%] top-[52%] h-7 w-7 -rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[8%] top-[95%] h-9 w-9 rotate-12 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[28%] top-[3%] h-8 w-8 -rotate-[10deg] text-[#056956] opacity-[0.11]" },
    { Icon: IconBotSpark, cls: "right-[35%] top-[72%] h-6 w-6 rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[55%] top-[18%] h-10 w-10 -rotate-3 text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[62%] top-[48%] h-7 w-7 rotate-[18deg] text-[#075e54] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[72%] top-[8%] h-8 w-8 -rotate-12 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[19%] top-[62%] h-6 w-6 rotate-6 text-[#008069] opacity-[0.07]" },
    { Icon: IconBotSpark, cls: "left-[44%] top-[92%] h-8 w-8 -rotate-[16deg] text-[#056956] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[63%] top-[12%] h-7 w-7 rotate-3 text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[15%] top-[42%] h-6 w-6 -rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[42%] top-[28%] h-9 w-9 rotate-[11deg] text-[#075e54] opacity-[0.08]" },
    { Icon: IconBrainChip, cls: "left-[56%] top-[78%] h-6 w-6 rotate-6 text-[#0f766e] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "right-[58%] top-[88%] h-7 w-7 -rotate-3 text-[#4f46e5] opacity-[0.08]" },
    { Icon: IconBrainChip, cls: "left-[6%] top-[78%] h-6 w-6 text-[#3730a3] opacity-[0.09]" },
    { Icon: IconBrainChip, cls: "right-[92%] top-[48%] h-6 w-6 rotate-12 text-[#34d399] opacity-[0.07]" },
    { Icon: IconBotSpark, cls: "left-[47%] top-[62%] h-8 w-8 -rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[30%] top-[24%] h-7 w-7 rotate-[9deg] text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[25%] top-[58%] h-8 w-8 rotate-6 text-[#056956] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[74%] top-[88%] h-6 w-6 -rotate-12 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[68%] top-[38%] h-7 w-7 rotate-3 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[40%] top-[16%] h-6 w-6 -rotate-[8deg] text-[#075e54] opacity-[0.11]" },
    { Icon: IconBotSpark, cls: "right-[8%] top-[18%] h-7 w-7 rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[12%] top-[44%] h-8 w-8 rotate-[17deg] text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[45%] top-[8%] h-6 w-6 -rotate-3 text-[#056956] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[68%] top-[26%] h-7 w-7 rotate-12 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[35%] top-[92%] h-8 w-8 -rotate-6 text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[86%] top-[52%] h-6 w-6 rotate-6 text-[#075e54] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[2%] top-[28%] h-7 w-7 -rotate-[14deg] text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[24%] top-[88%] h-6 w-6 rotate-3 text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[78%] top-[72%] h-8 w-8 rotate-6 text-[#056956] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[52%] top-[44%] h-7 w-7 -rotate-12 text-[#008069] opacity-[0.07]" },
    { Icon: IconBotSpark, cls: "right-[48%] top-[52%] h-6 w-6 rotate-[19deg] text-[#008069] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[8%] top-[18%] h-7 w-7 -rotate-6 text-[#075e54] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[12%] top-[62%] h-8 w-8 rotate-3 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[36%] top-[56%] h-6 w-6 -rotate-[11deg] text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[22%] top-[12%] h-7 w-7 rotate-12 text-[#056956] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "left-[90%] top-[38%] h-6 w-6 rotate-6 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "right-[90%] top-[22%] h-7 w-7 -rotate-3 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "left-[48%] top-[76%] h-8 w-8 rotate-[7deg] text-[#075e54] opacity-[0.08]" },
    { Icon: IconBotSpark, cls: "right-[40%] top-[64%] h-6 w-6 -rotate-12 text-[#008069] opacity-[0.09]" },
    { Icon: IconBotSpark, cls: "left-[2%] top-[68%] h-7 w-7 rotate-6 text-[#008069] opacity-[0.1]" },
    { Icon: IconBotSpark, cls: "right-[6%] top-[48%] h-8 w-8 -rotate-[9deg] text-[#056956] opacity-[0.08]" },
  ];

  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden select-none" aria-hidden>
      {marks.map(({ Icon, cls }, i) => (
        <Icon key={i} className={`absolute ${cls}`} />
      ))}
    </div>
  );
}

/** Ilustración bot — login */
export function AuthPremiumBotArt({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 420 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[
        "auth-ill-float h-full w-auto max-h-full object-contain object-center drop-shadow-[0_16px_40px_rgba(0,128,105,0.28)]",
        className,
      ].join(" ")}
      aria-hidden
    >
      <defs>
        <linearGradient id={`apb-body-${uid}`} x1="86" y1="120" x2="340" y2="380" gradientUnits="userSpaceOnUse">
          <stop stopColor="#25D366" />
          <stop offset="0.45" stopColor="#128C7E" />
          <stop offset="1" stopColor="#075E54" />
        </linearGradient>
        <linearGradient id={`apb-face-${uid}`} x1="140" y1="160" x2="280" y2="260" gradientUnits="userSpaceOnUse">
          <stop stopColor="#f8fafc" />
          <stop offset="1" stopColor="#e2e8f0" />
        </linearGradient>
        <filter id={`apb-glow-${uid}`} x="-20%" y="-20%" width="140%" height="140%">
          <feGaussianBlur stdDeviation="12" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
      </defs>
      <ellipse cx="210" cy="400" rx="140" ry="18" fill="#0f172a" opacity="0.12" />
      <circle cx="320" cy="90" r="36" fill="#128C7E" opacity="0.35" />
      <circle cx="95" cy="140" r="22" fill="#25D366" opacity="0.28" />
      <path
        d="M210 28 L228 58 L262 62 L236 84 L242 118 L210 100 L178 118 L184 84 L158 62 L192 58 Z"
        fill="#fcd34d"
        opacity="0.95"
      />
      <rect x="118" y="108" width="184" height="218" rx="48" fill={`url(#apb-body-${uid})`} filter={`url(#apb-glow-${uid})`} />
      <rect
        x="138"
        y="138"
        width="144"
        height="112"
        rx="28"
        fill={`url(#apb-face-${uid})`}
        stroke="#fff"
        strokeOpacity="0.35"
        strokeWidth="2"
      />
      <rect x="168" y="172" width="28" height="36" rx="10" fill="#0f172a" opacity="0.85" />
      <rect x="224" y="172" width="28" height="36" rx="10" fill="#0f172a" opacity="0.85" />
      <path
        d="M168 238c18 22 66 22 84 0"
        stroke="#128C7E"
        strokeWidth="10"
        strokeLinecap="round"
        opacity="0.9"
      />
      <rect x="196" y="278" width="28" height="44" rx="8" fill="#fff" fillOpacity="0.22" />
      <rect x="232" y="278" width="28" height="44" rx="8" fill="#fff" fillOpacity="0.22" />
      <rect x="154" y="312" width="112" height="14" rx="7" fill="#fff" fillOpacity="0.15" />
      <path d="M210 108v-32" stroke="#fff" strokeOpacity="0.5" strokeWidth="6" strokeLinecap="round" />
      <circle cx="210" cy="62" r="14" fill="#128C7E" stroke="#fff" strokeWidth="3" strokeOpacity="0.6" />
      <rect x="52" y="198" width="72" height="52" rx="16" fill="#fff" fillOpacity="0.92" stroke="#e2e8f0" strokeWidth="2" />
      <path d="M72 222h32M72 236h22" stroke="#94a3b8" strokeWidth="4" strokeLinecap="round" />
      <circle cx="108" cy="214" r="8" fill="#22c55e" />
      <rect x="296" y="248" width="64" height="56" rx="18" fill="#fff" fillOpacity="0.14" stroke="#fff" strokeOpacity="0.35" strokeWidth="2" />
      <path d="M314 276h28M314 288h18" stroke="#fff" strokeOpacity="0.55" strokeWidth="3" strokeLinecap="round" />
    </svg>
  );
}

/** Ilustración registro */
export function AuthPremiumRegisterArt({ className = "" }: { className?: string }) {
  const uid = useId().replace(/:/g, "");
  return (
    <svg
      viewBox="0 0 420 440"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={[
        "auth-ill-float h-full w-auto max-h-full object-contain object-center drop-shadow-[0_16px_40px_rgba(0,128,105,0.22)]",
        className,
      ].join(" ")}
      aria-hidden
    >
      <defs>
        <linearGradient id={`apr-ring-${uid}`} x1="60" y1="60" x2="380" y2="400" gradientUnits="userSpaceOnUse">
          <stop stopColor="#128C7E" stopOpacity="0.5" />
          <stop offset="1" stopColor="#25D366" stopOpacity="0.15" />
        </linearGradient>
        <linearGradient id={`apr-core-${uid}`} x1="150" y1="140" x2="290" y2="300" gradientUnits="userSpaceOnUse">
          <stop stopColor="#25D366" />
          <stop offset="1" stopColor="#075E54" />
        </linearGradient>
      </defs>
      <ellipse cx="210" cy="400" rx="150" ry="20" fill="#0f172a" opacity="0.1" />
      <circle cx="210" cy="220" r="160" stroke={`url(#apr-ring-${uid})`} strokeWidth="2" strokeDasharray="18 14" opacity="0.9" />
      <circle cx="210" cy="220" r="118" stroke="#fff" strokeOpacity="0.2" strokeWidth="1.5" strokeDasharray="10 12" />
      <circle cx="210" cy="220" r="76" fill={`url(#apr-core-${uid})`} />
      <path
        d="M178 208h64M178 228h48M178 248h56"
        stroke="#fff"
        strokeOpacity="0.85"
        strokeWidth="8"
        strokeLinecap="round"
      />
      <rect x="168" y="300" width="84" height="28" rx="14" fill="#fff" fillOpacity="0.2" />
      <rect x="248" y="108" width="72" height="64" rx="20" fill="#fff" fillOpacity="0.95" stroke="#e2e8f0" strokeWidth="2" />
      <path
        d="M268 138c8 0 14 6 14 14s-6 14-14 14-14-6-14-14 6-14 14-14Z"
        fill="#25D366"
      />
      <path d="M262 154h12M268 148v12" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" />
      <circle cx="308" cy="160" r="6" fill="#128C7E" opacity="0.5" />
      <circle cx="118" cy="320" r="10" fill="#128C7E" opacity="0.4" />
      <circle cx="340" cy="300" r="14" fill="#25D366" opacity="0.35" />
    </svg>
  );
}

export type AuthPremiumMode = "login" | "register";

type AuthPremiumRootProps = {
  mode: AuthPremiumMode;
  children: ReactNode;
  topBar: ReactNode;
  crossHref: string;
  crossLabel: string;
  crossHint: string;
};

export function AuthPremiumRoot({ mode, children, topBar, crossHref, crossLabel, crossHint }: AuthPremiumRootProps) {
  const isLogin = mode === "login";

  return (
    <div className="relative flex h-full min-h-0 w-full flex-1 flex-col overflow-y-auto overflow-x-hidden bg-[#dadbd7] antialiased">
      {/* Capas decorativas (el velo siguiente las difumina) */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute inset-0 bg-gradient-to-br from-[#f0f2f5] via-[#e8ebe9] to-[#cfd4d2]" />
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_95%_65%_at_50%_-8%,rgba(255,255,255,0.82),transparent_58%)]" />
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-[#25D366]/[0.06] to-transparent" />
        <AuthPremiumBgAiMarks />
        <div className="auth-premium-grain absolute inset-0 opacity-[0.065]" />
        <div className="absolute -left-[20%] -top-[10%] h-[28rem] w-[28rem] rounded-full bg-[#25D366]/16 blur-[88px] sm:h-[32rem] sm:w-[32rem] sm:blur-[100px]" />
        <div className="absolute -bottom-[8%] -right-[15%] h-[26rem] w-[26rem] rounded-full bg-emerald-600/14 blur-[80px] sm:blur-[96px]" />
        <div className="absolute left-1/2 top-1/3 h-[18rem] w-[20rem] -translate-x-1/2 rounded-full bg-teal-300/12 blur-[72px]" />
      </div>
      {/* Velo esmerilado: mucho blur (iconos + gradientes se mezclan) */}
      <div
        className="pointer-events-none fixed inset-0 z-0 bg-[#e4e6e5]/55 backdrop-blur-xl supports-[backdrop-filter]:bg-[#e4e6e5]/40 motion-reduce:backdrop-blur-md motion-reduce:bg-[#e4e6e5]/60 sm:backdrop-blur-2xl lg:backdrop-blur-[3.25rem]"
        aria-hidden
      />

      <div className="relative z-[1] flex min-h-0 flex-1 flex-col items-center justify-center px-3 py-5 sm:px-5 sm:py-7 lg:px-8 lg:py-10">
        <div
          className="auth-float-card auth-premium-modal flex w-full max-w-[min(100%,52rem)] flex-col overflow-hidden rounded-[1.35rem] border border-white/70 bg-white/[0.46] shadow-[0_28px_56px_-24px_rgba(5,80,60,0.22),0_0_0_1px_rgba(255,255,255,0.55)_inset,0_2px_0_rgba(255,255,255,0.45)_inset] backdrop-blur-2xl sm:rounded-[1.55rem] lg:max-h-[min(96dvh,860px)] lg:flex-row lg:rounded-[2rem]"
        >
          {/* Panel ilustración */}
          <aside className="relative flex min-h-[9.5rem] w-full shrink-0 flex-col overflow-hidden border-b border-white/15 sm:min-h-[10.25rem] lg:w-[min(44%,18.5rem)] lg:min-h-0 lg:max-w-[22rem] lg:border-b-0 lg:border-r lg:border-white/15 xl:w-[min(38%,21rem)]">
            <div
              className="absolute inset-0"
              style={{
                background: "linear-gradient(152deg, #128C7E 0%, #0d7a6f 38%, #075E54 72%, #064e43 100%)",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-b from-white/14 via-transparent to-black/24" aria-hidden />
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.07]"
              style={{
                backgroundImage: `url("data:image/svg+xml,%3Csvg width='64' height='64' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M32 0v64M0 32h64' stroke='%23fff' stroke-width='0.5'/%3E%3C/svg%3E")`,
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute -right-8 top-1/3 h-32 w-32 rounded-full bg-sky-200/20 blur-2xl" aria-hidden />

            <div className="relative flex min-h-0 flex-1 flex-col px-4 pb-3 pt-4 sm:px-5 sm:pb-4 sm:pt-5 lg:px-7 lg:pb-5 lg:pt-7">
              <div className="shrink-0 text-center lg:text-left">
                <p className="text-[9px] font-bold uppercase tracking-[0.26em] text-white/50 sm:text-[10px]">Agent Reservas</p>
                <h2 className="mt-1.5 text-balance text-lg font-semibold leading-tight tracking-[-0.035em] text-white drop-shadow sm:text-xl lg:mt-2 lg:text-[clamp(1.1rem,1.5vw,1.4rem)]">
                  {isLogin ? (
                    <>
                      Asistente{" "}
                      <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">24/7</span>
                    </>
                  ) : (
                    <>
                      Activa tu{" "}
                      <span className="bg-gradient-to-r from-white to-slate-200 bg-clip-text text-transparent">negocio</span>
                    </>
                  )}
                </h2>
                <p className="mx-auto mt-2 max-w-[20rem] text-balance text-[11px] leading-snug text-white/80 sm:text-xs lg:mx-0 lg:text-[12px]">
                  {isLogin
                    ? "Código por WhatsApp con Twilio Verify. Sin contraseñas."
                    : "Datos del local + confirmación por WhatsApp en un solo flujo."}
                </p>
              </div>

              <div className="relative mt-2 flex min-h-0 flex-1 items-center justify-center py-1.5 sm:mt-3 lg:mt-4 lg:py-3">
                <div className="flex h-[min(8.5rem,18dvh)] max-h-[168px] w-full max-w-[9.5rem] items-center justify-center sm:h-[min(9.5rem,20dvh)] sm:max-h-[188px] sm:max-w-[11rem] lg:h-[min(12rem,32dvh)] lg:max-h-[min(260px,36dvh)] lg:max-w-[min(100%,12rem)]">
                  {isLogin ? <AuthPremiumBotArt /> : <AuthPremiumRegisterArt />}
                </div>
              </div>

              <div className="mt-auto hidden shrink-0 flex-col gap-2 pb-0.5 lg:flex">
                <p className="text-[11px] leading-snug text-white/60">{crossHint}</p>
                <Link
                  href={crossHref}
                  prefetch
                  className="inline-flex min-h-[2.5rem] items-center justify-center rounded-xl border border-white/35 bg-white/10 px-4 text-[10px] font-bold uppercase tracking-[0.15em] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.12)] backdrop-blur-sm transition hover:border-white/50 hover:bg-white/18 active:scale-[0.99]"
                >
                  {crossLabel}
                </Link>
              </div>
            </div>
          </aside>

          {/* Formulario (mismo bloque modal) */}
          <section className="relative flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden bg-gradient-to-b from-[#fcfcfc] via-white to-[#f0f2f5] lg:min-h-0">
            <div
              className="pointer-events-none absolute inset-0 opacity-[0.35]"
              style={{
                backgroundImage: "radial-gradient(circle at 1px 1px, rgba(0,128,105,0.05) 1px, transparent 0)",
                backgroundSize: "26px 26px",
              }}
              aria-hidden
            />
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_80%_55%_at_80%_0%,rgba(37,211,102,0.05),transparent_55%)]" aria-hidden />

            <div className="relative flex h-full min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-3 sm:px-5 sm:pb-4 sm:pt-4 lg:px-7 lg:pb-5 lg:pt-5">
              <div className="pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent via-[#25D366]/30 to-transparent sm:inset-x-6" aria-hidden />
              <div className="shrink-0">{topBar}</div>
              <div className="mt-1.5 min-h-0 w-full shrink-0 overflow-hidden sm:mt-2">{children}</div>

              <div className="mt-3 shrink-0 border-t border-slate-200/70 pt-3 lg:hidden">
                <p className="text-center text-[11px] text-slate-600">{crossHint}</p>
                <Link
                  href={crossHref}
                  prefetch
                  className="mt-2 flex min-h-[2.5rem] w-full items-center justify-center rounded-xl border border-[#e9edef] bg-white text-[12px] font-semibold text-[#008069] shadow-sm transition hover:border-[#25D366]/35 hover:bg-[#f8faf9] active:scale-[0.99]"
                >
                  {crossLabel}
                </Link>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
