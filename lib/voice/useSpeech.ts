"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AGENT_VOICE_PROFILES,
  type AgentVoiceProfile,
} from "./voiceProfiles";
import type { AgentId } from "@/lib/agents/ids";

/**
 * Hook ligero sobre la Web Speech API (`window.speechSynthesis`).
 *
 * - SSR-safe: detecta `window` antes de tocar la API.
 * - Carga voces de forma asíncrona (Chrome dispara `voiceschanged` después
 *   del primer `getVoices()`).
 * - Garantiza una sola "voz hablando" por hook (no dos utterances en paralelo).
 *
 * No depende de servicios externos: todo ocurre en el navegador del usuario.
 */
export type SpeechState =
  | "unsupported"
  | "idle"
  | "loading"
  | "speaking"
  | "paused";

interface UseSpeechOptions {
  agent: AgentId;
}

interface UseSpeechReturn {
  state: SpeechState;
  isSupported: boolean;
  speak: (text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
}

function pickVoice(
  voices: SpeechSynthesisVoice[],
  profile: AgentVoiceProfile,
): SpeechSynthesisVoice | undefined {
  if (voices.length === 0) return undefined;

  const langPrefix = profile.lang.split("-")[0]?.toLowerCase() ?? "es";

  const spanishVoices = voices.filter((v) =>
    v.lang.toLowerCase().startsWith(langPrefix),
  );
  const pool = spanishVoices.length > 0 ? spanishVoices : voices;

  for (const hint of profile.voiceHints) {
    const lower = hint.toLowerCase();
    const found = pool.find((v) => v.name.toLowerCase().includes(lower));
    if (found) return found;
  }

  const exactLang = pool.find(
    (v) => v.lang.toLowerCase() === profile.lang.toLowerCase(),
  );
  if (exactLang) return exactLang;

  return pool[0];
}

export function useSpeech({ agent }: UseSpeechOptions): UseSpeechReturn {
  const [state, setState] = useState<SpeechState>("loading");
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>([]);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
  const profile = AGENT_VOICE_PROFILES[agent];

  const isSupported = useMemo(
    () =>
      typeof window !== "undefined" &&
      typeof window.speechSynthesis !== "undefined" &&
      typeof window.SpeechSynthesisUtterance !== "undefined",
    [],
  );

  useEffect(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    const synth = window.speechSynthesis;

    function loadVoices() {
      const list = synth.getVoices();
      if (list.length > 0) {
        setVoices(list);
        setState((prev) => (prev === "loading" ? "idle" : prev));
      }
    }

    loadVoices();
    synth.addEventListener("voiceschanged", loadVoices);

    // Algunos navegadores requieren un primer "getVoices" + un pequeño delay.
    const t = window.setTimeout(loadVoices, 250);

    return () => {
      synth.removeEventListener("voiceschanged", loadVoices);
      window.clearTimeout(t);
    };
  }, [isSupported]);

  const stop = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.cancel();
    utteranceRef.current = null;
    setState("idle");
  }, [isSupported]);

  // Garantizamos limpieza si el componente se desmonta mientras habla.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      if (typeof window.speechSynthesis === "undefined") return;
      window.speechSynthesis.cancel();
    };
  }, []);

  const speak = useCallback(
    (rawText: string) => {
      if (!isSupported) return;
      const text = rawText.trim();
      if (text.length === 0) return;

      const synth = window.speechSynthesis;
      synth.cancel();

      const utter = new SpeechSynthesisUtterance(text);
      utter.lang = profile.lang;
      utter.rate = profile.rate;
      utter.pitch = profile.pitch;

      const chosen = pickVoice(voices, profile);
      if (chosen) utter.voice = chosen;

      utter.onend = () => {
        if (utteranceRef.current === utter) {
          utteranceRef.current = null;
          setState("idle");
        }
      };
      utter.onerror = () => {
        if (utteranceRef.current === utter) {
          utteranceRef.current = null;
          setState("idle");
        }
      };
      utter.onpause = () => setState("paused");
      utter.onresume = () => setState("speaking");

      utteranceRef.current = utter;
      setState("speaking");
      synth.speak(utter);
    },
    [isSupported, profile, voices],
  );

  const pause = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.pause();
    setState("paused");
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;
    window.speechSynthesis.resume();
    setState("speaking");
  }, [isSupported]);

  return { state, isSupported, speak, pause, resume, stop };
}
