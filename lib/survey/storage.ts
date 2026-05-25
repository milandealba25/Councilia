"use client";

import {
  userContextSchema,
  type UserContext,
} from "./survey.v1";
import { loadAuthSession } from "@/lib/auth/client";

const KEY = "councilia.userContext.v1";
const DRAFT_KEY = "councilia.userContextDraft.v1";

export type UserContextDraft = Partial<Omit<UserContext, "surveyVersion">>;

function ownerScope(): string {
  const session = loadAuthSession();
  return session?.user.id ? `user:${session.user.id}` : "guest";
}

function scopedDraftKey(): string {
  return `${DRAFT_KEY}:${ownerScope()}`;
}

export function loadUserContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY) ?? localStorage.getItem(KEY);
  if (!raw) return null;
  try {
    return userContextSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function saveUserContext(ctx: UserContext): void {
  if (typeof window === "undefined") return;
  sessionStorage.setItem(KEY, JSON.stringify(ctx));
  localStorage.setItem(KEY, JSON.stringify(ctx));
  clearUserContextDraft();
}

export function clearUserContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
  localStorage.removeItem(KEY);
}

export function loadUserContextDraft(): UserContextDraft {
  if (typeof window === "undefined") return {};
  const raw =
    localStorage.getItem(scopedDraftKey()) ??
    sessionStorage.getItem(scopedDraftKey()) ??
    localStorage.getItem(DRAFT_KEY) ??
    sessionStorage.getItem(DRAFT_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as UserContextDraft;
  } catch {
    return {};
  }
}

export function saveUserContextDraft(draft: UserContextDraft): void {
  if (typeof window === "undefined") return;
  const payload = JSON.stringify(draft);
  sessionStorage.setItem(scopedDraftKey(), payload);
  localStorage.setItem(scopedDraftKey(), payload);
}

export function clearUserContextDraft(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(scopedDraftKey());
  localStorage.removeItem(scopedDraftKey());
  sessionStorage.removeItem(DRAFT_KEY);
  localStorage.removeItem(DRAFT_KEY);
}
