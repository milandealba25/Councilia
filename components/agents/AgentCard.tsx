import { AgentFace } from "./AgentFace";
import {
  AGENT_DOMINANT_QUESTION,
  AGENT_LABELS,
  AGENT_ROLES,
  type AgentId,
} from "@/lib/agents/ids";

type State = "idle" | "streaming" | "complete" | "error";

interface AgentCardProps {
  agent: AgentId;
  state?: State;
  text?: string;
  className?: string;
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
}

const STATE_LABEL: Record<State, string> = {
  idle: "Te escucha",
  streaming: "Está pensando…",
  complete: "Terminó de hablar",
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
  isUserTyping = false,
  attenuated = false,
  errorMessage,
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
      className={`group relative flex min-h-[280px] flex-col gap-4 rounded-council border border-border bg-elevated p-6 shadow-council transition hover:border-accent/40 data-[attenuated=true]:opacity-75 ${className}`}
    >
      <div
        aria-hidden
        className="absolute inset-x-0 -top-px h-[2px] opacity-70"
        style={{
          background: `linear-gradient(90deg, transparent, ${VARS[agent]}, transparent)`,
        }}
      />

      <header className="flex items-start gap-4">
        <AgentFace agent={agent} size={56} mood={mood} />
        <div className="flex flex-1 flex-col">
          <h3 className="font-sans text-base font-semibold text-foreground">
            {AGENT_LABELS[agent]}
          </h3>
          <p className="text-xs uppercase tracking-wider text-muted">
            {AGENT_ROLES[agent]}
          </p>
        </div>
        <div className="flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span
            className={`inline-block size-1.5 rounded-full ${statusDot}`}
          />
          {statusLabel}
        </div>
      </header>

      <p className="text-xs italic leading-relaxed text-muted/90">
        {AGENT_DOMINANT_QUESTION[agent]}
      </p>

      <div className="mt-1 flex-1 text-sm leading-relaxed text-foreground/90">
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
          text
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
    </article>
  );
}
