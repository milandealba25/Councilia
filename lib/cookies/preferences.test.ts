/**
 * Tests del modelo de preferencias de cookies.
 *
 * Stub mínimo de `localStorage` y `window` para correr en Node sin jsdom.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  buildAcceptAll,
  buildRejectNonEssential,
  COOKIE_PREFS_KEY,
  COOKIE_PREFS_VERSION,
  cookiePrefsSchema,
  loadPrefs,
  savePrefs,
} from "./preferences";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(k: string): string | null {
    return this.store.get(k) ?? null;
  }
  setItem(k: string, v: string): void {
    this.store.set(k, v);
  }
  removeItem(k: string): void {
    this.store.delete(k);
  }
}

function stubWindow() {
  const storage = new MemoryStorage();
  const events: Event[] = [];
  vi.stubGlobal("localStorage", storage);
  vi.stubGlobal("window", {
    dispatchEvent: (e: Event) => {
      events.push(e);
      return true;
    },
  });
  return { storage, events };
}

describe("Cookie preferences", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
  });

  it("loadPrefs() devuelve null si no hay nada guardado", () => {
    stubWindow();
    expect(loadPrefs()).toBeNull();
  });

  it("buildAcceptAll y buildRejectNonEssential producen datos válidos", () => {
    const a = buildAcceptAll();
    const r = buildRejectNonEssential();
    expect(cookiePrefsSchema.parse(a).analytics).toBe(true);
    expect(cookiePrefsSchema.parse(r).analytics).toBe(false);
    expect(a.necessary).toBe(true);
    expect(r.necessary).toBe(true);
  });

  it("savePrefs persiste y dispara CustomEvent", () => {
    const { storage, events } = stubWindow();
    const next = buildAcceptAll();
    savePrefs(next);

    const raw = storage.getItem(COOKIE_PREFS_KEY);
    expect(raw).not.toBeNull();
    const parsed = JSON.parse(raw!);
    expect(parsed.version).toBe(COOKIE_PREFS_VERSION);
    expect(parsed.analytics).toBe(true);
    expect(events.length).toBe(1);
  });

  it("loadPrefs descarta JSON inválido sin lanzar", () => {
    const { storage } = stubWindow();
    storage.setItem(COOKIE_PREFS_KEY, "{not json");
    expect(loadPrefs()).toBeNull();
  });
});
