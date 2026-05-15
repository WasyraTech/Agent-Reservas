"use client";

import { useEffect } from "react";

import { markConversationSeen } from "@/lib/chat-read-state";

export function ChatMarkRead({ conversationId }: { conversationId: string }) {
  useEffect(() => {
    markConversationSeen(conversationId);
  }, [conversationId]);
  return null;
}
