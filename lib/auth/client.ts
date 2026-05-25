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
const REFRESH_MARGIN_MS = 60_000;

let refreshPromise: Promise<AuthSession | null> | null = null;

export function loadAuthSession(): AuthSession | null {
  return readStoredAuthSession({ allowExpired: false });
}

export async function getValidAuthSession(): Promise<AuthSession | null> {
  const session = readStoredAuthSession({ allowExpired: true });
  if (!session) return null;
  if (!isExpired(session, REFRESH_MARGIN_MS)) return session;
  if (!session.refreshToken) {
    clearAuthSession();
    return null;
  }
  return refreshAuthSession(session);
}

export async function refreshAuthSession(
  session: AuthSession | null = readStoredAuthSession({ allowExpired: true }),
): Promise<AuthSession | null> {
  if (!session?.refreshToken) return loadAuthSession();
  if (!refreshPromise) {
    refreshPromise = requestSessionRefresh(session.refreshToken).finally(() => {
      refreshPromise = null;
    });
  }
  return refreshPromise;
}

function readStoredAuthSession(opts: { allowExpired: boolean }): AuthSession | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(KEY);
  if (!raw) return null;

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.accessToken || !parsed.user?.id || !parsed.user?.email) {
      clearAuthSession();
      return null;
    }
    if (!opts.allowExpired && isExpired(parsed)) {
      clearAuthSession();
      return null;
    }
    return parsed;
  } catch {
    clearAuthSession();
    return null;
  }
}

function isExpired(session: AuthSession, marginMs = 0): boolean {
  return !!session.expiresAt && session.expiresAt <= Date.now() + marginMs;
}

async function requestSessionRefresh(refreshToken: string): Promise<AuthSession | null> {
  const response = await fetch("/api/auth/refresh", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ refreshToken }),
  }).catch(() => null);

  if (!response?.ok) {
    clearAuthSession();
    return null;
  }

  const data = (await response.json().catch(() => null)) as {
    session?: AuthSession;
  } | null;
  if (!data?.session) {
    clearAuthSession();
    return null;
  }
  saveAuthSession(data.session);
  return data.session;
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
