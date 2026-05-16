"use client";

export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface AuthSession {
  accessToken: string;
  refreshToken: string | null;
  expiresAt: number | null;
  user: AuthUser;
}

const KEY = "councilia.authSession.v1";

export function loadAuthSession(): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.user?.id || !parsed.user?.email) {
      clearAuthSession();
      return null;
    }
    if (parsed.expiresAt && parsed.expiresAt <= Date.now()) {
      clearAuthSession();
      return null;
    }
    return parsed;
  } catch {
    clearAuthSession();
    return null;
  }
}

export function saveAuthSession(session: AuthSession): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(KEY, JSON.stringify(session));
  window.dispatchEvent(new Event("councilia:auth-change"));
}

export function updateAuthUser(user: Partial<AuthUser>): AuthSession | null {
  const session = loadAuthSession();
  if (!session) return null;
  const nextSession = {
    ...session,
    user: {
      ...session.user,
      ...user,
    },
  };
  saveAuthSession(nextSession);
  return nextSession;
}

export function clearAuthSession(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(KEY);
  window.dispatchEvent(new Event("councilia:auth-change"));
}

export function authChangeEventName(): string {
  return "councilia:auth-change";
}
