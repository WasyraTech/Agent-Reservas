import { NextResponse } from "next/server";

import { proxyToBackend } from "@/lib/backend-proxy";

const COOKIE = "ar_panel_session";

export async function POST(req: Request) {
  const proxied = await proxyToBackend(req, "/internal/panel/auth/logout", { method: "POST" });
  const out = NextResponse.json({ ok: true }, { status: proxied.status });
  out.cookies.delete(COOKIE);
  return out;
}
