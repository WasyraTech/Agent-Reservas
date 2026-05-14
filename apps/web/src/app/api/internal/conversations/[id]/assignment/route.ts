import { proxyToBackend } from "@/lib/backend-proxy";

type Ctx = { params: Promise<{ id: string }> };

export async function PATCH(req: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const body = await req.text();
  return proxyToBackend(req, `/internal/conversations/${id}/assignment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body,
  });
}
