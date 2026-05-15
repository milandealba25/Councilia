"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadUserContext } from "@/lib/survey/storage";
import type { UserContext } from "@/lib/survey/survey.v1";
import { AGENT_IDS, type AgentId } from "@/lib/agents/ids";
import { AgentCard } from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/Button";
import { ReplicaCard } from "./ReplicaCard";
import { SynthesisCard } from "./SynthesisCard";
import { PhaseIndicator, type Phase } from "./PhaseIndicator";
import {
  requestSynthesis,
  streamInitial,
  streamReplica,
  SynthesisRequestError,
  type InitialEvent,
  type ReplicaEvent,
} from "@/lib/api/client";
import type { Synthesis } from "@/orchestrator/synthesis";
import {
  llmErrorHeadline,
  type LlmErrorCode,
} from "@/orchestrator/llm";

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
  errorCode?: LlmErrorCode;
}

interface ConfigErrorState {
  code: LlmErrorCode;
  message: string;
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
  /**
   * Cuando la fase 1 termina y aún no llega el plan de réplica, mostramos
   * un anuncio en lugar de la card (para que las posturas se lean primero).
   */
  replicaPending: boolean;
  replica: ReplicaState | "skipped" | null;
  synthesis: Synthesis | null;
  crisis: string[] | null;
  error: string | null;
  configError: ConfigErrorState | null;
  loading: boolean;
}

type Action =
  | { type: "ctx_loaded"; ctx: UserContext }
  | { type: "user_input"; value: string }
  | { type: "submit_user"; message: string }
  | { type: "initial_event"; event: InitialEvent }
  | { type: "phase1_done" }
  | { type: "replica_announce" }
  | { type: "replica_event"; event: ReplicaEvent }
  | { type: "replica_done" }
  | { type: "request_synthesis_start" }
  | { type: "synthesis_done"; synthesis: Synthesis }
  | { type: "synthesis_error"; message: string; code?: LlmErrorCode }
  | { type: "fatal"; message: string }
  | { type: "reset_after_crisis" }
  | { type: "dismiss_config_error" };

const INITIAL_STATE: State = {
  ctx: null,
  phase: "idle",
  userInput: "",
  lastUserMessage: null,
  agents: INITIAL_AGENT_STATE,
  attenuated: [],
  replicaPending: false,
  replica: null,
  synthesis: null,
  crisis: null,
  error: null,
  configError: null,
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
        replicaPending: false,
        replica: null,
        synthesis: null,
        crisis: null,
        error: null,
        configError: null,
        loading: true,
        phase: "fase1",
      };

    case "initial_event":
      return applyInitialEvent(state, action.event);

    case "phase1_done":
      return { ...state, phase: "fase2", replicaPending: true };

    case "replica_announce":
      return { ...state, replicaPending: true };

    case "replica_event":
      return applyReplicaEvent(state, action.event);

    case "replica_done":
      return {
        ...state,
        phase: "wait",
        loading: false,
        replicaPending: false,
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
        configError:
          action.code && action.code !== "aborted" && action.code !== "unknown"
            ? { code: action.code, message: action.message }
            : state.configError,
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

    case "dismiss_config_error":
      return { ...state, configError: null };
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
          errorCode: ev.code,
        },
      },
    };
  }
  if (ev.type === "crisis") {
    return { ...state, crisis: ev.categories, loading: false };
  }
  if (ev.type === "config_error") {
    return {
      ...state,
      configError: { code: ev.code, message: ev.message },
      agents: markAllError(state.agents, ev.message, ev.code),
      loading: false,
      phase: "wait",
    };
  }
  return state;
}

function applyReplicaEvent(state: State, ev: ReplicaEvent): State {
  if (ev.type === "skipped") {
    return { ...state, replica: "skipped", replicaPending: false };
  }
  if (ev.type === "plan") {
    return {
      ...state,
      replicaPending: false,
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
  if (ev.type === "config_error") {
    return {
      ...state,
      configError: { code: ev.code, message: ev.message },
      replica: state.replica && state.replica !== "skipped"
        ? { ...state.replica, state: "complete" }
        : state.replica,
      loading: false,
      phase: "wait",
    };
  }
  return state;
}

function delay(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve) => {
    if (signal?.aborted) return resolve();
    const t = setTimeout(() => {
      signal?.removeEventListener("abort", onAbort);
      resolve();
    }, ms);
    function onAbort() {
      clearTimeout(t);
      resolve();
    }
    signal?.addEventListener("abort", onAbort, { once: true });
  });
}

function markAllError(
  agents: Record<AgentId, AgentSlot>,
  error: string,
  code?: LlmErrorCode,
): Record<AgentId, AgentSlot> {
  const next = { ...agents };
  for (const id of AGENT_IDS) {
    if (next[id].state === "streaming" || next[id].state === "idle") {
      next[id] = { ...next[id], state: "error", error, errorCode: code };
    }
  }
  return next;
}

/**
 * Pausa breve tras la fase 1 antes de pedir la réplica. Da al usuario
 * tiempo de leer las 3 posturas antes de que aparezca "la pregunta dura".
 * Ajustar aquí cambia el ritmo global del council.
 */
const PHASE_TRANSITION_MS = 1400;

export function SessionConsole() {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const agentsSectionRef = useRef<HTMLElement | null>(null);
  const replicaSectionRef = useRef<HTMLElement | null>(null);
  const inputSectionRef = useRef<HTMLDivElement | null>(null);

  function smoothScrollTo(node: HTMLElement | null) {
    if (!node || typeof window === "undefined") return;
    const reduceMotion = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
    node.scrollIntoView({
      behavior: reduceMotion ? "auto" : "smooth",
      block: "start",
    });
  }

  useEffect(() => {
    const stored = loadUserContext();
    if (!stored) {
      router.replace("/onboarding");
      return;
    }
    dispatch({ type: "ctx_loaded", ctx: stored });
  }, [router]);

  useEffect(() => () => abortRef.current?.abort(), []);

  // Al enviar un mensaje, deslizamos a la sección de los agentes.
  useEffect(() => {
    if (!state.lastUserMessage) return;
    smoothScrollTo(agentsSectionRef.current);
  }, [state.lastUserMessage]);

  // Cuando entra la fase 2 (anuncio o plan), centramos la réplica.
  useEffect(() => {
    if (!state.replicaPending && !state.replica) return;
    smoothScrollTo(replicaSectionRef.current);
  }, [state.replicaPending, state.replica]);

  // Cuando termina la réplica y volvemos a "wait", llevamos al input
  // para que el usuario continúe el debate o pida la síntesis.
  useEffect(() => {
    if (state.phase !== "wait") return;
    smoothScrollTo(inputSectionRef.current);
  }, [state.phase]);

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

      // Pausa intencional para leer las posturas antes de la réplica.
      // Honra el abort del usuario (no quedamos colgados si cierra).
      await delay(PHASE_TRANSITION_MS, ctrl.signal);
      if (ctrl.signal.aborted) return;

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
      const code =
        err instanceof SynthesisRequestError ? err.code : undefined;
      const message =
        err instanceof SynthesisRequestError && code
          ? llmErrorHeadline(code)
          : (err as Error).message;
      dispatch({ type: "synthesis_error", message, code });
    }
  }

  if (!state.ctx) {
    return (
      <p className="text-sm text-muted">Preparando la sala. Un momento…</p>
    );
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
      <PhaseIndicator phase={state.phase} />

      <div ref={inputSectionRef} className="scroll-mt-8" />
      <form onSubmit={handleSubmit} className="flex flex-col gap-3">
        <label
          htmlFor="user-input"
          className="text-xs font-medium uppercase tracking-wider text-muted"
        >
          {state.phase === "wait" ? "Sigue hablando" : "Cuéntales"}
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
          placeholder="Cuéntales lo que te tiene así. Como te salga. No tienes que ordenarlo."
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
                Pedir que cierren contigo
              </Button>
            )}
            <Button type="submit" disabled={!canSubmit || state.loading}>
              {state.loading
                ? "Escuchando…"
                : state.phase === "wait"
                  ? "Decirles otra cosa"
                  : "Empezar"}
            </Button>
          </div>
        </div>
      </form>

      {state.configError && (
        <ConfigErrorBanner
          message={state.configError.message}
          code={state.configError.code}
          onDismiss={() => dispatch({ type: "dismiss_config_error" })}
        />
      )}

      {state.error && !state.configError && (
        <p className="rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error">
          {state.error}
        </p>
      )}

      {state.lastUserMessage && (
        <div className="rounded-council border border-border bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-foreground/85">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
            Tú dijiste
          </p>
          {state.lastUserMessage}
        </div>
      )}

      {state.lastUserMessage && (
        <section
          ref={agentsSectionRef}
          aria-label="Respuestas del council"
          className="flex scroll-mt-8 flex-col gap-5"
          style={{ animation: "soft-rise 500ms ease-out both" }}
        >
          <SectionHeading
            label="Te están escuchando"
            done={
              state.phase !== "fase1" && state.phase !== "idle"
            }
          />
          <div className="grid gap-5 md:grid-cols-3">
            {AGENT_IDS.map((id) => {
              const slot = state.agents[id];
              const headline = slot.errorCode
                ? llmErrorHeadline(slot.errorCode)
                : slot.error;
              return (
                <AgentCard
                  key={id}
                  agent={id}
                  state={slot.state}
                  text={slot.text || undefined}
                  attenuated={state.attenuated.includes(id)}
                  errorMessage={headline}
                  isUserTyping={
                    state.userInput.length > 0 &&
                    (state.phase === "idle" || state.phase === "wait")
                  }
                />
              );
            })}
          </div>
        </section>
      )}

      {(state.replicaPending || state.replica) && (
        <section
          ref={replicaSectionRef}
          aria-label="Réplica entre agentes"
          className="flex scroll-mt-8 flex-col gap-5"
          style={{ animation: "soft-rise 500ms ease-out both" }}
        >
          <SectionHeading
            label="Alguien toma la palabra"
            done={state.phase !== "fase2"}
          />
          {state.replicaPending && !state.replica ? (
            <ReplicaPlaceholder />
          ) : state.replica === "skipped" ? (
            <ReplicaCard
              speaker="marco"
              respondingTo="elena"
              text=""
              state="skipped"
            />
          ) : state.replica ? (
            <ReplicaCard
              speaker={state.replica.speaker}
              respondingTo={state.replica.respondingTo}
              text={state.replica.text}
              tensionScore={state.replica.tensionScore}
              state={state.replica.state}
            />
          ) : null}
        </section>
      )}

      {state.phase === "fase4" && !state.synthesis && (
        <p className="text-sm text-muted">
          Están cerrando contigo. Dales un momento…
        </p>
      )}

      {state.synthesis && (
        <section
          className="flex flex-col gap-5"
          style={{ animation: "soft-rise 500ms ease-out both" }}
        >
          <SectionHeading label="Lo que te llevas" done={false} />
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
      <h2 className="text-[11px] font-medium uppercase tracking-widest text-muted">
        {label}
      </h2>
      <span
        className={`h-px flex-1 ${done ? "bg-emerald-400/30" : "bg-border"}`}
      />
    </div>
  );
}

function ReplicaPlaceholder() {
  return (
    <div
      role="status"
      aria-live="polite"
      className="flex items-center gap-3 rounded-council border border-dashed border-accent/40 bg-elevated/40 px-5 py-6 text-sm text-muted"
    >
      <span
        className="typing-dots inline-flex"
        style={{ color: "var(--accent)" }}
        aria-hidden
      >
        <span />
        <span />
        <span />
      </span>
      <p>
        Detectando contradicción entre las tres posturas… alguien tomará la
        palabra en un momento.
      </p>
    </div>
  );
}

function ConfigErrorBanner({
  message,
  code,
  onDismiss,
}: {
  message: string;
  code: LlmErrorCode;
  onDismiss: () => void;
}) {
  const HINTS: Partial<Record<LlmErrorCode, string>> = {
    auth: "Define una clave válida de Gemini en GEMINI_API_KEY (Vercel u otro hosting) y vuelve a desplegar. En local, edita .env.local y reinicia npm run dev.",
    quota:
      "El proveedor está limitando llamadas. Espera unos segundos o sube la cuota en Google AI Studio.",
    network:
      "La red entre el servidor y Gemini falló. Reintenta; si persiste, revisa logs del hosting.",
  };
  const hint = HINTS[code];
  return (
    <div
      role="alert"
      className="flex flex-col gap-2 rounded-council border border-error/40 bg-error/10 px-4 py-3 text-sm text-error"
    >
      <div className="flex items-start justify-between gap-3">
        <p className="font-medium">{message}</p>
        <button
          type="button"
          onClick={onDismiss}
          className="text-[11px] uppercase tracking-wider text-error/80 hover:text-error"
        >
          Cerrar
        </button>
      </div>
      {hint && <p className="text-xs text-error/85">{hint}</p>}
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
        Aquí paramos
      </p>
      <h2 className="mt-2 text-xl font-semibold text-foreground">
        Lo que estás contando merece a alguien real, no a nosotros.
      </h2>
      <p className="mt-3 text-sm leading-relaxed text-foreground/90">
        Si estás en México, puedes llamar al{" "}
        <strong>SAPTEL 55 5259 8121</strong> (24/7, confidencial). Si estás
        fuera, busca el servicio local equivalente o acércate a la sala de
        urgencias más cercana. Tu bienestar importa más que esta conversación.
      </p>
      <p className="mt-3 text-xs text-muted">
        Lo que detectamos: {categories.join(", ")}
      </p>
      <button
        onClick={onReset}
        className="mt-5 text-xs uppercase tracking-wider text-muted hover:text-foreground"
      >
        Empezar de nuevo cuando estés
      </button>
    </div>
  );
}
