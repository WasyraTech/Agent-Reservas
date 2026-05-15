"use client";

import type { PanelUser } from "@/lib/server-api";
import { clearAuthRouteTransitionMarker } from "@/lib/auth-route-transition";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { AppNav } from "./AppNav";
import { PanelPremiumBackdrop } from "./PanelPremiumBackdrop";
import { PanelToastProvider } from "./PanelToast";
import { ThemeRoot } from "./ThemeRoot";

export function AppShell({
  panelUser,
  children,
}: {
  panelUser: PanelUser | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const isAuth = pathname === "/login" || pathname === "/register";

  useEffect(() => {
    if (!isAuth) clearAuthRouteTransitionMarker();
  }, [isAuth]);
  return (
    <PanelToastProvider>
      <ThemeRoot>
        <div
          className={[
            "wa-app-root flex min-h-dvh flex-col",
            isAuth ? "h-dvh max-h-dvh min-h-0 overflow-hidden" : "",
            !isAuth ? "md:flex-row" : "",
          ].join(" ")}
          data-auth={isAuth ? "true" : "false"}
        >
          <AppNav panelUser={panelUser} />
          <div
            className={[
              "flex min-h-0 min-w-0 flex-1 flex-col",
              isAuth ? "h-full min-h-0 overflow-hidden" : "relative isolate min-h-0",
              !isAuth
                ? "pb-[calc(4.75rem+env(safe-area-inset-bottom))] md:pb-0 md:pl-[4.75rem] lg:pl-56"
                : "",
            ].join(" ")}
          >
            {!isAuth ? <PanelPremiumBackdrop /> : null}
            <div
              data-ar-panel={!isAuth ? "true" : undefined}
              className={[
                "relative z-[1] flex min-h-0 flex-1 flex-col",
                isAuth ? "h-full min-h-0 overflow-hidden" : "",
              ].join(" ")}
            >
              {children}
            </div>
          </div>
        </div>
      </ThemeRoot>
    </PanelToastProvider>
  );
}
