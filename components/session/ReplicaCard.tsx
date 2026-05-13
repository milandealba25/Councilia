import { AgentFace } from "@/components/agents/AgentFace";
import { AGENT_LABELS, type AgentId } from "@/lib/agents/ids";

type State = "streaming" | "complete" | "skipped";

interface Props {
  speaker: AgentId;
  respondingTo: AgentId;
  text: string;
  state: State;
  tensionScore?: number;
}

const STATE_DOT: Record<State, string> = {
  streaming: "bg-accent animate-pulse",
  complete: "bg-emerald-500/80",
  skipped: "bg-muted/40",
};

const STATE_LABEL: Record<State, string> = {
  streaming: "Hablando",
  complete: "Terminó de hablar",
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
  tensionScore,
}: Props) {
  return (
    <article className="relative flex flex-col gap-4 rounded-council border border-accent/40 bg-elevated p-6 shadow-council">
      <span
        className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-accent/60 bg-background px-3 py-1 text-[11px] uppercase tracking-wider text-accent"
        aria-hidden
      >
        Una pregunta dura
      </span>

      <header className="flex flex-wrap items-center gap-3 pt-1">
        <div className="flex items-center gap-2">
          <AgentFace agent={speaker} size={40} mood="speaking" />
          <span className="font-sans text-sm font-semibold text-foreground">
            {AGENT_LABELS[speaker]}
          </span>
        </div>
        <Arrow />
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm text-muted">le habla a</span>
          <AgentFace agent={respondingTo} size={32} mood="listening" />
          <span className="font-sans text-sm font-semibold text-foreground">
            {AGENT_LABELS[respondingTo]}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span className={`inline-block size-1.5 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state]}
        </div>
      </header>

      <div className="text-sm leading-relaxed text-foreground/90">
        {state === "skipped" ? (
          <p className="italic text-muted">
            Esta vez no se contradijeron en serio. La conversación sigue sin
            pelea de nadie.
          </p>
        ) : text ? (
          <p>{text}</p>
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
        {tensionScore !== undefined && state !== "skipped" && (
          <p className="mt-3 text-[10px] uppercase tracking-wider text-subtle">
            Intensidad del desacuerdo · {Math.round(tensionScore * 100)}%
          </p>
        )}
      </div>
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
