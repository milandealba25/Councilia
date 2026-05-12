import { AgentAvatar } from "@/components/agents/AgentAvatar";
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
  complete: "bg-emerald-400",
  skipped: "bg-muted/40",
};

const STATE_LABEL: Record<State, string> = {
  streaming: "En vivo",
  complete: "Réplica completa",
  skipped: "Sin réplica",
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
    <article className="relative flex flex-col gap-4 rounded-council border border-accent-muted/50 bg-elevated p-6 shadow-council">
      <span
        className="absolute -top-3 left-6 inline-flex items-center gap-2 rounded-full border border-accent-muted bg-background px-3 py-1 text-[11px] font-mono uppercase tracking-wider text-accent"
        aria-hidden
      >
        Fase 2 · Réplica
      </span>

      <header className="flex flex-wrap items-center gap-3 pt-1">
        <div className="flex items-center gap-2">
          <AgentAvatar agent={speaker} size={36} />
          <span className="font-sans text-sm font-semibold text-foreground">
            {AGENT_LABELS[speaker]}
          </span>
        </div>
        <Arrow />
        <div className="flex items-center gap-2">
          <span className="font-sans text-sm text-muted">responde a</span>
          <AgentAvatar agent={respondingTo} size={28} />
          <span className="font-sans text-sm font-semibold text-foreground">
            {AGENT_LABELS[respondingTo]}
          </span>
        </div>

        <div className="ml-auto flex items-center gap-2 text-[11px] uppercase tracking-wider text-muted">
          <span className={`inline-block size-1.5 rounded-full ${STATE_DOT[state]}`} />
          {STATE_LABEL[state]}
          {tensionScore !== undefined && state !== "skipped" && (
            <span className="ml-2 font-mono text-muted/70">
              t={tensionScore.toFixed(2)}
            </span>
          )}
        </div>
      </header>

      <div className="text-sm leading-relaxed text-foreground/90">
        {state === "skipped" ? (
          <p className="italic text-muted">
            El detector no encontró una contradicción significativa entre las
            posturas iniciales. El flujo continúa sin réplica.
          </p>
        ) : text ? (
          <p>{text}</p>
        ) : (
          <p className="italic text-muted/70">Preparando réplica…</p>
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
