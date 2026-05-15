const KEY = "ar_conv_seen_v1";

function readMap(): Record<string, string> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return {};
    const j = JSON.parse(raw) as unknown;
    return j && typeof j === "object" ? (j as Record<string, string>) : {};
  } catch {
    return {};
  }
}

export function markConversationSeen(conversationId: string) {
  if (typeof window === "undefined") return;
  try {
    const m = readMap();
    m[conversationId] = new Date().toISOString();
    window.localStorage.setItem(KEY, JSON.stringify(m));
  } catch {
    /* ignore */
  }
}

/** Punto “no leído” heurístico: último mensaje entrante y actividad posterior a la última visita al chat. */
export function conversationLooksUnread(
  conversationId: string,
  updatedAt: string,
  lastMessageDirection: string | null | undefined,
): boolean {
  if (lastMessageDirection !== "inbound") return false;
  const seen = readMap()[conversationId];
  if (!seen) return true;
  try {
    return new Date(updatedAt).getTime() > new Date(seen).getTime();
  } catch {
    return true;
  }
}
