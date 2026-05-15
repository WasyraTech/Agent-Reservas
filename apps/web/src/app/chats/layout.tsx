import { Suspense } from "react";

import { ChatShell } from "@/components/ChatShell";
import { fetchConversations } from "@/lib/server-api";

export default async function ChatsLayout({ children }: { children: React.ReactNode }) {
  let initialRows: Awaited<ReturnType<typeof fetchConversations>> = [];
  try {
    initialRows = await fetchConversations({ limit: 100 });
  } catch {
    initialRows = [];
  }

  return (
    <Suspense
      fallback={
        <div className="flex min-h-0 flex-1 flex-col md:flex-row">
          <div className="hidden h-full min-h-[40vh] w-full max-w-[20rem] animate-pulse border-r border-[var(--wa-border)] bg-[var(--wa-header)]/80 p-3 md:block">
            <div className="mb-3 h-9 w-full rounded-full bg-[var(--wa-panel)]" />
            <div className="space-y-2">
              {Array.from({ length: 7 }).map((_, i) => (
                <div key={i} className="h-14 rounded-xl bg-[var(--wa-panel)]" />
              ))}
            </div>
          </div>
          <div className="flex flex-1 items-center justify-center px-4 py-16 text-sm text-[var(--wa-text-muted)]">
            Cargando conversaciones…
          </div>
        </div>
      }
    >
      <ChatShell initialRows={initialRows}>{children}</ChatShell>
    </Suspense>
  );
}
