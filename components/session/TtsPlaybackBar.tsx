"use client";

import { AGENT_LABELS, type AgentId } from "@/lib/agents/ids";
import type { TtsStatus } from "@/lib/tts/useAgentTts";

interface TtsPlaybackBarProps {
  status: TtsStatus;
  currentSpeaker: AgentId | "synthesis" | null;
  onPause: () => void;
  onResume: () => void;
  onStop: () => void;
}

const SPEAKER_NAMES: Record<string, string> = {
  ...AGENT_LABELS,
  synthesis: "Síntesis",
};

export function TtsPlaybackBar({
  status,
  currentSpeaker,
  onPause,
  onResume,
  onStop,
}: TtsPlaybackBarProps) {
  if (status === "idle") return null;

  const speakerName = currentSpeaker ? SPEAKER_NAMES[currentSpeaker] ?? "Agente" : "";

  return (
    <div
      className="mx-auto flex w-full max-w-3xl items-center gap-3 rounded-full border border-accent/40 bg-elevated/95 px-4 py-2.5 shadow-council backdrop-blur-lg"
      role="region"
      aria-label="Control de voz"
      style={{ animation: "soft-rise 300ms ease-out both" }}
    >
      <SoundWaveIcon
        animated={status === "playing"}
        className="shrink-0 text-accent"
      />

      <div className="flex min-w-0 flex-1 flex-col">
        <span className="truncate text-sm font-medium text-foreground">
          {status === "loading"
            ? `Preparando voz de ${speakerName}...`
            : status === "paused"
              ? `${speakerName} en pausa`
              : `${speakerName} está hablando`}
        </span>
      </div>

      <div className="flex items-center gap-1.5">
        {status === "playing" ? (
          <button
            type="button"
            onClick={onPause}
            className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-foreground/80 transition hover:bg-accent/10 hover:text-accent"
            aria-label="Pausar"
          >
            <PauseIcon />
          </button>
        ) : status === "paused" ? (
          <button
            type="button"
            onClick={onResume}
            className="inline-flex size-9 items-center justify-center rounded-full border border-accent/60 bg-accent/10 text-accent transition hover:bg-accent/20"
            aria-label="Continuar"
          >
            <PlayIcon />
          </button>
        ) : (
          <span className="inline-flex size-9 items-center justify-center">
            <LoadingDots />
          </span>
        )}
        <button
          type="button"
          onClick={onStop}
          className="inline-flex size-9 items-center justify-center rounded-full border border-border/60 bg-background/80 text-muted transition hover:bg-error/10 hover:text-error"
          aria-label="Detener"
        >
          <StopIcon />
        </button>
      </div>
    </div>
  );
}

function PauseIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="6" y="4" width="4" height="16" rx="1" />
      <rect x="14" y="4" width="4" height="16" rx="1" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
      <rect x="4" y="4" width="16" height="16" rx="2" />
    </svg>
  );
}

function SoundWaveIcon({ animated, className }: { animated: boolean; className?: string }) {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <line x1="4" y1="8" x2="4" y2="16" className={animated ? "animate-tts-bar1" : ""} />
      <line x1="8" y1="5" x2="8" y2="19" className={animated ? "animate-tts-bar2" : ""} />
      <line x1="12" y1="3" x2="12" y2="21" className={animated ? "animate-tts-bar3" : ""} />
      <line x1="16" y1="5" x2="16" y2="19" className={animated ? "animate-tts-bar2" : ""} />
      <line x1="20" y1="8" x2="20" y2="16" className={animated ? "animate-tts-bar1" : ""} />
    </svg>
  );
}

function LoadingDots() {
  return (
    <span className="typing-dots inline-flex" style={{ color: "var(--accent)" }} aria-label="Cargando">
      <span />
      <span />
      <span />
    </span>
  );
}
