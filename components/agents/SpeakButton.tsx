"use client";

import { useSpeech } from "@/lib/voice/useSpeech";
import { AGENT_LABELS, type AgentId } from "@/lib/agents/ids";

interface Props {
  agent: AgentId;
  text?: string;
  size?: "sm" | "md";
  className?: string;
  forceDisabled?: boolean;
  onBeforePlay?: () => void;
  /** El auto-playback secuencial está reproduciendo ESTE agente ahora. */
  isAutoPlaying?: boolean;
  /** El auto-playback está en pausa. */
  autoPlayPaused?: boolean;
  onPauseAutoPlay?: () => void;
  onResumeAutoPlay?: () => void;
}

export function SpeakButton({
  agent,
  text,
  size = "sm",
  className = "",
  forceDisabled = false,
  onBeforePlay,
  isAutoPlaying = false,
  autoPlayPaused = false,
  onPauseAutoPlay,
  onResumeAutoPlay,
}: Props) {
  const { state, isSupported, speak, pause, resume, stop } = useSpeech({ agent });

  if (!isSupported) return null;

  const hasText = !!text && text.trim().length > 0;

  const isSpeaking = isAutoPlaying ? !autoPlayPaused : state === "speaking";
  const isPaused = isAutoPlaying ? autoPlayPaused : state === "paused";
  const isActive = isSpeaking || isPaused;
  const disabled =
    forceDisabled || !hasText || (!isAutoPlaying && state === "loading");

  const label = isSpeaking ? "Pausar" : isPaused ? "Continuar" : "Escuchar";

  const aria = isSpeaking
    ? `Pausar la voz de ${AGENT_LABELS[agent]}`
    : isPaused
      ? `Continuar la voz de ${AGENT_LABELS[agent]}`
      : `Escuchar a ${AGENT_LABELS[agent]} en voz alta`;

  function handlePrimary() {
    if (isAutoPlaying) {
      if (autoPlayPaused) {
        onResumeAutoPlay?.();
      } else {
        onPauseAutoPlay?.();
      }
      return;
    }
    if (state === "speaking") return pause();
    if (state === "paused") return resume();
    if (text) {
      onBeforePlay?.();
      speak(text);
    }
  }

  function handleStop() {
    if (isAutoPlaying) {
      onBeforePlay?.();
      return;
    }
    stop();
  }

  const sizeClasses =
    size === "md" ? "h-8 px-3 text-xs" : "h-7 px-2.5 text-[11px]";

  return (
    <div className={`inline-flex items-center gap-1.5 ${className}`}>
      <button
        type="button"
        onClick={handlePrimary}
        disabled={disabled}
        aria-label={aria}
        title={aria}
        className={`inline-flex items-center gap-1.5 rounded-full border border-border bg-background/60 font-medium uppercase tracking-wider text-muted transition hover:border-accent/50 hover:text-foreground disabled:cursor-not-allowed disabled:opacity-40 ${sizeClasses}`}
      >
        <SpeakerIcon
          state={isSpeaking ? "speaking" : isPaused ? "paused" : "idle"}
          color={`var(--${agent})`}
        />
        <span>{label}</span>
      </button>
      {isActive && (
        <button
          type="button"
          onClick={handleStop}
          aria-label={`Detener la voz de ${AGENT_LABELS[agent]}`}
          title={`Detener la voz de ${AGENT_LABELS[agent]}`}
          className={`inline-flex items-center justify-center rounded-full border border-border bg-background/60 text-muted transition hover:border-error/50 hover:text-error ${size === "md" ? "h-8 w-8" : "h-7 w-7"}`}
        >
          <StopIcon />
        </button>
      )}
    </div>
  );
}

function SpeakerIcon({
  state,
  color,
}: {
  state: "idle" | "speaking" | "paused";
  color: string;
}) {
  return (
    <svg
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke={color}
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      style={{
        animation:
          state === "speaking"
            ? "speak-pulse 1.1s ease-in-out infinite"
            : undefined,
      }}
    >
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      {state !== "idle" && <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />}
      {state === "speaking" && (
        <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      )}
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      width="10"
      height="10"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden
    >
      <rect x="6" y="6" width="12" height="12" rx="1.5" />
    </svg>
  );
}
