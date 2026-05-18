"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  AGENT_VOICE_PROFILES,
  type AgentVoiceProfile,
} from "./voiceProfiles";
import type { AgentId } from "@/lib/agents/ids";
import {
  startVoiceContextPlayback,
  unlockVoicePlayback,
  type VoicePlaybackHandle,
} from "./audioContextPlayer";

/**
 * Hook de voz por agente:
 * - Primer intento: ElevenLabs vía `/api/voice/tts`.
 * - Fallback: Web Speech API del navegador.
 *
 * Mantiene una sola reproducción activa por hook.
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
  const voicePlaybackRef = useRef<VoicePlaybackHandle | null>(null);
  const modeRef = useRef<"none" | "eleven" | "webspeech">("none");
  const profile = AGENT_VOICE_PROFILES[agent];

  const isSupported = useMemo(
    () => typeof window !== "undefined",
    [],
  );

  useEffect(() => {
    if (!isSupported) {
      setState("unsupported");
      return;
    }

    setState("idle");

    if (
      typeof window.speechSynthesis === "undefined" ||
      typeof window.SpeechSynthesisUtterance === "undefined"
    ) {
      return;
    }

    const synth = window.speechSynthesis;

    function loadVoices() {
      const list = synth.getVoices();
      if (list.length > 0) {
        setVoices(list);
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

  const cleanupAudio = useCallback(() => {
    voicePlaybackRef.current?.stop();
    voicePlaybackRef.current = null;
  }, []);

  const stop = useCallback(() => {
    if (!isSupported) return;

    if (modeRef.current === "eleven") {
      cleanupAudio();
    }

    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }

    utteranceRef.current = null;
    modeRef.current = "none";
    setState("idle");
  }, [cleanupAudio, isSupported]);

  // Garantizamos limpieza si el componente se desmonta mientras habla.
  useEffect(() => {
    return () => {
      if (typeof window === "undefined") return;
      cleanupAudio();
      if (typeof window.speechSynthesis !== "undefined") {
        window.speechSynthesis.cancel();
      }
    };
  }, [cleanupAudio]);

  const speakWithWebSpeech = useCallback(
    (rawText: string) => {
      if (
        typeof window === "undefined" ||
        typeof window.speechSynthesis === "undefined" ||
        typeof window.SpeechSynthesisUtterance === "undefined"
      ) {
        setState("unsupported");
        return;
      }
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
          modeRef.current = "none";
          setState("idle");
        }
      };
      utter.onerror = () => {
        if (utteranceRef.current === utter) {
          utteranceRef.current = null;
          modeRef.current = "none";
          setState("idle");
        }
      };
      utter.onpause = () => setState("paused");
      utter.onresume = () => setState("speaking");

      utteranceRef.current = utter;
      modeRef.current = "webspeech";
      setState("speaking");
      synth.speak(utter);
    },
    [profile, voices],
  );

  const speak = useCallback(
    (rawText: string) => {
      if (!isSupported) return;
      const text = rawText.trim();
      if (text.length === 0) return;

      stop();
      setState("loading");

      void (async () => {
        let blob: Blob | null = null;
        try {
          const res = await fetch("/api/voice/tts", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ agent, text }),
          });
          if (!res.ok) {
            throw new Error(`tts_http_${res.status}`);
          }
          blob = await res.blob();
          if (blob.size === 0) {
            throw new Error("tts_empty_audio");
          }
        } catch {
          // Fallback robusto si no hay key, cuota, red, etc.
          speakWithWebSpeech(text);
          return;
        }

        try {
          await unlockVoicePlayback();
          const handle = await startVoiceContextPlayback(blob);
          voicePlaybackRef.current = handle;
          modeRef.current = "eleven";
          setState("speaking");
          await handle.done;
          if (voicePlaybackRef.current === handle) {
            voicePlaybackRef.current = null;
            modeRef.current = "none";
            setState("idle");
          }
        } catch {
          // Si Eleven respondió OK pero el navegador bloquea autoplay o falla
          // la reproducción, caemos a voz local para evitar silencio total.
          cleanupAudio();
          modeRef.current = "none";
          speakWithWebSpeech(text);
        }
      })();
    },
    [agent, cleanupAudio, isSupported, speakWithWebSpeech, stop],
  );

  const pause = useCallback(() => {
    if (!isSupported) return;

    if (modeRef.current === "eleven" && voicePlaybackRef.current) {
      void voicePlaybackRef.current.context.suspend();
      setState("paused");
      return;
    }
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.pause();
      setState("paused");
    }
  }, [isSupported]);

  const resume = useCallback(() => {
    if (!isSupported) return;

    if (modeRef.current === "eleven" && voicePlaybackRef.current) {
      void voicePlaybackRef.current.context.resume();
      setState("speaking");
      return;
    }
    if (typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.resume();
      setState("speaking");
    }
  }, [isSupported]);

  return { state, isSupported, speak, pause, resume, stop };
}
