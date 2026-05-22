"use client";

import type { AgentId } from "@/lib/agents/ids";
import { loadAuthSession } from "@/lib/auth/client";

export interface ChatTurn {
  userMessage: string;
  agents: Record<string, string>;
  replica: {
    speaker: AgentId;
    respondingTo: AgentId;
    text: string;
  } | null;
}

export interface ChatSession {
  id: string;
  title: string;
  createdAt: number;
  updatedAt: number;
  turns: ChatTurn[];
  summary?: string;
  keyFacts?: unknown[];
}

const SESSIONS_KEY = "councilia.chatSessions.v1";
const ACTIVE_KEY = "councilia.activeChatId.v1";
const CHAT_CHANGE_EVENT = "councilia:chats-change";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function readAll(): ChatSession[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(SESSIONS_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function writeAll(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sessions));
  window.dispatchEvent(new Event(CHAT_CHANGE_EVENT));
}

function upsertSession(session: ChatSession): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === session.id);
  if (idx === -1) all.push(session);
  else all[idx] = session;
  writeAll(all);
}

function authHeaders(): Record<string, string> | null {
  const session = loadAuthSession();
  if (!session) return null;
  return {
    authorization: `Bearer ${session.accessToken}`,
    "content-type": "application/json",
  };
}

export function chatChangeEventName(): string {
  return CHAT_CHANGE_EVENT;
}

export function getChatSessions(): ChatSession[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChatSession(id: string): ChatSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export async function refreshChatSessionsFromServer(): Promise<ChatSession[]> {
  const headers = authHeaders();
  if (!headers) return getChatSessions();
  const response = await fetch("/api/chats", { headers });
  if (!response.ok) return getChatSessions();
  const data = (await response.json().catch(() => null)) as
    | { sessions?: ChatSession[] }
    | null;
  if (!Array.isArray(data?.sessions)) return getChatSessions();
  writeAll(data.sessions);
  const activeId = getActiveChatId();
  if (activeId && !data.sessions.some((s) => s.id === activeId)) {
    clearActiveChatId();
  }
  return getChatSessions();
}

export function createChatSession(): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    title: "Nuevo chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    turns: [],
    summary: "",
    keyFacts: [],
  };
  const all = readAll();
  all.push(session);
  writeAll(all);
  setActiveChatId(session.id);
  return session;
}

export async function createPersistentChatSession(): Promise<ChatSession> {
  const headers = authHeaders();
  if (!headers) return createChatSession();
  const response = await fetch("/api/chats", {
    method: "POST",
    headers,
  });
  if (!response.ok) {
    throw new Error("No pudimos crear el chat.");
  }
  const data = (await response.json()) as { session: ChatSession };
  upsertSession(data.session);
  setActiveChatId(data.session.id);
  return data.session;
}

export function saveChatTurn(chatId: string, turn: ChatTurn): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === chatId);
  if (idx === -1) return;
  all[idx].turns.push(turn);
  all[idx].updatedAt = Date.now();
  if (all[idx].turns.length === 1) {
    all[idx].title =
      turn.userMessage.length > 50
        ? `${turn.userMessage.slice(0, 50)}...`
        : turn.userMessage;
  }
  writeAll(all);
}

export async function savePersistentChatTurn(
  chatId: string,
  turn: ChatTurn,
): Promise<ChatSession | null> {
  saveChatTurn(chatId, turn);
  const headers = authHeaders();
  if (!headers) return getChatSession(chatId);

  const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/turns`, {
    method: "POST",
    headers,
    body: JSON.stringify({ turn }),
  });
  if (!response.ok) return getChatSession(chatId);
  const data = (await response.json().catch(() => null)) as
    | { session?: ChatSession }
    | null;
  if (data?.session) {
    upsertSession(data.session);
    return data.session;
  }
  return getChatSession(chatId);
}

export function renameChatSession(id: string, title: string): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;
  all[idx].title = title.trim() || all[idx].title;
  all[idx].updatedAt = Date.now();
  writeAll(all);
}

export async function renamePersistentChatSession(
  id: string,
  title: string,
): Promise<void> {
  renameChatSession(id, title);
  const headers = authHeaders();
  if (!headers) return;
  const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ title }),
  });
  if (!response.ok) return;
  const data = (await response.json().catch(() => null)) as
    | { session?: ChatSession }
    | null;
  if (data?.session) upsertSession(data.session);
}

export function exportChatSession(id: string): string | null {
  const session = getChatSession(id);
  if (!session) return null;
  const lines: string[] = [`# ${session.title}`, ""];
  for (const [i, turn] of session.turns.entries()) {
    lines.push(`## Turno ${i + 1}`);
    lines.push(`**Tu:** ${turn.userMessage}`, "");
    for (const [agent, text] of Object.entries(turn.agents)) {
      lines.push(`**${agent.charAt(0).toUpperCase() + agent.slice(1)}:** ${text}`, "");
    }
    if (turn.replica) {
      lines.push(
        `**Replica (${turn.replica.speaker} -> ${turn.replica.respondingTo}):** ${turn.replica.text}`,
        "",
      );
    }
    lines.push("---", "");
  }
  return lines.join("\n");
}

export function deleteChatSession(id: string): void {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
  if (getActiveChatId() === id) {
    clearActiveChatId();
  }
}

export async function deletePersistentChatSession(id: string): Promise<void> {
  deleteChatSession(id);
  const headers = authHeaders();
  if (!headers) return;
  await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: "DELETE",
    headers,
  }).catch(() => undefined);
}

export function buildConversationMemory(activeChatId: string | null): string {
  const sessions = getChatSessions();
  const active = activeChatId
    ? sessions.find((session) => session.id === activeChatId)
    : null;
  const lines: string[] = [];
  if (active?.summary?.trim()) {
    lines.push(`Chat actual: ${active.summary.trim()}`);
  }
  const facts = active?.keyFacts?.filter(Boolean) ?? [];
  if (facts.length > 0) {
    lines.push(`Hechos clave: ${JSON.stringify(facts.slice(0, 8))}`);
  }
  const previous = sessions
    .filter((session) => session.id !== activeChatId && session.summary?.trim())
    .slice(0, 3);
  if (previous.length > 0) {
    lines.push(
      "Otros chats recientes:",
      ...previous.map((session) => `- ${session.title}: ${session.summary}`),
    );
  }
  return lines.join("\n").slice(0, 2500);
}

export function getActiveChatId(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem(ACTIVE_KEY);
}

export function setActiveChatId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(ACTIVE_KEY, id);
}

export function clearActiveChatId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(ACTIVE_KEY);
}
