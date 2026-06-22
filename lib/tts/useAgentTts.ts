"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { loadAuthSession } from "@/lib/auth/client";
import type { AgentId } from "@/lib/agents/ids";

export type TtsStatus = "idle" | "loading" | "playing" | "paused";

interface TtsQueueItem {
  agent: AgentId | "synthesis";
  text: string;
}

interface UseAgentTtsReturn {
  status: TtsStatus;
  currentSpeaker: AgentId | "synthesis" | null;
  enqueue: (agent: AgentId | "synthesis", text: string) => void;
  pause: () => void;
  resume: () => void;
  stop: () => void;
  clearQueue: () => void;
}

async function fetchTtsAudio(
  text: string,
  agent: string,
  signal?: AbortSignal,
): Promise<ArrayBuffer | null> {
  const session = loadAuthSession();
  if (!session) return null;

  const res = await fetch("/api/tts", {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ text, agent }),
    signal,
  });

  if (!res.ok) return null;
  return res.arrayBuffer();
}

export function useAgentTts(enabled: boolean): UseAgentTtsReturn {
  const [status, setStatus] = useState<TtsStatus>("idle");
  const [currentSpeaker, setCurrentSpeaker] = useState<AgentId | "synthesis" | null>(null);

  const queueRef = useRef<TtsQueueItem[]>([]);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const processingRef = useRef(false);
  const enabledRef = useRef(enabled);

  useEffect(() => {
    enabledRef.current = enabled;
    if (!enabled) {
      stopAll();
    }
  }, [enabled]);

  const stopAll = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;

    if (audioRef.current) {
      audioRef.current.pause();
      if (audioRef.current.src) {
        URL.revokeObjectURL(audioRef.current.src);
      }
      audioRef.current = null;
    }

    queueRef.current = [];
    processingRef.current = false;
    setStatus("idle");
    setCurrentSpeaker(null);
  }, []);

  const processQueue = useCallback(async () => {
    if (processingRef.current) return;
    if (!enabledRef.current) return;

    const item = queueRef.current.shift();
    if (!item) {
      setStatus("idle");
      setCurrentSpeaker(null);
      return;
    }

    processingRef.current = true;
    setStatus("loading");
    setCurrentSpeaker(item.agent);

    abortRef.current = new AbortController();

    try {
      const buffer = await fetchTtsAudio(
        item.text,
        item.agent,
        abortRef.current.signal,
      );

      if (!buffer || !enabledRef.current) {
        processingRef.current = false;
        processQueue();
        return;
      }

      const blob = new Blob([buffer], { type: "audio/mpeg" });
      const url = URL.createObjectURL(blob);

      const audio = new Audio(url);
      audioRef.current = audio;

      audio.addEventListener("ended", () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        processingRef.current = false;
        processQueue();
      });

      audio.addEventListener("error", () => {
        URL.revokeObjectURL(url);
        audioRef.current = null;
        processingRef.current = false;
        processQueue();
      });

      setStatus("playing");
      await audio.play();
    } catch {
      processingRef.current = false;
      if (enabledRef.current && queueRef.current.length > 0) {
        processQueue();
      } else {
        setStatus("idle");
        setCurrentSpeaker(null);
      }
    }
  }, []);

  const enqueue = useCallback(
    (agent: AgentId | "synthesis", text: string) => {
      if (!enabledRef.current) return;
      if (!text.trim()) return;

      queueRef.current.push({ agent, text });

      if (!processingRef.current) {
        processQueue();
      }
    },
    [processQueue],
  );

  const pause = useCallback(() => {
    if (audioRef.current && status === "playing") {
      audioRef.current.pause();
      setStatus("paused");
    }
  }, [status]);

  const resume = useCallback(() => {
    if (audioRef.current && status === "paused") {
      audioRef.current.play();
      setStatus("playing");
    }
  }, [status]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
      if (audioRef.current) {
        audioRef.current.pause();
        if (audioRef.current.src) {
          URL.revokeObjectURL(audioRef.current.src);
        }
      }
    };
  }, []);

  return {
    status,
    currentSpeaker,
    enqueue,
    pause,
    resume,
    stop: stopAll,
    clearQueue: useCallback(() => {
      queueRef.current = [];
    }, []),
  };
}
