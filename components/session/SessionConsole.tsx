"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadUserContext } from "@/lib/survey/storage";
import type { UserContext } from "@/lib/survey/survey.v1";
import { AGENT_IDS, AGENT_LABELS, type AgentId } from "@/lib/agents/ids";
import { AgentCard } from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/Button";
import { ReplicaCard } from "./ReplicaCard";
import { SynthesisCard } from "./SynthesisCard";
import { PhaseIndicator, type Phase } from "./PhaseIndicator";
import {
  requestSynthesis,
  streamInitial,
  streamReplica,
  type InitialEvent,
  type ReplicaEvent,
} from "@/lib/api/client";
import type { Synthesis } from "@/orchestrator/synthesis";

/**
 * Máquina de estados de una sesión (doc 05, §1).
 *
 *   idle ──submit──▶ fase1 ──todos done──▶ fase2 (replica | skipped)
 *                                       └──▶ wait
 *                                              └──submit synth──▶ fase4
 *
 * El usuario puede volver a enviar un mensaje en `wait` para reiniciar a fase1
 * con su nuevo turno (doc 05, §1.3).
 */

type AgentState = "idle" | "streaming" | "complete" | "error";

interface AgentSlot {
  state: AgentState;
  text: string;
  error?: string;
}

const INITIAL_AGENT_STATE: Record<AgentId, AgentSlot> = {
  marco: { state: "idle", text: "" },
  elena: { state: "idle", text: "" },
  rafael: { state: "idle", text: "" },
};

interface ReplicaState {
  speaker: AgentId;
  respondingTo: AgentId;
  text: string;
  tensionScore: number;
  state: "streaming" | "complete";
}

interface State {
  ctx: UserContext | null;
  phase: Phase;
  userInput: string;
  lastUserMessage: string | null;
  agents: Record<AgentId, AgentSlot>;
  attenuated: AgentId[];
  replica: ReplicaState | "skipped" | null;
  synthesis: Synthesis | null;
  crisis: string[] | null;
  error: string | null;
  loading: boolean;
}

type Action =
  | { type: "ctx_loaded"; ctx: UserContext }
  | { type: "user_input"; value: string }
  | { type: "submit_user"; message: string }
  | { type: "initial_event"; event: InitialEvent }
  | { type: "phase1_done" }
  | { type: "replica_event"; event: ReplicaEvent }
  | { type: "replica_done" }
  | { type: "request_synthesis_start" }
  | { type: "synthesis_done"; synthesis: Synthesis }
  | { type: "synthesis_error"; message: string }
  | { type: "fatal"; message: string }
  | { type: "reset_after_crisis" };

const INITIAL_STATE: State = {
  ctx: null,
  phase: "idle",
  userInput: "",
  lastUserMessage: null,
  agents: INITIAL_AGENT_STATE,
  attenuated: [],
  replica: null,
  synthesis: null,
  crisis: null,
  error: null,
  loading: false,
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ctx_loaded":
      return { ...state, ctx: action.ctx };

    case "user_input":
      return { ...state, userInput: action.value };

    case "submit_user":
      return {
        ...state,
        userInput: "",
        lastUserMessage: action.message,
        agents: INITIAL_AGENT_STATE,
        attenuated: [],
        replica: null,
        synthesis: null,
        crisis: null,
        error: null,
        loading: true,
        phase: "fase1",
      };

    case "initial_event":
      return applyInitialEvent(state, action.event);

    case "phase1_done":
      return { ...state, phase: "fase2" };

    case "replica_event":
      return applyReplicaEvent(state, action.event);

    case "replica_done":
      return {
        ...state,
        phase: "wait",
        loading: false,
        replica:
          state.replica && state.replica !== "skipped"
            ? { ...state.replica, state: "complete" }
            : state.replica,
      };

    case "request_synthesis_start":
      return { ...state, loading: true, phase: "fase4", error: null };

    case "synthesis_done":
      return {
        ...state,
        loading: false,
        synthesis: action.synthesis,
      };

    case "synthesis_error":
      return {
        ...state,
        loading: false,
        error: action.message,
        phase: "wait",
      };

    case "fatal":
      return {
        ...state,
        loading: false,
        error: action.message,
        agents: markAllError(state.agents, action.message),
      };

    case "reset_after_crisis":
      return INITIAL_STATE;
  }
}

function applyInitialEvent(state: State, ev: InitialEvent): State {
  if (ev.type === "meta") {
    const next = { ...state.agents };
    for (const id of ev.activeAgents) {
      next[id] = { ...next[id], state: "streaming" };
    }
    return { ...state, agents: next, attenuated: ev.attenuated };
  }
  if (ev.type === "delta") {
    return {
      ...state,
      agents: {
        ...state.agents,
        [ev.agent]: {
          state: "streaming",
          text: (state.agents[ev.agent]?.text ?? "") + ev.text,
        },
      },
    };
  }
  if (ev.type === "done") {
    return {
      ...state,
      agents: {
        ...state.agents,
        [ev.agent]: { ...state.agents[ev.agent], state: "complete" },
      },
    };
  }
  if (ev.type === "error") {
    return {
      ...state,
      agents: {
        ...state.agents,
        [ev.agent]: {
          ...state.agents[ev.agent],
          state: "error",
          error: ev.error,
        },
      },
    };
  }
  if (ev.type === "crisis") {
    return { ...state, crisis: ev.categories, loading: false };
  }
  return state;
}

function applyReplicaEvent(state: State, ev: ReplicaEvent): State {
  if (ev.type === "skipped") {
    return { ...state, replica: "skipped" };
  }
  if (ev.type === "plan") {
    return {
      ...state,
      replica: {
        speaker: ev.speaker,
        respondingTo: ev.respondingTo,
        text: "",
        tensionScore: ev.tensionScore,
        state: "streaming",
      },
    };
  }
  if (ev.type === "delta" && state.replica && state.replica !== "skipped") {
    return {
      ...state,
      replica: { ...state.replica, text: state.replica.text + ev.text },
    };
  }
  return state;
}

function markAllError(
  agents: Record<AgentId, AgentSlot>,
  error: string,
): Record<AgentId, AgentSlot> {
  const next = { ...agents };
  for (const id of AGENT_IDS) {
    if (next[id].state === "streaming" || next[id].state === "idle") {
      next[id] = { ...next[id], state: "error", error };
    }
  }
  return next;
}

export function SessionConsole() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    const stored = loadUserContext();
    if (!stored) {
      router.replace("/onboarding");
      return;
    }
    dispatch({ type: "ctx_loaded", ctx: stored });
  }, [router]);

  useEffect(() => () => abortRef.current?.abort(), []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.ctx || state.loading) return;
    const message = state.userInput.trim();
    if (!message) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    dispatch({ type: "submit_user", message });

    try {
      const collected: Record<AgentId, string> = { marco: "", elena: "", rafael: "" };
      let crisis = false;
      for await (const ev of streamInitial({
        userContext: state.ctx,
        userMessage: message,
        signal: ctrl.signal,
      })) {
        dispatch({ type: "initial_event", event: ev });
        if (ev.type === "delta") collected[ev.agent] += ev.text;
        if (ev.type === "crisis") crisis = true;
      }
      if (crisis) return;

      dispatch({ type: "phase1_done" });

      const postures = AGENT_IDS
        .filter((id) => collected[id].trim().length > 0)
        .map((id) => ({ agent: id, text: collected[id].trim() }));

      if (postures.length < 2) {
        dispatch({ type: "replica_done" });
        return;
      }

      for await (const ev of streamReplica({
        userContext: state.ctx,
        userMessage: message,
        postures,
        signal: ctrl.signal,
      })) {
        dispatch({ type: "replica_event", event: ev });
      }
      dispatch({ type: "replica_done" });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({ type: "fatal", message: (err as Error).message });
    }
  }

  async function handleSynthesis() {
    if (!state.ctx || !state.lastUserMessage) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    dispatch({ type: "request_synthesis_start" });

    const transcript: Array<{ role: "user" | AgentId; text: string }> = [
      { role: "user", text: state.lastUserMessage },
      ...AGENT_IDS.filter((id) => state.agents[id].text.trim().length > 0).map(
        (id) => ({ role: id, text: state.agents[id].text.trim() }),
      ),
    ];
    if (state.replica && state.replica !== "skipped") {
      transcript.push({
        role: state.replica.speaker,
        text: state.replica.text.trim(),
      });
    }

    try {
      const synthesis = await requestSynthesis({
        userContext: state.ctx,
        transcript,
        signal: ctrl.signal,
      });
      dispatch({ type: "synthesis_done", synthesis });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({
        type: "synthesis_error",
        message: (err as Error).message,
      });
    }
  }

  if (!state.ctx) {
    return <p className="text-sm text-muted">Cargando contexto del council…</p>;
  }

  if (state.crisis) {
    return (
      <CrisisBanner
        categories={state.crisis}
        onReset={() => dispatch({ type: "reset_after_crisis" })}
      />
    );
  }

  const canSubmit =
    state.userInput.trim().length > 0 &&
    (state.phase === "idle" || state.phase === "wait");

  const canRequestSynthesis =
    state.phase === "wait" && !state.synthesis && !state.loading;

  return (
    <div className="flex flex-col gap-10">
      <div className="flex flex-col gap-4">
        <PhaseIndicator phase={state.phase} />
        <ContextStrip ctx={state.ctx} attenuated={state.attenuated} />
      </div>

      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="user-input"
          className="text-xs font-medium uppercase tracking-wider text-muted"
        >
          {state.phase === "wait" ? "Continúa la conversación" : "Tu situación"}
        </label>
        <textarea
          id="user-input"
          value={state.userInput}
          onChange={(e) =>
            dispatch({ type: "user_input", value: e.target.value })
          }
          maxLength={4000}
          rows={4}
          disabled={state.loading || state.phase === "fase4"}
          placeholder="Describe el dilema. Sin filtros: el council solo es útil con la versión cruda."
          className="resize-none rounded-council border border-border bg-elevated/60 px-4 py-3 font-sans text-sm leading-relaxed text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
        />
        <div className="flex items-center justify-between text-xs text-muted">
          <span>{state.userInput.length} / 4000</span>
          <div className="flex items-center gap-2">
            {canRequestSynthesis && (
              <Button
                type="button"
                variant="secondary"
                onClick={handleSynthesis}
              >
                Pedir síntesis
              </Button>
            )}
            <Button type="submit" disabled={!canSubmit || state.loading}>
              {state.loading
                ? "Deliberando…"
                : state.phase === "wait"
                  ? "Nuevo turno"
                  : "Reunir al council"}
            </Button>
          </div>
        </div>
      </form>

      {state.error && (
        <p className="rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {state.error}
        </p>
      )}

      {state.lastUserMessage && (
        <div className="rounded-council border border-border bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-foreground/85">
          <p className="mb-1 font-mono text-[11px] uppercase tracking-wider text-muted">
            Tú
          </p>
          {state.lastUserMessage}
        </div>
      )}

      {state.lastUserMessage && (
        <section className="flex flex-col gap-5">
          <SectionHeading
            label="Fase 1 · Posturas en paralelo"
            done={
              state.phase !== "fase1" && state.phase !== "idle"
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {AGENT_IDS.map((id) => (
              <AgentCard
                key={id}
                agent={id}
                state={state.agents[id].state}
                text={state.agents[id].text || undefined}
              />
            ))}
          </div>
        </section>
      )}

      {state.replica && (
        <section className="flex flex-col gap-5">
          <SectionHeading
            label="Fase 2 · Réplica selectiva"
            done={state.phase !== "fase2"}
          />
          {state.replica === "skipped" ? (
            <ReplicaCard
              speaker="marco"
              respondingTo="elena"
              text=""
              state="skipped"
            />
          ) : (
            <ReplicaCard
              speaker={state.replica.speaker}
              respondingTo={state.replica.respondingTo}
              text={state.replica.text}
              tensionScore={state.replica.tensionScore}
              state={state.replica.state}
            />
          )}
        </section>
      )}

      {state.phase === "fase4" && !state.synthesis && (
        <p className="text-sm text-muted">Generando síntesis…</p>
      )}

      {state.synthesis && (
        <section className="flex flex-col gap-5">
          <SectionHeading label="Fase 4 · Síntesis" done={false} />
          <SynthesisCard synthesis={state.synthesis} />
        </section>
      )}
    </div>
  );
}

function SectionHeading({
  label,
  done,
}: {
  label: string;
  done: boolean;
}) {
  return (
    <div className="flex items-center gap-3">
      <h2 className="font-mono text-[11px] font-medium uppercase tracking-widest text-muted">
        {label}
      </h2>
      <span
        className={`h-px flex-1 ${done ? "bg-emerald-400/30" : "bg-border"}`}
      />
    </div>
  );
}

function ContextStrip({
  ctx,
  attenuated,
}: {
  ctx: UserContext;
  attenuated: AgentId[];
}) {
  const items: [string, string][] = [
    ["Decisión", ctx.decisionType],
    ["Urgencia", ctx.urgency.replace("_", " ")],
    ["Necesita", ctx.needFromCouncil.replace(/_/g, " ")],
    ["Teme perder", ctx.fearedLoss.replace(/_/g, " ")],
  ];
  return (
    <div className="flex flex-col gap-3 rounded-council border border-border bg-elevated/40 p-4 sm:flex-row sm:items-center sm:justify-between">
      <dl className="grid grid-cols-2 gap-x-6 gap-y-2 text-xs text-muted sm:grid-cols-4">
        {items.map(([k, v]) => (
          <div key={k} className="flex flex-col">
            <dt className="font-mono text-[10px] uppercase tracking-wider text-muted/70">
              {k}
            </dt>
            <dd className="font-medium text-foreground/90">{v}</dd>
          </div>
        ))}
      </dl>
      {attenuated.length > 0 && (
        <p className="text-xs text-muted">
          Atenuado:{" "}
          <span className="font-medium text-tension">
            {attenuated.map((a) => AGENT_LABELS[a]).join(", ")}
          </span>
        </p>
      )}
    </div>
  );
}

function CrisisBanner({
  categories,
  onReset,
}: {
  categories: string[];
  onReset: () => void;
}) {
  return (
    <div className="rounded-council border border-error/50 bg-error/5 p-6">
      <p className="text-xs font-medium uppercase tracking-widest text-error">
        Modo soporte
      </p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">
        El council se detiene aquí.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Detectamos señales que requieren atención profesional, no deliberación.
        Si estás en México: llama al <strong>SAPTEL 55 5259 8121</strong>{" "}
        (24/7, confidencial). Si estás fuera, busca el servicio local
        equivalente o acude a la sala de urgencias más cercana.
      </p>
      <p className="mt-3 text-xs text-muted">
        Categorías detectadas: {categories.join(", ")}
      </p>
      <button
        onClick={onReset}
        className="mt-5 text-xs uppercase tracking-wider text-muted hover:text-foreground"
      >
        Reiniciar sesión
      </button>
    </div>
  );
}
