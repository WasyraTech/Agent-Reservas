import { proxyToBackend } from "@/lib/backend-proxy";

export async function POST(req: Request) {
  const body = await req.text();
  return proxyToBackend(req, "/internal/panel/auth/start", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
