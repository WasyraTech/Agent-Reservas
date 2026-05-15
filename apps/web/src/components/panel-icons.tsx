import type { ReactNode } from "react";
import type { SVGProps } from "react";

export type PanelIconProps = SVGProps<SVGSVGElement> & { className?: string };

function svg(children: ReactNode, { className = "h-5 w-5 shrink-0", ...rest }: PanelIconProps) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
      {...rest}
    >
      {children}
    </svg>
  );
}

export function IconHome(props: PanelIconProps) {
  return svg(
    <path
      d="M4 10.5 12 4l8 6.5V20a1 1 0 0 1-1 1h-5v-6H10v6H5a1 1 0 0 1-1-1v-9.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconMessages(props: PanelIconProps) {
  return svg(
    <>
      <path
        d="M6 5h12a3 3 0 0 1 3 3v7a3 3 0 0 1-3 3h-4l-4 3v-3H6a3 3 0 0 1-3-3V8a3 3 0 0 1 3-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 10h8M8 13.5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconCalendar(props: PanelIconProps) {
  return svg(
    <path
      d="M8 3v3m8-3v3M5 11h14M6 5h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconActivity(props: PanelIconProps) {
  return svg(
    <path
      d="M4 14h3l2-5 3 9 2-4h8"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconSettings(props: PanelIconProps) {
  return svg(
    <>
      <path d="M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6Z" stroke="currentColor" strokeWidth="1.5" />
      <path
        d="M10 4.5h4l1 2.2 2.2 1 2.2-1 2-1.8h1.8l.5 2-1.7 1.7v2.8l1.7 1.7-.5 2H19l-2-1.8-2.2 1-2.2-1L14 19.5h-4l-1-2.2-2.2-1-2.2 1-2 1.8H2.3l-.5-2 1.7-1.7v-2.8L.8 9.3l.5-2H5l2-1.8 2.2 1L10 4.5Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
    </>,
    props,
  );
}

export function IconSearch(props: PanelIconProps) {
  return svg(
    <>
      <circle cx="11" cy="11" r="6.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m16.5 16.5 4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconTune(props: PanelIconProps) {
  return svg(
    <path
      d="M5 7h14M5 12h8M5 17h11M15 10v4M9 5v4M12 15v4"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
    />,
    props,
  );
}

export function IconChevronDown(props: PanelIconProps) {
  return svg(
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
    props,
  );
}

export function IconChevronLeft(props: PanelIconProps) {
  return svg(
    <path d="M14 6l-6 6 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
    props,
  );
}

export function IconChevronRight(props: PanelIconProps) {
  return svg(
    <path d="M10 6l6 6-6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />,
    props,
  );
}

export function IconLogout(props: PanelIconProps) {
  return svg(
    <path
      d="M10 5H6a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h4M15 12h7m0 0-3-3m3 3-3 3"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconSparkles(props: PanelIconProps) {
  return svg(
    <>
      <path
        d="M9 3.5 10 8 6 6.5 10 8 8.5 12 12 9.5l3.5 2.5L14 8l4 1.5L14 8l1.5-4L12 6.5 9 3.5Z"
        stroke="currentColor"
        strokeWidth="1.35"
        strokeLinejoin="round"
      />
      <path d="M4 14.5h.01M18 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconInboxEmpty(props: PanelIconProps) {
  return svg(
    <>
      <path
        d="M4 8a2 2 0 0 1 2-2h12a2 2 0 0 1 2 2v2l-2 4H6l-2-4V8Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="M8 14h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
      <path d="M10 10h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" opacity="0.45" />
    </>,
    props,
  );
}

export function IconClock(props: PanelIconProps) {
  return svg(
    <>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v4.5l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconShieldCheck(props: PanelIconProps) {
  return svg(
    <>
      <path
        d="M12 3 5 6v5.5c0 4.2 2.9 8.1 7 9.5 4.1-1.4 7-5.3 7-9.5V6l-7-3Z"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinejoin="round"
      />
      <path d="m9.5 12 1.8 1.8L15 10" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function IconEscalate(props: PanelIconProps) {
  return svg(
    <path
      d="M12 5v8m0 0 3.5-3.5M12 13 8.5 9.5M5 19h14"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinecap="round"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconCheckCircle(props: PanelIconProps) {
  return svg(
    <>
      <circle cx="12" cy="12" r="7.5" stroke="currentColor" strokeWidth="1.5" />
      <path d="m9 12 2 2 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function IconDotFilled(props: PanelIconProps) {
  return svg(<circle cx="12" cy="12" r="4" fill="currentColor" />, props);
}

export function IconBolt(props: PanelIconProps) {
  return svg(
    <path
      d="M13 2 4 14h7l-1 8 9-12h-7l1-8Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconCircleAlert(props: PanelIconProps) {
  return svg(
    <>
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 8v5M12 16h.01" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconDownload(props: PanelIconProps) {
  return svg(
    <>
      <path d="M12 4v11m0 0 4-4m-4 4-4-4M5 20h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function IconRefresh(props: PanelIconProps) {
  return svg(
    <>
      <path
        d="M21 12a9 9 0 0 0-15-6.7L3 8"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M3 3v5h5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
      <path
        d="M3 12a9 9 0 0 0 15 6.7L21 16"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path d="M21 21v-5h-5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
    </>,
    props,
  );
}

export function IconCopy(props: PanelIconProps) {
  return svg(
    <>
      <rect x="8" y="8" width="11" height="11" rx="2" stroke="currentColor" strokeWidth="1.5" />
      <path d="M7 16H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconMoon(props: PanelIconProps) {
  return svg(
    <path
      d="M21 14.5A8.5 8.5 0 0 1 9.5 3a8.5 8.5 0 1 0 11.5 11.5Z"
      stroke="currentColor"
      strokeWidth="1.5"
      strokeLinejoin="round"
    />,
    props,
  );
}

export function IconSun(props: PanelIconProps) {
  return svg(
    <>
      <circle cx="12" cy="12" r="4" stroke="currentColor" strokeWidth="1.5" />
      <path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconVolumeOn(props: PanelIconProps) {
  return svg(
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="M15.5 8.5a5 5 0 0 1 0 7M18 6a8 8 0 0 1 0 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}

export function IconVolumeOff(props: PanelIconProps) {
  return svg(
    <>
      <path d="M11 5 6 9H3v6h3l5 4V5Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round" />
      <path d="m22 9-6 6M16 9l6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
    </>,
    props,
  );
}
