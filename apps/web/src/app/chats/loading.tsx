export default function ChatsLoading() {
  return (
    <div className="flex min-h-0 flex-1 animate-pulse">
      <div className="hidden w-[min(100%,20rem)] shrink-0 border-r border-[var(--wa-border)] bg-[var(--wa-header)]/80 p-3 md:block">
        <div className="mx-auto mb-3 h-9 w-full max-w-[12rem] rounded-full bg-[var(--wa-panel)]" />
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-14 rounded-xl bg-[var(--wa-panel)]" />
          ))}
        </div>
      </div>
      <div className="flex min-w-0 flex-1 flex-col items-center justify-center px-4 py-12">
        <div className="h-12 w-48 max-w-full rounded-xl bg-[var(--wa-panel)]" />
        <div className="mt-4 h-4 w-64 max-w-full rounded bg-[var(--wa-panel)]" />
      </div>
    </div>
  );
}
