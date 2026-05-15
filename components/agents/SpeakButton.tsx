"use client";

import { useSpeech } from "@/lib/voice/useSpeech";
import { AGENT_LABELS, type AgentId } from "@/lib/agents/ids";

interface Props {
  agent: AgentId;
  /** Texto a leer en voz alta. Vacío o nulo deshabilita el botón. */
  text?: string;
  /** Tamaño visual del botón. */
  size?: "sm" | "md";
  className?: string;
}

/**
 * Botón discreto para reproducir la voz del agente con la Web Speech API.
 *
 * - Si el navegador no soporta la API, no se renderiza nada (no rompe el layout).
 * - Si el texto aún no llegó, se muestra deshabilitado.
 * - Estados: idle/loading → "Escuchar", speaking → "Pausar", paused → "Continuar".
 *   Botón secundario "Detener" aparece en speaking/paused.
 */
export function SpeakButton({ agent, text, size = "sm", className = "" }: Props) {
  const { state, isSupported, speak, pause, resume, stop } = useSpeech({ agent });

  if (!isSupported) return null;

  const hasText = !!text && text.trim().length > 0;
  const isSpeaking = state === "speaking";
  const isPaused = state === "paused";
  const disabled = !hasText || state === "loading";

  const label = isSpeaking
    ? "Pausar"
    : isPaused
      ? "Continuar"
      : "Escuchar";

  const aria = isSpeaking
    ? `Pausar la voz de ${AGENT_LABELS[agent]}`
    : isPaused
      ? `Continuar la voz de ${AGENT_LABELS[agent]}`
      : `Escuchar a ${AGENT_LABELS[agent]} en voz alta`;

  function handlePrimary() {
    if (isSpeaking) return pause();
    if (isPaused) return resume();
    if (text) speak(text);
  }

  const sizeClasses =
    size === "md"
      ? "h-8 px-3 text-xs"
      : "h-7 px-2.5 text-[11px]";

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
      {(isSpeaking || isPaused) && (
        <button
          type="button"
          onClick={stop}
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
