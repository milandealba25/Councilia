import { AgentAvatar } from "./AgentAvatar";
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
}

const STATE_LABEL: Record<State, string> = {
  idle: "Esperando turno",
  streaming: "Pensando…",
  complete: "Postura completa",
  error: "Reintentar",
};

const STATE_DOT: Record<State, string> = {
  idle: "bg-muted/40",
  streaming: "bg-accent animate-pulse",
  complete: "bg-emerald-400",
  error: "bg-error",
};

/**
 * Card de postura del agente (B2). Variantes: idle, streaming, complete, error.
 * Layout estable cuando el texto cambia de longitud (min-height + tipograf\u00eda fija).
 */
export function AgentCard({
  agent,
  state = "idle",
  text,
  className = "",
}: AgentCardProps) {
  return (
    <article
      data-state={state}
      className={`group relative flex min-h-[280px] flex-col gap-4 rounded-council border border-border bg-elevated p-6 shadow-council transition hover:border-accent-muted/60 ${className}`}
    >
      <header className="flex items-start gap-4">
        <AgentAvatar agent={agent} size={48} />
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
            className={`inline-block size-1.5 rounded-full ${STATE_DOT[state]}`}
          />
          {STATE_LABEL[state]}
        </div>
      </header>

      <p className="text-xs italic leading-relaxed text-muted/90">
        {AGENT_DOMINANT_QUESTION[agent]}
      </p>

      <div className="mt-1 flex-1 text-sm leading-relaxed text-foreground/90">
        {text ?? (
          <span className="text-muted/70">
            La postura inicial aparecer\u00e1 aqu\u00ed con streaming desde el primer
            token.
          </span>
        )}
      </div>
    </article>
  );
}
