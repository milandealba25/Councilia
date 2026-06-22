/**
 * Preferencia de voz (TTS) del usuario.
 * Se persiste en localStorage con el mismo patrón de cookies/preferences.
 */

const VOICE_PREFS_KEY = "councilia.voiceEnabled.v1";
const CHANGE_EVENT = "councilia:voice";

export function loadVoiceEnabled(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(VOICE_PREFS_KEY) === "true";
}

export function saveVoiceEnabled(enabled: boolean): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(VOICE_PREFS_KEY, String(enabled));
  window.dispatchEvent(
    new CustomEvent(CHANGE_EVENT, { detail: enabled }),
  );
}

export function onVoiceChange(cb: (enabled: boolean) => void): () => void {
  const handler = (e: Event) => cb((e as CustomEvent<boolean>).detail);
  window.addEventListener(CHANGE_EVENT, handler);
  return () => window.removeEventListener(CHANGE_EVENT, handler);
}
