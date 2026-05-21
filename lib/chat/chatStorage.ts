"use client";

import type { AgentId } from "@/lib/agents/ids";

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
}

const SESSIONS_KEY = "councilia.chatSessions.v1";
const ACTIVE_KEY = "councilia.activeChatId.v1";

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
}

export function getChatSessions(): ChatSession[] {
  return readAll().sort((a, b) => b.updatedAt - a.updatedAt);
}

export function getChatSession(id: string): ChatSession | null {
  return readAll().find((s) => s.id === id) ?? null;
}

export function createChatSession(): ChatSession {
  const session: ChatSession = {
    id: generateId(),
    title: "Nuevo chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
    turns: [],
  };
  const all = readAll();
  all.push(session);
  writeAll(all);
  setActiveChatId(session.id);
  return session;
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
        ? turn.userMessage.slice(0, 50) + "…"
        : turn.userMessage;
  }
  writeAll(all);
}

export function deleteChatSession(id: string): void {
  const all = readAll().filter((s) => s.id !== id);
  writeAll(all);
  if (getActiveChatId() === id) {
    clearActiveChatId();
  }
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
