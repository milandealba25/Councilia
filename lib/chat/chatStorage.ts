"use client";

import type { AgentId } from "@/lib/agents/ids";
import { getValidAuthSession } from "@/lib/auth/client";

export interface ChatTurn {
  turnId?: string;
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

export function createChatTurnId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return generateId();
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
  localStorage.setItem(SESSIONS_KEY, JSON.stringify(sortSessions(sessions)));
  window.dispatchEvent(new Event(CHAT_CHANGE_EVENT));
}

function upsertSession(session: ChatSession): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === session.id);
  const next = idx === -1 ? session : mergeSession(all[idx], session);
  if (idx === -1) all.push(next);
  else all[idx] = next;
  writeAll(all);
}

function sortSessions(sessions: ChatSession[]): ChatSession[] {
  return [...sessions].sort((a, b) => b.updatedAt - a.updatedAt);
}

function mergeSession(local: ChatSession, incoming: ChatSession): ChatSession {
  const turns = mergeTurns(local.turns, incoming.turns);
  return {
    ...local,
    ...incoming,
    turns,
    title:
      incoming.title === "Nuevo chat" && local.title !== "Nuevo chat"
        ? local.title
        : incoming.title,
    updatedAt: Math.max(local.updatedAt, incoming.updatedAt),
    summary: incoming.summary || local.summary,
    keyFacts:
      Array.isArray(incoming.keyFacts) && incoming.keyFacts.length > 0
        ? incoming.keyFacts
        : local.keyFacts,
  };
}

function mergeTurns(localTurns: ChatTurn[], incomingTurns: ChatTurn[]): ChatTurn[] {
  const byKey = new Map<string, ChatTurn>();
  const order: string[] = [];

  function keyFor(turn: ChatTurn, index: number, source: "local" | "incoming") {
    return turn.turnId ?? `${source}:${index}`;
  }

  function setTurn(key: string, turn: ChatTurn) {
    const existing = byKey.get(key);
    if (!existing) {
      byKey.set(key, turn);
      order.push(key);
      return;
    }
    byKey.set(key, pickMoreCompleteTurn(existing, turn));
  }

  localTurns.forEach((turn, index) => setTurn(keyFor(turn, index, "local"), turn));
  incomingTurns.forEach((turn, index) => {
    if (!turn.turnId) {
      const local = localTurns[index];
      if (local && !local.turnId) {
        const key = keyFor(local, index, "local");
        byKey.set(key, pickMoreCompleteTurn(byKey.get(key) ?? local, turn));
        return;
      }
    }
    setTurn(keyFor(turn, index, "incoming"), turn);
  });

  return order.map((key) => byKey.get(key)).filter(Boolean) as ChatTurn[];
}

function pickMoreCompleteTurn(a: ChatTurn, b: ChatTurn): ChatTurn {
  return turnCompleteness(b) >= turnCompleteness(a) ? b : a;
}

function turnCompleteness(turn: ChatTurn): number {
  let score = turn.userMessage.trim().length > 0 ? 1 : 0;
  for (const text of Object.values(turn.agents ?? {})) {
    if (text.trim()) score += 1;
  }
  if (turn.replica?.text.trim()) score += 1;
  return score;
}

function mergeServerSessions(incoming: ChatSession[]): ChatSession[] {
  const local = readAll();
  const byId = new Map<string, ChatSession>();
  for (const session of local) byId.set(session.id, session);
  for (const session of incoming) {
    const existing = byId.get(session.id);
    byId.set(session.id, existing ? mergeSession(existing, session) : session);
  }
  return sortSessions(Array.from(byId.values()));
}

async function authHeaders(): Promise<Record<string, string> | null> {
  const session = await getValidAuthSession();
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
  return sortSessions(readAll());
}

export function getChatSession(id: string): ChatSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export async function refreshChatSessionsFromServer(): Promise<ChatSession[]> {
  const headers = await authHeaders();
  if (!headers) return getChatSessions();
  const response = await fetch("/api/chats", { headers }).catch(() => null);
  if (!response?.ok) return getChatSessions();
  const data = (await response.json().catch(() => null)) as
    | { sessions?: ChatSession[] }
    | null;
  if (!Array.isArray(data?.sessions)) return getChatSessions();
  const merged = mergeServerSessions(data.sessions);
  writeAll(merged);
  const activeId = getActiveChatId();
  if (activeId && !merged.some((s) => s.id === activeId)) {
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
  upsertSession(session);
  setActiveChatId(session.id);
  return session;
}

export async function createPersistentChatSession(): Promise<ChatSession> {
  const headers = await authHeaders();
  if (!headers) return createChatSession();
  const response = await fetch("/api/chats", {
    method: "POST",
    headers,
  }).catch(() => null);
  if (!response) return createChatSession();
  if (response.status === 409) {
    throw new Error("survey_required");
  }
  if (!response.ok) return createChatSession();
  const data = (await response.json().catch(() => null)) as
    | { session?: ChatSession }
    | null;
  if (!data?.session) return createChatSession();
  upsertSession(data.session);
  setActiveChatId(data.session.id);
  return data.session;
}

export function saveChatTurn(chatId: string, turn: ChatTurn): void {
  const all = readAll();
  const idx = all.findIndex((s) => s.id === chatId);
  if (idx === -1) return;
  const existingTurnIdx = turn.turnId
    ? all[idx].turns.findIndex((item) => item.turnId === turn.turnId)
    : -1;
  if (existingTurnIdx >= 0) {
    all[idx].turns[existingTurnIdx] = pickMoreCompleteTurn(
      all[idx].turns[existingTurnIdx],
      turn,
    );
  } else {
    all[idx].turns.push(turn);
  }
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
  const headers = await authHeaders();
  if (!headers) return getChatSession(chatId);

  const response = await fetch(`/api/chats/${encodeURIComponent(chatId)}/turns`, {
    method: "POST",
    headers,
    body: JSON.stringify({ turn }),
  }).catch(() => null);
  if (!response?.ok) return getChatSession(chatId);
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
  const headers = await authHeaders();
  if (!headers) return;
  const response = await fetch(`/api/chats/${encodeURIComponent(id)}`, {
    method: "PATCH",
    headers,
    body: JSON.stringify({ title }),
  }).catch(() => null);
  if (!response?.ok) return;
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
  const headers = await authHeaders();
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
