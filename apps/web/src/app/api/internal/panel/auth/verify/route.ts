import { NextResponse } from "next/server";

import { getBackendUrl, getInternalApiKey } from "@/lib/env";
import { forwardedRequestId } from "@/lib/backend-proxy";

const COOKIE = "ar_panel_session";
const MAX_AGE_SEC = 60 * 60 * 24 * 14;

export async function POST(req: Request) {
  const rid = forwardedRequestId(req);
  let key: string;
  try {
    key = getInternalApiKey();
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Config error";
    return NextResponse.json({ detail: msg, request_id: rid }, { status: 500 });
  }
  const body = await req.text();
  const url = `${getBackendUrl()}/internal/panel/auth/verify`;
  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-API-Key": key,
      "X-Request-ID": rid,
    },
    body,
    cache: "no-store",
  });
  const text = await res.text();
  const outRid = res.headers.get("X-Request-ID")?.trim() || rid;
  if (!res.ok) {
    try {
      const j = JSON.parse(text) as { detail?: unknown };
      return NextResponse.json(
        { detail: j.detail ?? j, request_id: outRid },
        { status: res.status, headers: { "X-Request-ID": outRid } },
      );
    } catch {
      return NextResponse.json(
        { detail: text.slice(0, 2000), request_id: outRid },
        { status: res.status, headers: { "X-Request-ID": outRid } },
      );
    }
  }
  let parsed: { session_token?: string; operator?: unknown };
  try {
    parsed = JSON.parse(text) as typeof parsed;
  } catch {
    return NextResponse.json({ detail: "Respuesta inválida del servidor" }, { status: 502 });
  }
  const token = (parsed.session_token || "").trim();
  if (!token) {
    return NextResponse.json({ detail: "Sin token de sesión" }, { status: 502 });
  }
  const out = NextResponse.json({ operator: parsed.operator ?? null }, { status: 200 });
  out.cookies.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: MAX_AGE_SEC,
    secure: process.env.NODE_ENV === "production",
  });
  out.headers.set("X-Request-ID", outRid);
  return out;
}
