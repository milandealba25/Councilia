import "server-only";
import { z } from "zod";
import { AGENT_IDS, type AgentId } from "@/lib/agents/ids";
import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";
import type { AuthenticatedRequest } from "@/lib/auth/serverSession";
import { getLlm } from "@/lib/api/orchestrator";
import { LlmError } from "@/orchestrator/llm";

const agentIdSchema = z.enum(AGENT_IDS);

export const chatTurnPayloadSchema = z.object({
  userMessage: z.string().trim().min(1).max(4000),
  agents: z.object({
    marco: z.string().default(""),
    elena: z.string().default(""),
    rafael: z.string().default(""),
  }),
  replica: z
    .object({
      speaker: agentIdSchema,
      respondingTo: agentIdSchema,
      text: z.string().trim().min(1),
    })
    .nullable(),
});

export type ChatTurnPayload = z.infer<typeof chatTurnPayloadSchema>;

export interface ChatSessionDto {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurnPayload[];
  summary: string;
  keyFacts: unknown[];
}

interface ConversationRestRow {
  id: string;
  title?: string | null;
  summary?: string | null;
  key_facts?: unknown;
  created_at: string;
  updated_at: string;
}

interface MessageRestRow {
  id: string;
  conversation_id: string;
  agent_id: AgentId | null;
  role: "user" | "agent" | "synthesis";
  phase: "initial" | "replica" | "synthesis" | "user_input";
  content: string;
  content_json: Record<string, unknown> | null;
  replies_to_agent_id: AgentId | null;
  created_at: string;
}

export function getRestAuth(auth: AuthenticatedRequest): {
  supabaseUrl: string;
  headers: Record<string, string>;
} {
  const { url, anonKey } = requireSupabaseConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const apiKey = serviceRoleKey ?? anonKey;
  const bearer = serviceRoleKey ?? auth.accessToken;
  return {
    supabaseUrl: url,
    headers: {
      apikey: apiKey,
      authorization: `Bearer ${bearer}`,
      "content-type": "application/json",
    },
  };
}

export async function listUserChatSessions(
  auth: AuthenticatedRequest,
): Promise<ChatSessionDto[]> {
  const { supabaseUrl, headers } = getRestAuth(auth);
  const conversations = await fetchConversations(supabaseUrl, headers, auth.user.id);
  const messages = await fetchMessagesForConversations(
    supabaseUrl,
    headers,
    conversations.map((c) => c.id),
  );
  const byConversation = new Map<string, MessageRestRow[]>();
  for (const message of messages) {
    const group = byConversation.get(message.conversation_id) ?? [];
    group.push(message);
    byConversation.set(message.conversation_id, group);
  }

  return conversations.map((conversation) =>
    conversationToDto(conversation, byConversation.get(conversation.id) ?? []),
  );
}

export async function createUserChatSession(
  auth: AuthenticatedRequest,
): Promise<ChatSessionDto | { error: "survey_required" }> {
  const { supabaseUrl, headers } = getRestAuth(auth);
  const council = await fetchLatestCouncil(supabaseUrl, headers, auth.user.id);
  if (!council?.id) return { error: "survey_required" };

  const url = new URL("/rest/v1/conversations", supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({
      council_id: council.id,
      user_id: auth.user.id,
      title: "Nuevo chat",
      status: "active",
      summary: "",
      key_facts: [],
      survey_snapshot: council.user_context ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error(`create_chat_failed_${response.status}`);
  }
  const rows = (await response.json()) as ConversationRestRow[];
  return conversationToDto(rows[0], []);
}

export async function renameUserChatSession(
  auth: AuthenticatedRequest,
  chatId: string,
  title: string,
): Promise<ChatSessionDto | null> {
  const { supabaseUrl, headers } = getRestAuth(auth);
  const cleanTitle = title.trim().slice(0, 80);
  if (!cleanTitle) return null;

  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set("id", `eq.${chatId}`);
  url.searchParams.set("user_id", `eq.${auth.user.id}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({ title: cleanTitle }),
  });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as ConversationRestRow[];
  if (!rows[0]) return null;
  const messages = await fetchMessagesForConversations(supabaseUrl, headers, [chatId]);
  return conversationToDto(rows[0], messages);
}

export async function deleteUserChatSession(
  auth: AuthenticatedRequest,
  chatId: string,
): Promise<boolean> {
  const { supabaseUrl, headers } = getRestAuth(auth);
  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set("id", `eq.${chatId}`);
  url.searchParams.set("user_id", `eq.${auth.user.id}`);
  const response = await fetch(url, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ status: "deleted" }),
  });
  return response.ok;
}

export async function appendTurnToUserChat(
  auth: AuthenticatedRequest,
  chatId: string,
  turn: ChatTurnPayload,
): Promise<ChatSessionDto | null> {
  const { supabaseUrl, headers } = getRestAuth(auth);
  const conversation = await fetchOwnedConversation(
    supabaseUrl,
    headers,
    auth.user.id,
    chatId,
  );
  if (!conversation) return null;

  const turnId = crypto.randomUUID();
  const rows = buildMessageRows(chatId, turnId, turn);
  const messagesUrl = new URL("/rest/v1/messages", supabaseUrl);
  const messageResponse = await fetch(messagesUrl, {
    method: "POST",
    headers,
    body: JSON.stringify(rows),
  });
  if (!messageResponse.ok) {
    throw new Error(`append_turn_failed_${messageResponse.status}`);
  }

  const memory = await summarizeTurn(conversation, turn);
  const title =
    !conversation.title || conversation.title === "Nuevo chat"
      ? inferTitle(turn.userMessage)
      : conversation.title;
  const updateUrl = new URL("/rest/v1/conversations", supabaseUrl);
  updateUrl.searchParams.set("id", `eq.${chatId}`);
  updateUrl.searchParams.set("user_id", `eq.${auth.user.id}`);
  const updateResponse = await fetch(updateUrl, {
    method: "PATCH",
    headers: { ...headers, prefer: "return=representation" },
    body: JSON.stringify({
      title,
      summary: memory.summary,
      key_facts: memory.keyFacts,
      last_summarized_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    }),
  });

  const updatedRows = updateResponse.ok
    ? ((await updateResponse.json().catch(() => [])) as ConversationRestRow[])
    : [];
  const messages = await fetchMessagesForConversations(supabaseUrl, headers, [
    chatId,
  ]);
  return conversationToDto(updatedRows[0] ?? conversation, messages);
}

function conversationToDto(
  conversation: ConversationRestRow,
  messages: MessageRestRow[],
): ChatSessionDto {
  return {
    id: conversation.id,
    title: conversation.title?.trim() || "Nuevo chat",
    createdAt: new Date(conversation.created_at).getTime(),
    updatedAt: new Date(conversation.updated_at).getTime(),
    turns: messagesToTurns(messages),
    summary: conversation.summary ?? "",
    keyFacts: Array.isArray(conversation.key_facts)
      ? conversation.key_facts
      : [],
  };
}

function messagesToTurns(messages: MessageRestRow[]): ChatTurnPayload[] {
  const withTurnIds = messages.filter((m) => typeof m.content_json?.turn_id === "string");
  if (withTurnIds.length > 0) {
    const groups = new Map<string, MessageRestRow[]>();
    for (const message of withTurnIds) {
      const turnId = String(message.content_json?.turn_id);
      const group = groups.get(turnId) ?? [];
      group.push(message);
      groups.set(turnId, group);
    }
    return Array.from(groups.values())
      .sort((a, b) => a[0].created_at.localeCompare(b[0].created_at))
      .map(messagesGroupToTurn)
      .filter(Boolean) as ChatTurnPayload[];
  }

  const turns: ChatTurnPayload[] = [];
  let current: MessageRestRow[] = [];
  for (const message of messages) {
    if (message.role === "user" && current.length > 0) {
      const turn = messagesGroupToTurn(current);
      if (turn) turns.push(turn);
      current = [];
    }
    current.push(message);
  }
  const last = messagesGroupToTurn(current);
  if (last) turns.push(last);
  return turns;
}

function messagesGroupToTurn(messages: MessageRestRow[]): ChatTurnPayload | null {
  const user = messages.find((m) => m.role === "user");
  if (!user) return null;
  const agents: Record<AgentId, string> = {
    marco: "",
    elena: "",
    rafael: "",
  };
  for (const message of messages) {
    if (message.role === "agent" && message.phase === "initial" && message.agent_id) {
      agents[message.agent_id] = message.content;
    }
  }
  const replicaMessage = messages.find(
    (m) => m.role === "agent" && m.phase === "replica" && m.agent_id,
  );
  return {
    userMessage: user.content,
    agents,
    replica:
      replicaMessage?.agent_id && replicaMessage.replies_to_agent_id
        ? {
            speaker: replicaMessage.agent_id,
            respondingTo: replicaMessage.replies_to_agent_id,
            text: replicaMessage.content,
          }
        : null,
  };
}

function buildMessageRows(
  chatId: string,
  turnId: string,
  turn: ChatTurnPayload,
): Array<Record<string, unknown>> {
  const base = { conversation_id: chatId, content_json: { turn_id: turnId } };
  const rows: Array<Record<string, unknown>> = [
    {
      ...base,
      role: "user",
      phase: "user_input",
      content: turn.userMessage,
    },
  ];
  for (const agent of AGENT_IDS) {
    const content = turn.agents[agent]?.trim();
    if (!content) continue;
    rows.push({
      ...base,
      agent_id: agent,
      role: "agent",
      phase: "initial",
      content,
    });
  }
  if (turn.replica) {
    rows.push({
      ...base,
      agent_id: turn.replica.speaker,
      replies_to_agent_id: turn.replica.respondingTo,
      role: "agent",
      phase: "replica",
      content: turn.replica.text,
    });
  }
  return rows;
}

async function fetchConversations(
  supabaseUrl: string,
  headers: Record<string, string>,
  userId: string,
): Promise<ConversationRestRow[]> {
  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,title,summary,key_facts,created_at,updated_at",
  );
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("status", "eq.active");
  url.searchParams.set("order", "updated_at.desc");
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`list_chats_failed_${response.status}`);
  return response.json();
}

async function fetchMessagesForConversations(
  supabaseUrl: string,
  headers: Record<string, string>,
  conversationIds: string[],
): Promise<MessageRestRow[]> {
  if (conversationIds.length === 0) return [];
  const url = new URL("/rest/v1/messages", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,conversation_id,agent_id,role,phase,content,content_json,replies_to_agent_id,created_at",
  );
  url.searchParams.set("conversation_id", `in.(${conversationIds.join(",")})`);
  url.searchParams.set("order", "created_at.asc");
  const response = await fetch(url, { headers });
  if (!response.ok) throw new Error(`list_messages_failed_${response.status}`);
  return response.json();
}

async function fetchOwnedConversation(
  supabaseUrl: string,
  headers: Record<string, string>,
  userId: string,
  chatId: string,
): Promise<ConversationRestRow | null> {
  const url = new URL("/rest/v1/conversations", supabaseUrl);
  url.searchParams.set(
    "select",
    "id,title,summary,key_facts,created_at,updated_at",
  );
  url.searchParams.set("id", `eq.${chatId}`);
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("status", "eq.active");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as ConversationRestRow[];
  return rows[0] ?? null;
}

async function fetchLatestCouncil(
  supabaseUrl: string,
  headers: Record<string, string>,
  userId: string,
): Promise<{ id?: string; user_context?: unknown } | null> {
  const url = new URL("/rest/v1/councils", supabaseUrl);
  url.searchParams.set("select", "id,user_context");
  url.searchParams.set("user_id", `eq.${userId}`);
  url.searchParams.set("order", "created_at.desc");
  url.searchParams.set("limit", "1");
  const response = await fetch(url, { headers });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<{
    id?: string;
    user_context?: unknown;
  }>;
  return rows[0] ?? null;
}

function inferTitle(message: string): string {
  const compact = message.replace(/\s+/g, " ").trim();
  if (compact.length <= 54) return compact || "Nuevo chat";
  return `${compact.slice(0, 54).trim()}...`;
}

async function summarizeTurn(
  conversation: ConversationRestRow,
  turn: ChatTurnPayload,
): Promise<{ summary: string; keyFacts: unknown[] }> {
  const previousSummary = conversation.summary?.trim() ?? "";
  const previousFacts = Array.isArray(conversation.key_facts)
    ? conversation.key_facts
    : [];
  try {
    const llm = getLlm();
    const completion = await llm.complete({
      systemPrompt:
        "Resume memoria de una conversacion de COUNCILia. Devuelve solo JSON valido con summary (2-3 oraciones, sin texto crudo innecesario) y key_facts (array breve de hechos utiles, sin datos sensibles si no aportan contexto).",
      messages: [
        {
          role: "user",
          content: [
            "Resumen anterior:",
            previousSummary || "(vacio)",
            "",
            "Hechos anteriores:",
            JSON.stringify(previousFacts),
            "",
            "Nuevo turno:",
            renderTurnForSummary(turn),
          ].join("\n"),
        },
      ],
      maxTokens: 320,
      temperature: 0.2,
    });
    const parsed = parseSummaryJson(completion.text);
    if (parsed) return parsed;
  } catch (err) {
    if (err instanceof LlmError && err.code === "aborted") throw err;
  }

  return {
    summary: fallbackSummary(previousSummary, turn.userMessage),
    keyFacts: previousFacts,
  };
}

function renderTurnForSummary(turn: ChatTurnPayload): string {
  const lines = [`Usuario: ${turn.userMessage}`];
  for (const agent of AGENT_IDS) {
    const text = turn.agents[agent]?.trim();
    if (text) lines.push(`${agent}: ${text}`);
  }
  if (turn.replica) {
    lines.push(`${turn.replica.speaker} replica: ${turn.replica.text}`);
  }
  return lines.join("\n");
}

function parseSummaryJson(
  text: string,
): { summary: string; keyFacts: unknown[] } | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  try {
    const data = JSON.parse(text.slice(start, end + 1)) as {
      summary?: unknown;
      key_facts?: unknown;
      keyFacts?: unknown;
    };
    const facts = data.key_facts ?? data.keyFacts ?? [];
    if (typeof data.summary !== "string") return null;
    return {
      summary: data.summary.trim().slice(0, 1200),
      keyFacts: Array.isArray(facts) ? facts.slice(0, 12) : [],
    };
  } catch {
    return null;
  }
}

function fallbackSummary(previousSummary: string, userMessage: string): string {
  const latest = inferTitle(userMessage);
  if (!previousSummary) {
    return `El usuario comenzo una conversacion sobre: ${latest}`;
  }
  return `${previousSummary} Ultimo tema mencionado: ${latest}`.slice(0, 1200);
}
