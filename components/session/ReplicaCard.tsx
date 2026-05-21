import { AgentFace } from "@/components/agents/AgentFace";
import { SpeakButton } from "@/components/agents/SpeakButton";
import { StreamingAgentText } from "@/components/agents/StreamingAgentText";
import { AGENT_LABELS, type AgentId } from "@/lib/agents/ids";

type State = "streaming" | "complete" | "skipped";

interface Props {
  speaker: AgentId;
  respondingTo: AgentId;
  text: string;
  state: State;
  /** Fuerza deshabilitar el SpeakButton. */
  speakButtonDisabled?: boolean;
  /** Detiene todo audio activo antes de iniciar reproducción manual. */
  onBeforePlay?: () => void;
}

const STATE_DOT: Record<State, string> = {
  streaming: "bg-accent animate-pulse",
  complete: "bg-emerald-500/80",
  skipped: "bg-muted/40",
};

const STATE_LABEL: Record<State, string> = {
  streaming: "Hablando",
  complete: "",
  skipped: "Sin contradicción",
};

/**
 * D5 · Card de réplica. Etiquetada con "X responde a Y" y flecha visual.
 * Tipográficamente distinta de las cards de fase 1: una sola card ancha.
 */
export function ReplicaCard({
  speaker,
  respondingTo,
  text,
  state,
  speakButtonDisabled = false,
  onBeforePlay,
}: Props) {
  return (
    <article className="relative flex flex-col items-center gap-4 rounded-council border border-accent/40 bg-elevated p-6 text-center shadow-council">
      <span
        className="absolute -top-3 left-1/2 z-10 inline-flex -translate-x-1/2 items-center gap-2 rounded-full border border-accent/60 bg-background px-3 py-1 text-[11px] uppercase tracking-wider text-accent"
        aria-hidden
      >
        Una pregunta dura
      </span>

      <header className="flex w-full flex-col items-center justify-center gap-4 pt-1 md:flex-row md:flex-wrap">
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
          <AgentFace agent={speaker} size={40} mood="speaking" />
          <span className="font-sans text-sm font-semibold text-foreground">
            {AGENT_LABELS[speaker]}
          </span>
        </div>
        <Arrow />
        <div className="flex flex-col items-center gap-2 sm:flex-row sm:items-center">
          <span className="font-sans text-sm text-muted">le habla a</span>
          <div className="flex items-center gap-2">
            <AgentFace agent={respondingTo} size={32} mood="listening" />
            <span className="font-sans text-sm font-semibold text-foreground">
              {AGENT_LABELS[respondingTo]}
            </span>
          </div>
        </div>

        <div className="flex w-full items-center justify-center gap-2 text-[11px] uppercase tracking-wider text-muted md:ml-0 md:w-auto">
          <span className={`inline-block size-1.5 shrink-0 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state] ? (
            <span>{STATE_LABEL[state]}</span>
          ) : state === "complete" ? (
            <span className="sr-only">Listo</span>
          ) : null}
        </div>
      </header>

      <div className="w-full max-w-prose min-h-[4rem] text-left text-sm leading-relaxed text-foreground/90">
        {state === "skipped" ? (
          <p className="italic text-muted">
            Esta vez no se contradijeron en serio. La conversación sigue sin
            pelea de nadie.
          </p>
        ) : text ? (
          <StreamingAgentText
            text={text}
            streaming={state === "streaming"}
            className="whitespace-pre-wrap break-words"
          />
        ) : (
          <p className="text-muted/70">
            <span
              className="typing-dots inline-flex align-middle"
              style={{ color: "var(--accent)" }}
              aria-label="Está pensando"
            >
              <span />
              <span />
              <span />
            </span>
          </p>
        )}
      </div>

      {state === "complete" && text && (
        <footer className="flex w-full max-w-prose flex-col items-center gap-3 border-t border-border/40 pt-3 sm:flex-row sm:justify-between">
          <span className="text-[10px] uppercase tracking-wider text-subtle">
            Escucha la pregunta de {AGENT_LABELS[speaker]}
          </span>
          <SpeakButton agent={speaker} text={text} forceDisabled={speakButtonDisabled} onBeforePlay={onBeforePlay} />
        </footer>
      )}
    </article>
  );
}

function Arrow() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="var(--accent)"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
    >
      <line x1="5" y1="12" x2="19" y2="12" />
      <polyline points="12 5 19 12 12 19" />
    </svg>
  );
}
