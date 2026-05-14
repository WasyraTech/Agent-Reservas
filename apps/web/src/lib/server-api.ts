import { cookies } from "next/headers";

import { getBackendUrl, getInternalApiKey } from "@/lib/env";

const PANEL_SESSION_COOKIE = "ar_panel_session";

async function internalHeaders(): Promise<HeadersInit> {
  const h: Record<string, string> = {
    "X-API-Key": getInternalApiKey(),
    "X-Request-ID":
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID()
        : `srv-${Date.now()}`,
  };
  try {
    const jar = await cookies();
    const tok = jar.get(PANEL_SESSION_COOKIE)?.value?.trim();
    if (tok) {
      h["X-Panel-Session"] = tok;
    }
  } catch {
    /* cookies() fuera de request */
  }
  return h;
}

export type PanelUser = {
  display_name: string;
  role: "admin" | "operator";
  phone_e164: string;
};

export async function fetchPanelMe(): Promise<PanelUser | null> {
  try {
    const res = await fetch(`${getBackendUrl()}/internal/panel/auth/me`, {
      headers: await internalHeaders(),
      cache: "no-store",
    });
    if (!res.ok) {
      return null;
    }
    return res.json() as Promise<PanelUser>;
  } catch {
    return null;
  }
}

export type ConversationSummary = {
  id: string;
  twilio_from: string;
  twilio_to: string;
  status: string;
  updated_at: string;
  message_count: number;
  last_agent_llm_status: string;
  has_pending_handoff?: boolean;
  last_agent_llm_error_snippet?: string | null;
  assigned_operator_id?: string | null;
};

export type ConversationDetail = {
  id: string;
  twilio_from: string;
  twilio_to: string;
  status: string;
  updated_at: string;
  messages: {
    id: string;
    direction: string;
    body: string;
    twilio_message_sid: string | null;
    created_at: string;
  }[];
  lead: {
    id: string;
    phone: string;
    email: string | null;
    name: string | null;
    stage: string;
    qualification: Record<string, unknown> | null;
  } | null;
  internal_notes: string | null;
  internal_tags: string[];
  last_agent_llm_status: string;
  last_agent_llm_error: string | null;
  pending_handoff: {
    id: string;
    reason: string;
    status: string;
    created_at: string;
  } | null;
  appointments: {
    id: string;
    status: string;
    start_at: string;
    end_at: string;
    client_name: string | null;
    service_label: string | null;
    google_event_id: string | null;
  }[];
  assigned_operator_id?: string | null;
};

export type AppointmentListItem = {
  id: string;
  conversation_id: string;
  twilio_from: string;
  status: string;
  start_at: string;
  end_at: string;
  client_name: string | null;
  service_label: string | null;
  google_event_id: string | null;
  created_at: string;
};

export type LeadListItem = {
  id: string;
  conversation_id: string;
  twilio_from: string;
  phone: string;
  email: string | null;
  name: string | null;
  stage: string;
  qualification: Record<string, unknown> | null;
  updated_at: string;
};

function appendConvFilters(
  q: URLSearchParams,
  p: {
    q?: string | null;
    status?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  },
) {
  if (p.q != null && String(p.q).trim() !== "") q.set("q", String(p.q).trim());
  if (p.status != null && String(p.status).trim() !== "") q.set("status", String(p.status).trim());
  if (p.date_from != null && String(p.date_from).trim() !== "") q.set("date_from", String(p.date_from).trim());
  if (p.date_to != null && String(p.date_to).trim() !== "") q.set("date_to", String(p.date_to).trim());
  q.set("limit", String(p.limit ?? 100));
  if (p.offset != null) q.set("offset", String(p.offset));
}

export async function fetchConversations(
  params: {
    q?: string | null;
    status?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  } = {},
) {
  const q = new URLSearchParams();
  appendConvFilters(q, params);
  const res = await fetch(`${getBackendUrl()}/internal/conversations?${q}`, {
    headers: await internalHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load conversations: ${res.status}`);
  }
  return res.json() as Promise<ConversationSummary[]>;
}

function appendLeadFilters(
  q: URLSearchParams,
  p: {
    q?: string | null;
    stage?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  },
) {
  if (p.q != null && String(p.q).trim() !== "") q.set("q", String(p.q).trim());
  if (p.stage != null && String(p.stage).trim() !== "") q.set("stage", String(p.stage).trim());
  if (p.date_from != null && String(p.date_from).trim() !== "") q.set("date_from", String(p.date_from).trim());
  if (p.date_to != null && String(p.date_to).trim() !== "") q.set("date_to", String(p.date_to).trim());
  q.set("limit", String(p.limit ?? 200));
  q.set("offset", String(p.offset ?? 0));
}

export async function fetchLeads(
  params: {
    q?: string | null;
    stage?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  } = {},
) {
  const q = new URLSearchParams();
  appendLeadFilters(q, params);
  const res = await fetch(`${getBackendUrl()}/internal/leads?${q}`, {
    headers: await internalHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load leads: ${res.status}`);
  }
  return res.json() as Promise<LeadListItem[]>;
}

function appendAppointmentFilters(
  q: URLSearchParams,
  p: {
    status?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  },
) {
  if (p.status != null && String(p.status).trim() !== "") q.set("status", String(p.status).trim());
  if (p.date_from != null && String(p.date_from).trim() !== "")
    q.set("date_from", String(p.date_from).trim());
  if (p.date_to != null && String(p.date_to).trim() !== "") q.set("date_to", String(p.date_to).trim());
  q.set("limit", String(p.limit ?? 200));
  q.set("offset", String(p.offset ?? 0));
}

export async function fetchAppointments(
  params: {
    status?: string | null;
    date_from?: string | null;
    date_to?: string | null;
    limit?: number;
    offset?: number;
  } = {},
) {
  const q = new URLSearchParams();
  appendAppointmentFilters(q, params);
  const res = await fetch(`${getBackendUrl()}/internal/appointments?${q}`, {
    headers: await internalHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load appointments: ${res.status}`);
  }
  return res.json() as Promise<AppointmentListItem[]>;
}

export async function fetchConversation(id: string) {
  const res = await fetch(`${getBackendUrl()}/internal/conversations/${id}`, {
    headers: await internalHeaders(),
    cache: "no-store",
  });
  if (!res.ok) {
    throw new Error(`Failed to load conversation: ${res.status}`);
  }
  return res.json() as Promise<ConversationDetail>;
}
