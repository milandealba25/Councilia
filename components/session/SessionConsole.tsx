"use client";

import { useCallback, useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserContext, saveUserContext } from "@/lib/survey/storage";
import { SURVEY_VERSION, type UserContext } from "@/lib/survey/survey.v1";
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
import {
  startVoiceContextPlayback,
  stopAllVoicePlayback,
  pauseVoicePlayback,
  resumeVoicePlayback,
  unlockVoicePlayback,
} from "@/lib/voice/audioContextPlayer";
import {
  createChatSession,
  saveChatTurn,
  getActiveChatId,
  setActiveChatId,
  getChatSession,
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
  pastTurns: [],
};

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case "ctx_loaded":
      return { ...state, ctx: action.ctx };

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
 * Pausa breve tras mostrar "Alguien toma la palabra" y antes de pedir la réplica
 * al servidor (placeholder + tiempo de lectura del aviso).
 */
const PHASE_TRANSITION_MS = 800;

/**
 * Tras terminar la mecanografía de todas las posturas visibles, arrancamos
 * voz casi inmediato para mantener sensación de conversación viva.
 */
const POST_AGENT_REVEAL_MS = 0;

async function playAudioBlob(
  blob: Blob,
  signal?: AbortSignal,
): Promise<void> {
  const handle = await startVoiceContextPlayback(blob, signal);
  await handle.done;
}

async function playWithWebSpeechFallback(
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  if (
    typeof window === "undefined" ||
    typeof window.speechSynthesis === "undefined" ||
    typeof window.SpeechSynthesisUtterance === "undefined"
  ) {
    return;
  }
  return new Promise((resolve) => {
    const utter = new SpeechSynthesisUtterance(text);
    utter.lang = "es-MX";
    utter.rate = 0.95;
    utter.pitch = 1;

    function cleanup() {
      utter.onend = null;
      utter.onerror = null;
      signal?.removeEventListener("abort", onAbort);
    }

    function onAbort() {
      window.speechSynthesis.cancel();
      cleanup();
      resolve();
    }

    utter.onend = () => {
      cleanup();
      resolve();
    };
    utter.onerror = () => {
      cleanup();
      resolve();
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    window.speechSynthesis.speak(utter);
  });
}

async function playAgentVoice(
  agent: AgentId,
  text: string,
  signal?: AbortSignal,
): Promise<void> {
  let blob: Blob | null = null;
  try {
    const res = await fetch("/api/voice/tts", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ agent, text }),
      signal,
    });
    if (!res.ok) throw new Error(`tts_http_${res.status}`);
    blob = await res.blob();
    if (blob.size === 0) throw new Error("tts_empty_audio");
  } catch {
    await playWithWebSpeechFallback(text, signal);
    return;
  }

  try {
    await playAudioBlob(blob, signal);
  } catch {
    // Si Eleven respondió OK pero autoplay fue bloqueado por navegador,
    // caemos a voz local para evitar silencio total.
    await playWithWebSpeechFallback(text, signal);
  }
}

interface SessionConsoleProps {
  chatId: string | null;
  onChatCreated?: (id: string) => void;
}

export function SessionConsole({ chatId, onChatCreated }: SessionConsoleProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const playbackAbortRef = useRef<AbortController | null>(null);
  const activeChatIdRef = useRef<string | null>(chatId);
  const agentRevealGateRef = useRef<{
    pending: Set<AgentId>;
    resolve: () => void;
  } | null>(null);

  const [speakingAgent, setSpeakingAgent] = useState<AgentId | null>(null);
  const [spokenAgents, setSpokenAgents] = useState<Set<AgentId>>(new Set());
  const [autoPlayPaused, setAutoPlayPaused] = useState(false);
  const [composerExpanded, setComposerExpanded] = useState(false);
  const [voiceEnabled, setVoiceEnabled] = useState(() => {
    if (typeof window === "undefined") return true;
    return localStorage.getItem("councilia.voiceEnabled") !== "false";
  });

  const stopAllAudio = useCallback(() => {
    playbackAbortRef.current?.abort();
    playbackAbortRef.current = null;
    stopAllVoicePlayback();
    if (typeof window !== "undefined" && typeof window.speechSynthesis !== "undefined") {
      window.speechSynthesis.cancel();
    }
    setSpeakingAgent(null);
    setAutoPlayPaused(false);
  }, []);

  const pausePlayback = useCallback(() => {
    pauseVoicePlayback();
    setAutoPlayPaused(true);
  }, []);

  const resumePlayback = useCallback(() => {
    resumeVoicePlayback();
    setAutoPlayPaused(false);
  }, []);

  const toggleVoice = useCallback((on: boolean) => {
    setVoiceEnabled(on);
    localStorage.setItem("councilia.voiceEnabled", String(on));
    if (!on) stopAllAudio();
  }, [stopAllAudio]);

  function releaseAgentRevealGate(id: AgentId) {
    const g = agentRevealGateRef.current;
    if (!g || !g.pending.has(id)) return;
    g.pending.delete(id);
    if (g.pending.size === 0) {
      agentRevealGateRef.current = null;
      g.resolve();
    }
  }

  useEffect(() => {
    activeChatIdRef.current = chatId;
  }, [chatId]);

  useEffect(() => {
    if (!activeChatIdRef.current) {
      const session = createChatSession();
      activeChatIdRef.current = session.id;
      onChatCreated?.(session.id);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    const stored = loadUserContext();
    if (!stored) {
      const guestMode =
        typeof window !== "undefined" &&
        new URLSearchParams(window.location.search).get("guest") === "1";
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
  }, [router]);

  useEffect(
    () => () => {
      abortRef.current?.abort();
      playbackAbortRef.current?.abort();
      if (
        typeof window !== "undefined" &&
        typeof window.speechSynthesis !== "undefined"
      ) {
        window.speechSynthesis.cancel();
      }
    },
    [],
  );

  // (Auto-scroll desactivado: el usuario controla el scroll manualmente.)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!state.ctx || state.loading) return;
    const message = state.userInput.trim();
    if (!message) return;
    // Esta interacción del usuario desbloquea reproducción para auto-voz posterior.
    void unlockVoicePlayback();

    abortRef.current?.abort();
    stopAllAudio();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    setSpeakingAgent(null);
    setSpokenAgents(new Set());
    setAutoPlayPaused(false);
    setComposerExpanded(false);
    if (agentRevealGateRef.current) {
      const stuck = agentRevealGateRef.current;
      agentRevealGateRef.current = null;
      stuck.resolve();
    }

    dispatch({ type: "submit_user", message });

    try {
      const collected: Record<AgentId, string> = { marco: "", elena: "", rafael: "" };
      let attenuatedIds: AgentId[] = [];
      const errored = new Set<AgentId>();
      let crisis = false;
      for await (const ev of streamInitial({
        userContext: state.ctx,
        userMessage: message,
        signal: ctrl.signal,
      })) {
        dispatch({ type: "initial_event", event: ev });
        if (ev.type === "meta") attenuatedIds = ev.attenuated;
        if (ev.type === "delta") collected[ev.agent] += ev.text;
        if (ev.type === "error") errored.add(ev.agent);
        if (ev.type === "crisis") crisis = true;
      }
      if (crisis) return;

      const agentsNeedReveal = AGENT_IDS.filter(
        (id) =>
          !attenuatedIds.includes(id) &&
          !errored.has(id) &&
          collected[id].trim().length > 0,
      );

      const anyPostureText = AGENT_IDS.some(
        (id) => collected[id].trim().length > 0,
      );

      const abortRevealWait = () => {
        const g = agentRevealGateRef.current;
        if (g) {
          agentRevealGateRef.current = null;
          g.resolve();
        }
      };
      ctrl.signal.addEventListener("abort", abortRevealWait);

      try {
        if (agentsNeedReveal.length > 0) {
          await new Promise<void>((resolve) => {
            agentRevealGateRef.current = {
              pending: new Set(agentsNeedReveal),
              resolve,
            };
          });
        }
        if (ctrl.signal.aborted) return;
        if (anyPostureText) {
          await delay(POST_AGENT_REVEAL_MS, ctrl.signal);
        }
        if (ctrl.signal.aborted) return;
      } finally {
        ctrl.signal.removeEventListener("abort", abortRevealWait);
        agentRevealGateRef.current = null;
      }

      if (voiceEnabled) {
        const phase1VoiceQueue = AGENT_IDS
          .map((id) => ({ agent: id, text: collected[id].trim() }))
          .filter((item) => item.text.length > 0);
        if (phase1VoiceQueue.length > 0) {
          const playCtrl = new AbortController();
          playbackAbortRef.current = playCtrl;

          const blobCache = new Map<AgentId, Blob>();
          const prefetchResults = await Promise.all(
            phase1VoiceQueue.map(async (item) => {
              try {
                const res = await fetch("/api/voice/tts", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({ agent: item.agent, text: item.text }),
                  signal: ctrl.signal,
                });
                if (res.ok) {
                  const blob = await res.blob();
                  if (blob.size > 0) return { agent: item.agent, blob };
                }
              } catch { /* fallback on play */ }
              return { agent: item.agent, blob: null as Blob | null };
            }),
          );
          for (const { agent, blob } of prefetchResults) {
            if (blob) blobCache.set(agent, blob);
          }

          for (const item of phase1VoiceQueue) {
            if (ctrl.signal.aborted || playCtrl.signal.aborted) break;
            setSpeakingAgent(item.agent);
            const cached = blobCache.get(item.agent);
            if (cached) {
              try {
                await playAudioBlob(cached, playCtrl.signal);
              } catch {
                await playWithWebSpeechFallback(item.text, playCtrl.signal);
              }
            } else {
              await playAgentVoice(item.agent, item.text, playCtrl.signal);
            }
            setSpokenAgents((prev) => new Set(prev).add(item.agent));
          }
          setSpeakingAgent(null);
        }
      }

      dispatch({ type: "phase1_done" });

      const postures = AGENT_IDS
        .filter((id) => collected[id].trim().length > 0)
        .map((id) => ({ agent: id, text: collected[id].trim() }));

      if (postures.length < 2) {
        dispatch({ type: "replica_done" });
        return;
      }

      await delay(PHASE_TRANSITION_MS, ctrl.signal);
      if (ctrl.signal.aborted) return;

      let replicaSpeaker: AgentId | null = null;
      let replicaText = "";
      for await (const ev of streamReplica({
        userContext: state.ctx,
        userMessage: message,
        postures,
        signal: ctrl.signal,
      })) {
        dispatch({ type: "replica_event", event: ev });
        if (ev.type === "plan") replicaSpeaker = ev.speaker;
        if (ev.type === "delta") replicaText += ev.text;
      }

      if (voiceEnabled && replicaSpeaker && replicaText.trim().length > 0) {
        const playCtrl = new AbortController();
        playbackAbortRef.current = playCtrl;
        if (!ctrl.signal.aborted && !playCtrl.signal.aborted) {
          setSpeakingAgent(replicaSpeaker);
          await playAgentVoice(replicaSpeaker, replicaText.trim(), playCtrl.signal);
          setSpeakingAgent(null);
        }
      }

      if (activeChatIdRef.current) {
        const turn: ChatTurn = {
          userMessage: message,
          agents: {
            marco: collected.marco.trim(),
            elena: collected.elena.trim(),
            rafael: collected.rafael.trim(),
          },
          replica:
            replicaSpeaker && replicaText.trim().length > 0
              ? {
                  speaker: replicaSpeaker,
                  respondingTo: postures.find((p) => p.agent !== replicaSpeaker)?.agent ?? "marco",
                  text: replicaText.trim(),
                }
              : null,
        };
        saveChatTurn(activeChatIdRef.current, turn);
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
    playbackAbortRef.current?.abort();
    playbackAbortRef.current = null;
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
    (state.phase === "idle" || state.phase === "wait" || state.phase === "fase2");

  const canRequestSynthesis =
    state.phase === "wait" && !state.synthesis && !state.loading;
  const showComposer =
    state.phase === "idle" || state.phase === "wait" || state.phase === "fase2";

  return (
    <div className="flex flex-col gap-10">
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

      {state.pastTurns.map((turn, turnIdx) => (
        <div key={turnIdx} className="flex flex-col gap-6 border-b border-border/30 pb-8">
          <div className="rounded-council border border-border bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-foreground/85 opacity-80">
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
        <div className="rounded-council border border-border bg-elevated/40 px-4 py-3 text-sm leading-relaxed text-foreground/85">
          <p className="mb-1 text-[11px] uppercase tracking-wider text-muted">
            Tú dijiste
          </p>
          {state.lastUserMessage}
        </div>
      )}

      {state.lastUserMessage && (
        <section
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
                  onRevealComplete={() => releaseAgentRevealGate(id)}
                  isUserTyping={
                    state.userInput.length > 0 &&
                    (state.phase === "idle" || state.phase === "wait")
                  }
                  speakButtonDisabled={
                    speakingAgent !== null &&
                    speakingAgent !== id &&
                    !spokenAgents.has(id)
                  }
                  onBeforePlay={stopAllAudio}
                  isAutoPlaying={speakingAgent === id}
                  autoPlayPaused={autoPlayPaused}
                  onPauseAutoPlay={pausePlayback}
                  onResumeAutoPlay={resumePlayback}
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
              onBeforePlay={stopAllAudio}
              isAutoPlaying={speakingAgent === state.replica.speaker}
              autoPlayPaused={autoPlayPaused}
              onPauseAutoPlay={pausePlayback}
              onResumeAutoPlay={resumePlayback}
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
        <>
          {state.phase === "wait" && !composerExpanded ? (
            <div
              className="flex flex-col gap-3"
              style={{ animation: "soft-rise 400ms ease-out both" }}
            >
              <p className="text-xs font-medium uppercase tracking-wider text-muted">
                ¿Qué quieres hacer?
              </p>
              <div className="flex flex-wrap gap-3">
                <Button
                  onClick={() => setComposerExpanded(true)}
                >
                  Continúa sobre el tema
                </Button>
                <Button
                  variant="secondary"
                  onClick={() => {
                    setComposerExpanded(true);
                    dispatch({ type: "user_input", value: "" });
                  }}
                >
                  Decirles otra cosa
                </Button>
                {canRequestSynthesis && (
                  <Button
                    variant="secondary"
                    onClick={handleSynthesis}
                  >
                    Pedir que cierren contigo
                  </Button>
                )}
              </div>
            </div>
          ) : (
            <form
              onSubmit={handleSubmit}
              className="flex flex-col gap-3"
              style={
                state.phase === "wait"
                  ? { animation: "soft-rise 300ms ease-out both" }
                  : undefined
              }
            >
              <label
                htmlFor="user-input"
                className="text-xs font-medium uppercase tracking-wider text-muted"
              >
                {state.phase === "wait" || state.phase === "fase2"
                  ? "Sigue hablando"
                  : "Cuéntales"}
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
                autoFocus={state.phase === "wait"}
              />
              <div className="flex items-center justify-between text-xs text-muted">
                <span>{state.userInput.length} / 4000</span>
                <div className="flex items-center gap-2">
                  {state.phase === "wait" && (
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={() => setComposerExpanded(false)}
                    >
                      ← Atrás
                    </Button>
                  )}
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
                    {state.loading ? "Escuchando…" : "Enviar"}
                  </Button>
                </div>
              </div>
            </form>
          )}
        </>
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
    auth: "Define una clave válida en OPENAI_API_KEY y reinicia el servidor. En local, edita .env.local y reinicia npm run dev.",
    quota:
      "El proveedor está limitando llamadas. Espera unos segundos o revisa tu cuota en el dashboard de OpenAI.",
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

function SpeakerOnIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14" />
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07" />
    </svg>
  );
}

function SpeakerOffIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
      <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
      <line x1="23" y1="9" x2="17" y2="15" />
      <line x1="17" y1="9" x2="23" y2="15" />
    </svg>
  );
}
