import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

const PANEL_COOKIE = "ar_panel_session";

function panelSessionRequired(): boolean {
  const v = process.env.PANEL_SESSION_REQUIRED?.trim().toLowerCase();
  if (v === "0" || v === "false" || v === "off") {
    return false;
  }
  if (v === "1" || v === "true" || v === "on") {
    return true;
  }
  return process.env.NODE_ENV === "production";
}

export function middleware(req: NextRequest) {
  if (!panelSessionRequired()) {
    return NextResponse.next();
  }
  if (req.cookies.get(PANEL_COOKIE)?.value) {
    return NextResponse.next();
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.searchParams.set("next", `${req.nextUrl.pathname}${req.nextUrl.search}`);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/",
    "/chats",
    "/chats/:path*",
    "/citas",
    "/citas/:path*",
    "/estado",
    "/estado/:path*",
    "/configuracion",
    "/configuracion/:path*",
  ],
};
