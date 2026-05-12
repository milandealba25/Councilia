/**
 * R5 · Modelo de preferencias de cookies.
 *
 * Categorías alineadas al doc 13: necesaria (siempre on), funcional, analítica.
 * Mientras `analytics` esté en false, NO se cargan scripts de analítica.
 */
import { z } from "zod";

export const COOKIE_PREFS_VERSION = 1 as const;
export const COOKIE_PREFS_KEY = "councilia.cookies.v1";

export const cookiePrefsSchema = z.object({
  version: z.literal(COOKIE_PREFS_VERSION),
  decidedAt: z.string(),
  necessary: z.literal(true),
  functional: z.boolean(),
  analytics: z.boolean(),
});

export type CookiePrefs = z.infer<typeof cookiePrefsSchema>;

export const DEFAULT_PREFS: CookiePrefs = {
  version: COOKIE_PREFS_VERSION,
  decidedAt: new Date(0).toISOString(),
  necessary: true,
  functional: false,
  analytics: false,
};

export function buildAcceptAll(): CookiePrefs {
  return {
    version: COOKIE_PREFS_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    functional: true,
    analytics: true,
  };
}

export function buildRejectNonEssential(): CookiePrefs {
  return {
    version: COOKIE_PREFS_VERSION,
    decidedAt: new Date().toISOString(),
    necessary: true,
    functional: false,
    analytics: false,
  };
}

export function loadPrefs(): CookiePrefs | null {
  if (typeof window === "undefined") return null;
  const raw = localStorage.getItem(COOKIE_PREFS_KEY);
  if (!raw) return null;
  try {
    return cookiePrefsSchema.parse(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function savePrefs(prefs: CookiePrefs): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(COOKIE_PREFS_KEY, JSON.stringify(prefs));
  window.dispatchEvent(new CustomEvent("councilia:cookies", { detail: prefs }));
}
