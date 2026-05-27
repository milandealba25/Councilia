"use client";

import { useEffect, useReducer, useRef, useState } from "react";
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
  requestSynthesis,
  streamInitial,
  streamReplica,
  SynthesisRequestError,
  type InitialEvent,
  type ReplicaEvent,
  type TranscriptTurn,
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

type DictationStatus = "idle" | "listening" | "processing";

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
  | { type: "replica_start" }
  | { type: "replica_event"; event: ReplicaEvent }
  | { type: "replica_done" }
  | { type: "synthesis_start" }
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

    case "replica_start":
      return {
        ...state,
        phase: "fase2",
        loading: true,
        replicaPending: true,
        replica: null,
        error: null,
      };

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

    case "synthesis_start":
      return {
        ...state,
        phase: "fase4",
        loading: true,
        error: null,
        synthesis: null,
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

function applyReplicaEvent(state: State, ev: ReplicaEvent): State {
  if (ev.type === "plan") {
    return {
      ...state,
      replicaPending: false,
      replica: {
        speaker: ev.speaker,
        respondingTo: ev.respondingTo,
        tensionScore: ev.tensionScore,
        text: "",
        state: "streaming",
      },
    };
  }
  if (ev.type === "delta") {
    if (!state.replica || state.replica === "skipped") return state;
    return {
      ...state,
      replica: {
        ...state.replica,
        text: state.replica.text + ev.text,
      },
    };
  }
  if (ev.type === "done") {
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
  }
  if (ev.type === "skipped") {
    return {
      ...state,
      phase: "wait",
      loading: false,
      replicaPending: false,
      replica: "skipped",
    };
  }
  if (ev.type === "config_error") {
    return {
      ...state,
      phase: "wait",
      loading: false,
      replicaPending: false,
      configError: { code: ev.code, message: ev.message },
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

function completedTurnToTranscript(turn: CompletedTurn): TranscriptTurn[] {
  const rows: TranscriptTurn[] = [
    { role: "user", text: turn.userMessage },
  ];
  for (const agent of AGENT_IDS) {
    const text = turn.agents[agent].text.trim();
    if (text) rows.push({ role: agent, text });
  }
  if (turn.replica && turn.replica !== "skipped" && turn.replica.text.trim()) {
    rows.push({ role: turn.replica.speaker, text: turn.replica.text.trim() });
  }
  return rows;
}

function currentTurnFromState(state: State): CompletedTurn | null {
  if (!state.lastUserMessage) return null;
  return {
    userMessage: state.lastUserMessage,
    agents: state.agents,
    attenuated: state.attenuated,
    replica: state.replica,
  };
}

function buildTranscriptFromState(state: State): TranscriptTurn[] {
  const turns = [...state.pastTurns];
  const current = currentTurnFromState(state);
  if (current) turns.push(current);
  return turns.flatMap(completedTurnToTranscript);
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
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const latestInputRef = useRef("");
  const mountedRef = useRef(true);
  const activeChatIdRef = useRef<string | null>(chatId);
  const responseSectionRef = useRef<HTMLElement | null>(null);
  const shouldScrollToCouncilRef = useRef(false);
  const [dictationStatus, setDictationStatus] =
    useState<DictationStatus>("idle");
  const [dictationError, setDictationError] = useState<string | null>(null);

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
      mediaRecorderRef.current?.stop();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    latestInputRef.current = state.userInput;
  }, [state.userInput]);

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

  function appendDictationToInput(text: string) {
    const spoken = text.replace(/\s+/g, " ").trim();
    if (!spoken) return;
    const current = latestInputRef.current;
    const separator = current.trim().length > 0 && !/\s$/.test(current) ? " " : "";
    const next = `${current}${separator}${spoken}`.slice(0, 4000);
    latestInputRef.current = next;
    dispatch({ type: "user_input", value: next });
  }

  function cleanupDictation() {
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    dictationChunksRef.current = [];
    setDictationStatus("idle");
  }

  function dictationErrorMessage(err: unknown): string {
    if (err instanceof DOMException) {
      if (err.name === "NotAllowedError" || err.name === "SecurityError") {
        return "El navegador bloqueo el microfono para esta pagina.";
      }
      if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
        return "No encontramos un microfono disponible.";
      }
      if (err.name === "NotReadableError" || err.name === "TrackStartError") {
        return "El microfono esta siendo usado por otra app o no pudo iniciar.";
      }
    }
    if (err instanceof Error && err.message.trim()) return err.message;
    return "No pudimos capturar el dictado. Intentalo de nuevo.";
  }

  function supportedAudioMimeType(): string {
    const candidates = [
      "audio/webm;codecs=opus",
      "audio/webm",
      "audio/mp4",
      "audio/ogg;codecs=opus",
    ];
    return (
      candidates.find(
        (candidate) =>
          typeof MediaRecorder !== "undefined" &&
          MediaRecorder.isTypeSupported(candidate),
      ) ?? ""
    );
  }

  async function transcribeAudio(blob: Blob): Promise<string> {
    const formData = new FormData();
    const extension = blob.type.includes("mp4")
      ? "m4a"
      : blob.type.includes("ogg")
        ? "ogg"
        : "webm";
    formData.append("audio", blob, `dictado.${extension}`);

    const response = await fetch("/api/dictation", {
      method: "POST",
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      text?: string;
      error?: string;
      detail?: string;
    } | null;

    if (!response.ok) {
      throw new Error(
        payload?.detail ??
          payload?.error ??
          "No pudimos transcribir el audio.",
      );
    }
    return payload?.text?.trim() ?? "";
  }

  async function startDictation() {
    if (dictationStatus !== "idle" || state.loading || state.phase === "fase4") {
      return;
    }

    if (!navigator.mediaDevices?.getUserMedia || typeof MediaRecorder === "undefined") {
      setDictationError("Tu navegador no soporta grabacion de audio en esta pagina.");
      return;
    }

    setDictationStatus("processing");
    setDictationError(null);

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mimeType = supportedAudioMimeType();
      const recorder = new MediaRecorder(
        stream,
        mimeType ? { mimeType } : undefined,
      );

      dictationChunksRef.current = [];
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) dictationChunksRef.current.push(event.data);
      };

      recorder.onerror = (event) => {
        const error = "error" in event ? event.error : undefined;
        setDictationError(dictationErrorMessage(error));
        cleanupDictation();
      };

      recorder.onstop = () => {
        const chunks = dictationChunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const audio = new Blob(chunks, { type });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        void transcribeAudio(audio)
          .then((transcript) => {
            if (!transcript) {
              setDictationError("No detectamos voz en el audio.");
              return;
            }
            appendDictationToInput(transcript);
          })
          .catch((err) => {
            setDictationError(dictationErrorMessage(err));
          })
          .finally(() => {
            cleanupDictation();
          });
      };

      recorder.start();
      setDictationStatus("listening");
    } catch (err) {
      cleanupDictation();
      setDictationError(dictationErrorMessage(err));
    }
  }

  function stopDictation() {
    if (dictationStatus !== "listening") return;
    setDictationStatus("processing");
    try {
      mediaRecorderRef.current?.stop();
    } catch (err) {
      cleanupDictation();
      setDictationError(dictationErrorMessage(err));
    }
  }

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

      let completedTurn: ChatTurn = {
        turnId,
        userMessage: message,
        agents: {
          marco: collected.marco.trim(),
          elena: collected.elena.trim(),
          rafael: collected.rafael.trim(),
        },
        replica: null,
      };

      const persistCompletedTurn = async (turn: ChatTurn) => {
        if (!submissionChatId) return;
        await draftSave;
        const updated = await savePersistentChatTurn(
          submissionChatId,
          turn,
        ).catch(() => null);
        if (
          updated?.summary &&
          mountedRef.current &&
          activeChatIdRef.current === submissionChatId
        ) {
          dispatch({ type: "memory_updated", summary: updated.summary });
        }
      };

      if (submissionChatId) {
        saveChatTurn(submissionChatId, completedTurn);
      }

      dispatch({ type: "phase1_done" });

      const postures = AGENT_IDS.map((agent) => ({
        agent,
        text: completedTurn.agents[agent]?.trim() ?? "",
      })).filter((posture) => posture.text.length > 0);

      if (postures.length < 2) {
        void persistCompletedTurn(completedTurn);
        return;
      }

      dispatch({ type: "replica_start" });
      let replica: ChatTurn["replica"] = null;
      let skippedOrConfigError = false;
      try {
        for await (const ev of streamReplica({
          userContext: state.ctx,
          userMessage: message,
          conversationMemory,
          postures,
          signal: ctrl.signal,
        })) {
          dispatch({ type: "replica_event", event: ev });
          if (ev.type === "plan") {
            replica = {
              speaker: ev.speaker,
              respondingTo: ev.respondingTo,
              text: "",
            };
          } else if (ev.type === "delta" && replica !== null) {
            replica = {
              speaker: replica.speaker,
              respondingTo: replica.respondingTo,
              text: replica.text + ev.text,
            };
          } else if (ev.type === "skipped" || ev.type === "config_error") {
            skippedOrConfigError = true;
          }
        }
        if (ctrl.signal.aborted) return;
        if (replica !== null && replica.text.trim()) {
          completedTurn = {
            ...completedTurn,
            replica: {
              speaker: replica.speaker,
              respondingTo: replica.respondingTo,
              text: replica.text.trim(),
            },
          };
          if (submissionChatId) saveChatTurn(submissionChatId, completedTurn);
          dispatch({ type: "replica_done" });
        } else if (!skippedOrConfigError) {
          dispatch({ type: "replica_done" });
        }
        void persistCompletedTurn(completedTurn);
      } catch (err) {
        if ((err as Error).name === "AbortError") return;
        dispatch({ type: "fatal", message: (err as Error).message });
        void persistCompletedTurn(completedTurn);
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      dispatch({ type: "fatal", message: (err as Error).message });
    }
  }

  async function handleSynthesis() {
    if (!state.ctx || state.loading) return;
    const transcript = buildTranscriptFromState(state);
    if (transcript.length === 0) return;

    abortRef.current?.abort();
    const ctrl = new AbortController();
    abortRef.current = ctrl;
    dispatch({ type: "synthesis_start" });

    try {
      const synthesis = await requestSynthesis({
        userContext: state.ctx,
        transcript,
        conversationMemory: buildConversationMemory(activeChatIdRef.current),
        signal: ctrl.signal,
      });
      if (ctrl.signal.aborted) return;
      dispatch({ type: "synthesis_done", synthesis });
    } catch (err) {
      if ((err as Error).name === "AbortError") return;
      const message =
        err instanceof Error
          ? err.message
          : "No pudimos cerrar la síntesis.";
      dispatch({
        type: "synthesis_error",
        message,
        code: err instanceof SynthesisRequestError ? err.code : undefined,
      });
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
  const canRequestSynthesis =
    !state.loading &&
    state.phase === "wait" &&
    (state.lastUserMessage !== null || state.pastTurns.length > 0);
  const canUseDictation =
    !state.loading &&
    state.phase !== "fase4" &&
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
          {dictationError && (
            <p className="text-xs text-error" role="status">
              {dictationError}
            </p>
          )}
          <div className="flex items-center justify-between text-xs text-muted">
            <span>{state.userInput.length} / 4000</span>
            <div className="flex items-center gap-2">
              <DictationControl
                status={dictationStatus}
                disabled={!canUseDictation && dictationStatus === "idle"}
                onStart={startDictation}
                onStop={stopDictation}
              />
              {canRequestSynthesis && (
                <Button
                  type="button"
                  variant="secondary"
                  onClick={() => void handleSynthesis()}
                >
                  Cerrar con síntesis
                </Button>
              )}
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

function DictationControl({
  status,
  disabled,
  onStart,
  onStop,
}: {
  status: DictationStatus;
  disabled: boolean;
  onStart: () => void;
  onStop: () => void;
}) {
  if (status === "listening") {
    return (
      <div
        className="flex h-10 items-center gap-2 rounded-council border border-border-strong/70 bg-surface-soft px-2 shadow-soft"
        role="status"
        aria-label="Dictado activo"
      >
        <span className="typing-dots text-accent-strong" aria-hidden>
          <span />
          <span />
          <span />
        </span>
        <button
          type="button"
          onClick={onStop}
          aria-label="Detener dictado"
          title="Detener dictado"
          className="inline-flex h-8 w-8 items-center justify-center rounded-council border border-error/40 bg-error text-white shadow-soft transition hover:-translate-y-px hover:bg-error/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-error focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        >
          <StopIcon />
        </button>
      </div>
    );
  }

  if (status === "processing") {
    return (
      <button
        type="button"
        disabled
        aria-label="Procesando dictado"
        title="Procesando dictado"
        className="inline-flex h-10 w-10 items-center justify-center rounded-council border border-border-strong/70 bg-surface-soft text-accent-strong shadow-soft disabled:cursor-wait disabled:opacity-80"
      >
        <LoadingIcon />
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={onStart}
      disabled={disabled}
      aria-label="Iniciar dictado"
      title="Iniciar dictado"
      className="inline-flex h-10 w-10 items-center justify-center rounded-council border border-border-strong/70 bg-surface/80 text-accent-strong shadow-soft transition hover:-translate-y-px hover:border-accent hover:bg-accent-soft focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MicrophoneIcon />
    </button>
  );
}

function MicrophoneIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
    >
      <path
        d="M12 14.5a3.25 3.25 0 0 0 3.25-3.25v-4.5a3.25 3.25 0 0 0-6.5 0v4.5A3.25 3.25 0 0 0 12 14.5Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M6.5 10.75a5.5 5.5 0 0 0 11 0M12 16.25v3.25M9.25 19.5h5.5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="1.8"
      />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
    >
      <rect
        x="8"
        y="8"
        width="8"
        height="8"
        rx="1.5"
        fill="currentColor"
      />
    </svg>
  );
}

function LoadingIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-5 w-5 animate-spin"
      fill="none"
    >
      <circle
        cx="12"
        cy="12"
        r="8"
        stroke="currentColor"
        strokeOpacity="0.22"
        strokeWidth="2.5"
      />
      <path
        d="M20 12a8 8 0 0 0-8-8"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2.5"
      />
    </svg>
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
