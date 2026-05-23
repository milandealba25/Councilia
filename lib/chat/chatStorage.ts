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
}

const SESSIONS_KEY = "councilia.chatSessions.v1";
const ACTIVE_KEY = "councilia.activeChatId.v1";
const CHAT_STORAGE_EVENT = "councilia:chat-storage-change";

function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function ownerScope(): string {
  const session = loadAuthSession();
  return session?.user.id ? `user:${session.user.id}` : "guest";
}

function scopedKey(key: string): string {
  return `${key}:${ownerScope()}`;
}

function emitChatStorageChange(): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(new Event(CHAT_STORAGE_EVENT));
}

function readAll(): ChatSession[] {
  if (typeof window === "undefined") return [];
  const raw = localStorage.getItem(scopedKey(SESSIONS_KEY));
  if (!raw) return [];
  try {
    return JSON.parse(raw) as ChatSession[];
  } catch {
    return [];
  }
}

function writeAll(sessions: ChatSession[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedKey(SESSIONS_KEY), JSON.stringify(sessions));
  emitChatStorageChange();
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

export function updateChatSessionTitle(id: string, title: string): void {
  const cleanTitle = title.trim().replace(/\s+/g, " ").slice(0, 80);
  if (!cleanTitle) return;
  const all = readAll();
  const idx = all.findIndex((s) => s.id === id);
  if (idx === -1) return;
  all[idx].title = cleanTitle;
  all[idx].updatedAt = Date.now();
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
  return localStorage.getItem(scopedKey(ACTIVE_KEY));
}

export function setActiveChatId(id: string): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(scopedKey(ACTIVE_KEY), id);
}

export function clearActiveChatId(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(scopedKey(ACTIVE_KEY));
}

export function getChatStorageEventName(): string {
  return CHAT_STORAGE_EVENT;
}
