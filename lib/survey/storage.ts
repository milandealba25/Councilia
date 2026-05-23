"use client";
import {
  userContextSchema,
  type UserContext,
} from "./survey.v1";

/**
 * C3 (versión cliente) · Persistencia local del userContext.
 * Vive en sessionStorage hasta el registro (G4). Cuando el usuario crea
 * cuenta, se migra al primer council en Supabase.
 */

const KEY = "councilia.userContext.v1";

export function loadUserContext(): UserContext | null {
  if (typeof window === "undefined") return null;
  const raw = sessionStorage.getItem(KEY);
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
}

export function clearUserContext(): void {
  if (typeof window === "undefined") return;
  sessionStorage.removeItem(KEY);
}
