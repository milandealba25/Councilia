import { AgentFace } from "./AgentFace";
import { SpeakButton } from "./SpeakButton";
import { StreamingAgentText } from "./StreamingAgentText";
import {
  AGENT_DOMINANT_QUESTION,
  AGENT_LABELS,
  type AgentId,
} from "@/lib/agents/ids";

type State = "idle" | "streaming" | "complete" | "error";

interface AgentCardProps {
  agent: AgentId;
  state?: State;
  text?: string;
  className?: string;
  /** Se dispara cuando el texto terminó de revelarse (mecanografía al día). Solo en turnos con texto. */
  onRevealComplete?: () => void;
  /** Si el usuario está escribiendo en el textarea, los rostros “escuchan”. */
  isUserTyping?: boolean;
  /**
   * El agente fue atenuado por la encuesta (doc 04, §8): no participa en
   * fase 1 pero sí en la síntesis. La tarjeta lo comunica explícitamente
   * para no parecer "perdida" o "esperando".
   */
  attenuated?: boolean;
  /** Mensaje de error que viene del servidor (cuando `state === "error"`). */
  errorMessage?: string;
  /** Fuerza deshabilitar el SpeakButton (turno secuencial aún no llegó). */
  speakButtonDisabled?: boolean;
  /** Detiene todo audio activo antes de iniciar reproducción manual. */
  onBeforePlay?: () => void;
}

const STATE_LABEL: Record<State, string> = {
  idle: "Te escucha",
  streaming: "Está pensando…",
  complete: "",
  error: "Algo se cortó",
};

const STATE_DOT: Record<State, string> = {
  idle: "bg-muted/40",
  streaming: "bg-accent animate-pulse",
  complete: "bg-emerald-500/80",
  error: "bg-error",
};

const VARS: Record<AgentId, string> = {
  marco: "var(--marco)",
  elena: "var(--elena)",
  rafael: "var(--rafael)",
};

export function AgentCard({
  agent,
  state = "idle",
  text,
  className = "",
  onRevealComplete,
  isUserTyping = false,
  attenuated = false,
  errorMessage,
  speakButtonDisabled = false,
  onBeforePlay,
}: AgentCardProps) {
  const mood =
    state === "streaming"
      ? text && text.length > 0
        ? "speaking"
        : "thinking"
      : attenuated
        ? "calm"
        : isUserTyping
          ? "listening"
          : "calm";

  const isTyping = state === "streaming" && !text;
  const isError = state === "error";

  const statusLabel = attenuated && state === "idle"
    ? "En voz baja hoy"
    : STATE_LABEL[state];
  const statusDot = attenuated && state === "idle"
    ? "bg-tension/60"
    : STATE_DOT[state];

  return (
    <article
      data-state={state}
      data-attenuated={attenuated ? "true" : undefined}
      className={`group relative flex min-h-[280px] flex-col items-center gap-4 rounded-council border border-border bg-elevated p-6 text-center shadow-council transition hover:border-accent/40 data-[attenuated=true]:opacity-75 ${className}`}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-[2px] opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${VARS[agent]}, transparent)`,
        }}
      />

      <header className="flex w-full flex-col items-center gap-3">
        <AgentFace agent={agent} size={56} mood={mood} />
        <div className="flex flex-col items-center gap-0.5">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {AGENT_LABELS[agent]}
          </h3>
        </div>
        <div className="flex items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span
            className={`inline-block size-1.5 shrink-0 rounded-full ${statusDot}`}
          />
          {statusLabel ? (
            <span>{statusLabel}</span>
          ) : state === "complete" ? (
            <span className="sr-only">Listo</span>
          ) : null}
        </div>
      </header>

      <p className="w-full max-w-prose text-center text-xs italic leading-relaxed text-muted/90">
        {AGENT_DOMINANT_QUESTION[agent]}
      </p>

      <div className="mt-1 w-full max-w-prose flex-1 min-h-[4.5rem] text-left text-sm leading-relaxed text-foreground/90 break-words">
        {isTyping ? (
          <span
            className="typing-dots inline-flex"
            style={{ color: `var(--${agent})` }}
            aria-label={`${AGENT_LABELS[agent]} está escribiendo`}
          >
            <span />
            <span />
            <span />
          </span>
        ) : text ? (
          <StreamingAgentText
            text={text}
            streaming={state === "streaming"}
            onRevealComplete={onRevealComplete}
            className="whitespace-pre-wrap break-words"
          />
        ) : isError ? (
          <span className="text-error/90">
            {errorMessage ??
              "Algo se cortó. Vuelve a intentarlo en un momento."}
          </span>
        ) : (
          <span className="text-muted/70">
            {attenuated
              ? "Hoy escucha en voz baja. Vas a oírlo en la síntesis final, no en este turno."
              : isUserTyping
                ? "Te está escuchando…"
                : "Aquí va a aparecer lo que te diga, en cuanto empiece a hablar."}
          </span>
        )}
      </div>

      {state === "complete" && text && (
        <footer className="flex w-full max-w-prose flex-col items-center gap-3 border-t border-border/40 pt-3 sm:flex-row sm:justify-between">
          <span className="text-[10px] uppercase tracking-wider text-subtle">
            Escúchalo en su voz
          </span>
          <SpeakButton agent={agent} text={text} forceDisabled={speakButtonDisabled} onBeforePlay={onBeforePlay} />
        </footer>
      )}
    </article>
  );
}
