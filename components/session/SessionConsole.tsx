"use client";

import { useEffect, useReducer, useRef } from "react";
import { useRouter } from "next/navigation";
import { loadUserContext, saveUserContext } from "@/lib/survey/storage";
import { getValidAuthSession } from "@/lib/auth/client";
import { SURVEY_VERSION, type UserContext } from "@/lib/survey/survey.v1";
import { AGENT_IDS, type AgentId } from "@/lib/agents/ids";
import { AgentCard } from "@/components/agents/AgentCard";
import { Button } from "@/components/ui/Button";
import { ReplicaCard } from "./ReplicaCard";
import { SynthesisCard } from "./SynthesisCard";
import { PhaseIndicator, type Phase } from "./PhaseIndicator";
import {
  streamInitial,
  type InitialEvent,
} from "@/lib/api/client";
import type { Synthesis } from "@/orchestrator/synthesis";
import {
  llmErrorHeadline,
  type LlmErrorCode,
} from "@/orchestrator/llm";
import {
  buildConversationMemory,
  createChatTurnId,
  getChatSession,
  saveChatTurn,
  savePersistentChatTurn,
  type ChatSession,
  type ChatTurn,
} from "@/lib/chat/chatStorage";

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

interface CompletedTurn {
  userMessage: string;
  agents: Record<AgentId, AgentSlot>;
  attenuated: AgentId[];
  replica: ReplicaState | "skipped" | null;
}

interface State {
  ctx: UserContext | null;
  phase: Phase;
  userInput: string;
  lastUserMessage: string | null;
  agents: Record<AgentId, AgentSlot>;
  attenuated: AgentId[];
  replicaPending: boolean;
  replica: ReplicaState | "skipped" | null;
  synthesis: Synthesis | null;
  crisis: string[] | null;
  error: string | null;
  configError: ConfigErrorState | null;
  loading: boolean;
  pastTurns: CompletedTurn[];
  summary: string;
}

type Action =
  | { type: "ctx_loaded"; ctx: UserContext }
  | { type: "hydrate_chat"; session: ChatSession }
  | { type: "memory_updated"; summary: string }
  | { type: "user_input"; value: string }
  | { type: "submit_user"; message: string }
  | { type: "initial_event"; event: InitialEvent }
  | { type: "phase1_done" }
  | { type: "replica_done" }
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
  pastTurns: [],
  summary: "",
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ctx_loaded":
      return { ...state, ctx: action.ctx };

    case "hydrate_chat":
      return {
        ...INITIAL_STATE,
        ctx: state.ctx,
        phase: action.session.turns.length > 0 ? "wait" : "idle",
        pastTurns: action.session.turns.map(chatTurnToCompletedTurn),
        summary: action.session.summary?.trim() ?? "",
      };

    case "memory_updated":
      return { ...state, summary: action.summary.trim() };

    case "user_input":
      return { ...state, userInput: action.value };

    case "submit_user": {
      const archived: CompletedTurn | null = state.lastUserMessage
        ? {
            userMessage: state.lastUserMessage,
            agents: state.agents,
            attenuated: state.attenuated,
            replica: state.replica,
          }
        : null;
      return {
        ...state,
        pastTurns: archived
          ? [...state.pastTurns, archived]
          : state.pastTurns,
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
    }

    case "initial_event":
      return applyInitialEvent(state, action.event);

    case "phase1_done": {
      const completedAgents = { ...state.agents };
      for (const id of AGENT_IDS) {
        if (completedAgents[id].state === "streaming") {
          completedAgents[id] = { ...completedAgents[id], state: "complete" };
        }
      }
      return {
        ...state,
        agents: completedAgents,
        phase: "wait",
        loading: false,
        replicaPending: false,
      };
    }

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
function chatTurnToCompletedTurn(turn: ChatTurn): CompletedTurn {
  return {
    userMessage: turn.userMessage,
    agents: {
      marco: {
        state: turn.agents.marco ? "complete" : "idle",
        text: turn.agents.marco ?? "",
      },
      elena: {
        state: turn.agents.elena ? "complete" : "idle",
        text: turn.agents.elena ?? "",
      },
      rafael: {
        state: turn.agents.rafael ? "complete" : "idle",
        text: turn.agents.rafael ?? "",
      },
    },
    attenuated: [],
    replica: turn.replica
      ? {
          ...turn.replica,
          tensionScore: 0,
          state: "complete",
        }
      : null,
  };
}

interface SessionConsoleProps {
  chatId: string | null;
  sidebarCollapsed?: boolean;
}

export function SessionConsole({
  chatId,
  sidebarCollapsed = false,
}: SessionConsoleProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const activeChatIdRef = useRef<string | null>(chatId);
  const responseSectionRef = useRef<HTMLElement | null>(null);
  const shouldScrollToCouncilRef = useRef(false);

  useEffect(() => {
    activeChatIdRef.current = chatId;
    const storedChat = chatId ? getChatSession(chatId) : null;
    if (storedChat) {
      dispatch({ type: "hydrate_chat", session: storedChat });
    }
  }, [chatId]);

  useEffect(() => {
    const guestMode =
      typeof window !== "undefined" &&
      new URLSearchParams(window.location.search).get("guest") === "1";

    async function guardSession() {
      if (!(await getValidAuthSession()) && !guestMode) {
        router.replace("/");
        return;
      }

      const stored = loadUserContext();
      if (!stored) {
        if (guestMode) {
          const guestContext: UserContext = {
            surveyVersion: SURVEY_VERSION,
            decisionType: "vida",
            ageRange: "prefer_not_say",
            urgency: "explorando",
            needFromCouncil: "estructurar",
            fearedLoss: "arrepentirme",
          };
          saveUserContext(guestContext);
          dispatch({ type: "ctx_loaded", ctx: guestContext });
          return;
        }
        router.replace("/onboarding");
        return;
      }
      dispatch({ type: "ctx_loaded", ctx: stored });
    }

    void guardSession();
  }, [router]);

  useEffect(
    () => () => {
      mountedRef.current = false;
      abortRef.current?.abort();
    },
    [],
  );

  useEffect(() => {
    if (
      !shouldScrollToCouncilRef.current ||
      state.phase !== "fase1" ||
      !state.lastUserMessage
    ) {
      return;
    }
    shouldScrollToCouncilRef.current = false;
    window.requestAnimationFrame(() => {
      const target = responseSectionRef.current;
      if (!target) return;
      const offset = Math.min(56, Math.max(12, window.innerHeight * 0.04));
      const top = target.getBoundingClientRect().top + window.scrollY - offset;
      window.scrollTo({ top: Math.max(0, top), behavior: "smooth" });
    });
  }, [state.phase, state.lastUserMessage]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.ctx || state.loading) return;
    const message = state.userInput.trim();
    if (!message) return;
    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;

    const submissionChatId = activeChatIdRef.current;
    const turnId = createChatTurnId();
    const conversationMemory = buildConversationMemory(submissionChatId);
    const draftTurn: ChatTurn = {
      turnId,
      userMessage: message,
      agents: { marco: "", elena: "", rafael: "" },
      replica: null,
    };
    const draftSave = submissionChatId
      ? savePersistentChatTurn(submissionChatId, draftTurn).catch(() => null)
      : Promise.resolve(null);

    shouldScrollToCouncilRef.current = true;
    dispatch({ type: "submit_user", message });

    try {
      const collected: Record<AgentId, string> = { marco: "", elena: "", rafael: "" };
      let crisis = false;
      for await (const ev of streamInitial({
        userContext: state.ctx,
        userMessage: message,
        conversationMemory,
        signal: ctrl.signal,
      })) {
        dispatch({ type: "initial_event", event: ev });
        if (ev.type === "delta") collected[ev.agent] += ev.text;
        if (ev.type === "crisis") crisis = true;
      }
      if (crisis) return;

      if (ctrl.signal.aborted) return;

      const completedTurn: ChatTurn = {
        turnId,
        userMessage: message,
        agents: {
          marco: collected.marco.trim(),
          elena: collected.elena.trim(),
          rafael: collected.rafael.trim(),
        },
        replica: null,
      };

      if (submissionChatId) {
        saveChatTurn(submissionChatId, completedTurn);
      }

      dispatch({ type: "phase1_done" });

      if (submissionChatId) {
        void (async () => {
          await draftSave;
          const updated = await savePersistentChatTurn(
            submissionChatId,
            completedTurn,
          ).catch(() => null);
          if (
            updated?.summary &&
            mountedRef.current &&
            activeChatIdRef.current === submissionChatId
          ) {
            dispatch({ type: "memory_updated", summary: updated.summary });
          }
        })();
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({ type: "fatal", message: (err as Error).message });
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
    !state.loading &&
    (state.phase === "idle" || state.phase === "wait");

  const showComposer = state.phase !== "fase4";
  const composerClassName = [
    "fixed bottom-4 left-3 right-3 z-20 mx-auto flex w-auto max-w-5xl flex-col gap-2 rounded-council border border-border-strong/70 bg-surface/90 p-3 shadow-council-lg backdrop-blur transition-[left,right,max-width] duration-300 ease-in-out",
    sidebarCollapsed ? "md:left-4 md:right-4" : "md:left-[calc(256px+1rem)] md:right-4",
  ].join(" ");

  return (
    <div className="flex flex-col gap-[34px] pb-32">
      <PhaseIndicator phase={state.phase} />

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

      {state.summary.trim() && (
        <section className="rounded-council border border-border bg-surface/80 px-4 py-3 text-sm leading-relaxed text-foreground/85">
          <p className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted">
            Resumen guardado
          </p>
          {state.summary}
        </section>
      )}

      {state.pastTurns.map((turn, turnIdx) => (
        <div key={turnIdx} className="flex flex-col gap-6 border-b border-border/30 pb-8">
          <div className="rounded-council border border-border bg-elevated/70 px-4 py-3 text-sm leading-relaxed text-foreground/90 opacity-90 shadow-soft">
            <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
              Tú dijiste
            </p>
            {turn.userMessage}
          </div>
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 md:grid-cols-3">
            {AGENT_IDS.map((id) => {
              const slot = turn.agents[id];
              if (!slot.text) return null;
              return (
                <AgentCard
                  key={id}
                  className="w-full max-w-md opacity-80"
                  agent={id}
                  state="complete"
                  text={slot.text || undefined}
                  attenuated={turn.attenuated.includes(id)}
                />
              );
            })}
          </div>
          {turn.replica && turn.replica !== "skipped" && (
            <ReplicaCard
              speaker={turn.replica.speaker}
              respondingTo={turn.replica.respondingTo}
              text={turn.replica.text}
              state="complete"
            />
          )}
        </div>
      ))}

      {state.lastUserMessage && (
        <div className="rounded-council border border-border bg-elevated/75 px-4 py-3 text-sm leading-relaxed text-foreground/90 shadow-soft">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
            Tú dijiste
          </p>
          {state.lastUserMessage}
        </div>
      )}

      {state.lastUserMessage && (
        <section
          ref={responseSectionRef}
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
          <div className="mx-auto grid w-full max-w-6xl grid-cols-1 justify-items-center gap-5 sm:grid-cols-2 md:grid-cols-3">
            {AGENT_IDS.map((id) => {
              const slot = state.agents[id];
              const headline = slot.errorCode
                ? llmErrorHeadline(slot.errorCode)
                : slot.error;
              return (
                <AgentCard
                  key={id}
                  className="w-full max-w-md"
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

      {showComposer && (
        <form
          id="session-composer"
          onSubmit={handleSubmit}
          className={composerClassName}
        >
          <textarea
            id="user-input"
            aria-label="Mensaje para el council"
            value={state.userInput}
            onChange={(e) =>
              dispatch({ type: "user_input", value: e.target.value })
            }
            maxLength={4000}
            rows={2}
            disabled={state.phase === "fase4"}
            placeholder="Cuéntales lo que te tiene así. Como te salga. No tienes que ordenarlo."
            className="max-h-32 resize-none rounded-council border border-border-strong/70 bg-elevated/80 px-4 py-3 font-sans text-sm leading-relaxed text-foreground placeholder:text-muted/70 focus:border-accent focus:outline-none focus:ring-1 focus:ring-accent disabled:opacity-60"
            autoFocus={state.phase === "wait"}
          />
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{state.userInput.length} / 4000</span>
            <div className="flex items-center gap-2">
              <Button type="submit" disabled={!canSubmit}>
                {state.loading ? "Espera…" : "Enviar"}
              </Button>
            </div>
          </div>
        </form>
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
    auth: "Define una clave válida en GEMINI_API_KEY y reinicia el servidor. En local, edita .env.local y reinicia npm run dev.",
    quota:
      "El proveedor está limitando llamadas. Espera unos segundos o revisa la cuota disponible de Gemini.",
    network:
      "La red entre el servidor y el proveedor de IA falló. Reintenta; si persiste, revisa logs del hosting.",
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
