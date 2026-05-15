"use client";

import { usePathname } from "next/navigation";
import { useLayoutEffect, useState } from "react";

import { AUTH_ROUTE_TRANSITION_KEY } from "@/lib/auth-route-transition";

type AnimClass = "auth-page-anim-from-right" | "auth-page-anim-from-left" | "auth-page-anim-fade";

export default function AuthTemplate({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [anim, setAnim] = useState<AnimClass>("auth-page-anim-fade");

  useLayoutEffect(() => {
    const prev = sessionStorage.getItem(AUTH_ROUTE_TRANSITION_KEY);
    let next: AnimClass = "auth-page-anim-fade";
    if (prev === "/login" && pathname === "/register") next = "auth-page-anim-from-right";
    else if (prev === "/register" && pathname === "/login") next = "auth-page-anim-from-left";
    sessionStorage.setItem(AUTH_ROUTE_TRANSITION_KEY, pathname);
    setAnim(next);
  }, [pathname]);

  return (
    <div className={`ar-auth-template flex h-full min-h-0 flex-1 flex-col ${anim}`} data-auth-route={pathname}>
      {children}
    </div>
  );
}
