"use client";

import { useEffect, useReducer, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { loadUserContext, saveUserContext } from "@/lib/survey/storage";
import { getValidAuthSession } from "@/lib/auth/client";
import { SURVEY_VERSION, type UserContext } from "@/lib/survey/survey.v1";
import { AGENT_IDS, AGENT_LABELS, type AgentId } from "@/lib/agents/ids";
import { AgentCard } from "@/components/agents/AgentCard";
import { AgentFace } from "@/components/agents/AgentFace";
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
  createPersistentChatSession,
  createChatTurnId,
  getChatSession,
  isPlanLimitError,
  saveChatTurn,
  savePersistentChatTurn,
  type ChatSession,
  type ChatTurn,
} from "@/lib/chat/chatStorage";

type DictationStatus = "idle" | "listening" | "processing";
type AudioContextConstructor = typeof AudioContext;

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
  onChatCreated?: (session: ChatSession) => void;
}

export function SessionConsole({ chatId, onChatCreated }: SessionConsoleProps) {
  const router = useRouter();
  const [state, dispatch] = useReducer(reducer, INITIAL_STATE);
  const abortRef = useRef<AbortController | null>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const dictationChunksRef = useRef<Blob[]>([]);
  const cancelDictationRef = useRef(false);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const waveformFrameRef = useRef<number | null>(null);
  const recordingTimerRef = useRef<number | null>(null);
  const recordingStartedAtRef = useRef<number | null>(null);
  const lastWaveformUpdateRef = useRef(0);
  const latestInputRef = useRef("");
  const composerTextAreaRef = useRef<HTMLTextAreaElement | null>(null);
  const mountedRef = useRef(true);
  const activeChatIdRef = useRef<string | null>(chatId);
  const skipHydrateChatIdRef = useRef<string | null>(null);
  const responseSectionRef = useRef<HTMLElement | null>(null);
  const shouldScrollToCouncilRef = useRef(false);
  const [dictationStatus, setDictationStatus] =
    useState<DictationStatus>("idle");
  const [dictationError, setDictationError] = useState<string | null>(null);
  const [dictationLevels, setDictationLevels] = useState<number[]>(
    () => Array.from({ length: 96 }, () => 0),
  );
  const [dictationElapsed, setDictationElapsed] = useState(0);
  const [replyTarget, setReplyTarget] = useState<AgentId | null>(null);

  useEffect(() => {
    activeChatIdRef.current = chatId;
    if (chatId && skipHydrateChatIdRef.current === chatId) {
      skipHydrateChatIdRef.current = null;
      return;
    }
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
      stopDictationVisualizer();
      mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    },
    [],
  );

  useEffect(() => {
    latestInputRef.current = state.userInput;
    resizeComposerTextArea(composerTextAreaRef.current);
  }, [state.userInput]);

  function resizeComposerTextArea(element: HTMLTextAreaElement | null) {
    if (!element) return;
    const styles = window.getComputedStyle(element);
    const lineHeight = Number.parseFloat(styles.lineHeight) || 22;
    const verticalSpace =
      Number.parseFloat(styles.paddingTop) +
      Number.parseFloat(styles.paddingBottom) +
      Number.parseFloat(styles.borderTopWidth) +
      Number.parseFloat(styles.borderBottomWidth);
    const maxHeight = lineHeight * 6 + verticalSpace;

    element.style.height = "auto";
    element.style.height = `${Math.min(element.scrollHeight, maxHeight)}px`;
    element.style.overflowY =
      element.scrollHeight > maxHeight ? "auto" : "hidden";
  }

  function handleUserInputChange(event: React.ChangeEvent<HTMLTextAreaElement>) {
    resizeComposerTextArea(event.currentTarget);
    dispatch({ type: "user_input", value: event.currentTarget.value });
  }

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
    stopDictationVisualizer();
    mediaStreamRef.current?.getTracks().forEach((track) => track.stop());
    mediaRecorderRef.current = null;
    mediaStreamRef.current = null;
    dictationChunksRef.current = [];
    cancelDictationRef.current = false;
    setDictationLevels(Array.from({ length: 46 }, () => 0));
    setDictationElapsed(0);
    setDictationStatus("idle");
  }

  function stopDictationVisualizer() {
    if (waveformFrameRef.current !== null) {
      window.cancelAnimationFrame(waveformFrameRef.current);
      waveformFrameRef.current = null;
    }
    if (recordingTimerRef.current !== null) {
      window.clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    void audioContextRef.current?.close().catch(() => null);
    audioContextRef.current = null;
    analyserRef.current = null;
    recordingStartedAtRef.current = null;
    lastWaveformUpdateRef.current = 0;
  }

  function startDictationVisualizer(stream: MediaStream) {
    stopDictationVisualizer();
    const AudioContextCtor =
      window.AudioContext ??
      (window as Window & { webkitAudioContext?: AudioContextConstructor })
        .webkitAudioContext;
    if (!AudioContextCtor) return;

    try {
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      const source = audioContext.createMediaStreamSource(stream);
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.82;
      source.connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      recordingStartedAtRef.current = Date.now();
      setDictationLevels(Array.from({ length: 96 }, () => 0));
      setDictationElapsed(0);

      recordingTimerRef.current = window.setInterval(() => {
        const startedAt = recordingStartedAtRef.current;
        if (startedAt) {
          setDictationElapsed(Math.floor((Date.now() - startedAt) / 1000));
        }
      }, 250);

      const samples = new Uint8Array(analyser.fftSize);
      let lastLevel = 0;
      const updateWaveform = (now: number) => {
        const activeAnalyser = analyserRef.current;
        if (!activeAnalyser) return;
        activeAnalyser.getByteTimeDomainData(samples);
        let sum = 0;
        for (const sample of samples) {
          const centered = (sample - 128) / 128;
          sum += centered * centered;
        }
        const rms = Math.sqrt(sum / samples.length);
        const voiceLevel = Math.max(0, Math.min(1, (rms - 0.014) * 9.5));
        lastLevel = lastLevel * 0.72 + voiceLevel * 0.28;
        const nextLevel = Math.max(lastLevel, voiceLevel);

        if (now - lastWaveformUpdateRef.current > 70) {
          lastWaveformUpdateRef.current = now;
          setDictationLevels((current) => [
            ...current.slice(1),
            nextLevel > 0.05 ? nextLevel : 0,
          ]);
        }

        waveformFrameRef.current = window.requestAnimationFrame(updateWaveform);
      };

      waveformFrameRef.current = window.requestAnimationFrame(updateWaveform);
    } catch {
      stopDictationVisualizer();
    }
  }

  function dictationErrorMessage(err: unknown): string {
    if (err instanceof TypeError && err.message === "Failed to fetch") {
      return "No pudimos conectar con el servicio de dictado. Revisa que el servidor siga activo y vuelve a intentarlo.";
    }
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
    const session = await getValidAuthSession();
    if (!session?.accessToken) {
      throw new Error("Necesitas iniciar sesión para usar dictado por voz.");
    }

    const formData = new FormData();
    const extension = blob.type.includes("mp4")
      ? "m4a"
      : blob.type.includes("ogg")
        ? "ogg"
        : "webm";
    formData.append("audio", blob, `dictado.${extension}`);

    const response = await fetch("/api/dictation", {
      method: "POST",
      headers: {
        authorization: `Bearer ${session.accessToken}`,
      },
      body: formData,
    });
    const payload = (await response.json().catch(() => null)) as {
      text?: string;
      error?: string;
      detail?: string;
      message?: string;
    } | null;

    if (!response.ok) {
      throw new Error(
        payload?.detail ??
          payload?.message ??
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
      startDictationVisualizer(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) dictationChunksRef.current.push(event.data);
      };

      recorder.onerror = (event) => {
        const error = "error" in event ? event.error : undefined;
        setDictationError(dictationErrorMessage(error));
        cleanupDictation();
      };

      recorder.onstop = () => {
        const wasCancelled = cancelDictationRef.current;
        const chunks = dictationChunksRef.current;
        const type = recorder.mimeType || mimeType || "audio/webm";
        const audio = new Blob(chunks, { type });
        mediaStreamRef.current?.getTracks().forEach((track) => track.stop());

        if (wasCancelled) {
          cleanupDictation();
          return;
        }

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

  function cancelDictation() {
    if (dictationStatus !== "listening") return;
    cancelDictationRef.current = true;
    setDictationStatus("processing");
    try {
      if (mediaRecorderRef.current?.state === "recording") {
        mediaRecorderRef.current.stop();
      } else {
        cleanupDictation();
      }
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

    const turnId = createChatTurnId();

    let submissionChatId = activeChatIdRef.current;
    if (!submissionChatId) {
      try {
        const session = await createPersistentChatSession();
        submissionChatId = session.id;
        activeChatIdRef.current = session.id;
        skipHydrateChatIdRef.current = session.id;
        onChatCreated?.(session);
      } catch (err) {
        if ((err as Error).message === "survey_required") {
          router.replace("/onboarding");
        } else if (isPlanLimitError(err)) {
          dispatch({ type: "fatal", message: err.message });
        }
        return;
      }
    }

    const conversationMemory = buildConversationMemory(submissionChatId);
    const draftTurn: ChatTurn = {
      turnId,
      userMessage: message,
      agents: { marco: "", elena: "", rafael: "" },
      replica: null,
    };
    const draftSave = savePersistentChatTurn(
      submissionChatId,
      draftTurn,
    );

    try {
      await draftSave;
    } catch (err) {
      if (isPlanLimitError(err)) {
        dispatch({ type: "fatal", message: err.message });
      }
      return;
    }

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
        let updated: ChatSession | null = null;
        try {
          updated = await savePersistentChatTurn(submissionChatId, turn);
        } catch (err) {
          if (isPlanLimitError(err)) {
            dispatch({ type: "fatal", message: err.message });
          }
          return;
        }
        if (
          updated?.summary &&
          mountedRef.current &&
          activeChatIdRef.current === submissionChatId
        ) {
          dispatch({ type: "memory_updated", summary: updated.summary });
        }
      };

      saveChatTurn(submissionChatId, completedTurn);

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
          saveChatTurn(submissionChatId, completedTurn);
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
  const isEmptyConversation =
    state.phase === "idle" &&
    state.lastUserMessage === null &&
    state.pastTurns.length === 0 &&
    !state.summary.trim();

  const showComposer = state.phase !== "fase4";
  const composerClassName =
    dictationStatus === "listening"
      ? "sticky bottom-5 z-20 mx-auto mt-auto flex w-full max-w-5xl flex-col overflow-visible rounded-full border border-[#d9784c]/18 bg-[#fff0e5]/96 p-0 shadow-[0_10px_26px_rgba(116,68,43,0.1)] backdrop-blur-xl transition-[background-color,border-color,box-shadow,max-width] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)]"
      : isEmptyConversation
        ? "mx-auto flex w-full max-w-3xl flex-col gap-2 overflow-visible rounded-[1.15rem] border border-[#d9784c]/18 bg-[#fff6ee]/90 p-2.5 shadow-[0_14px_34px_rgba(116,68,43,0.11)] backdrop-blur-xl transition-[transform,background-color,border-color,box-shadow,max-width] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[1.15rem] before:bg-[linear-gradient(135deg,rgba(255,246,238,0.98),rgba(255,250,244,0.94),rgba(255,230,218,0.88))] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:-z-10 after:h-10 after:rounded-t-[1.15rem] after:bg-gradient-to-b after:from-white/45 after:to-transparent"
      : "sticky bottom-5 z-20 mx-auto mt-auto flex w-full max-w-4xl flex-col gap-2 overflow-visible rounded-[1.05rem] border border-[#d9784c]/18 bg-[#fff6ee]/88 p-3 shadow-[0_18px_46px_rgba(116,68,43,0.14)] backdrop-blur-xl transition-[background-color,border-color,box-shadow,max-width] duration-[560ms] ease-[cubic-bezier(0.22,1,0.36,1)] before:pointer-events-none before:absolute before:inset-0 before:-z-10 before:rounded-[1.05rem] before:bg-[linear-gradient(135deg,rgba(255,246,238,0.98),rgba(255,250,244,0.94),rgba(255,230,218,0.9))] after:pointer-events-none after:absolute after:inset-x-0 after:top-0 after:-z-10 after:h-12 after:rounded-t-[1.05rem] after:bg-gradient-to-b after:from-white/45 after:to-transparent";

  function handleComposerKeyDown(
    event: React.KeyboardEvent<HTMLTextAreaElement>,
  ) {
    if (
      event.key !== "Enter" ||
      event.shiftKey ||
      event.altKey ||
      event.ctrlKey ||
      event.metaKey ||
      event.nativeEvent.isComposing
    ) {
      return;
    }

    event.preventDefault();
    if (canSubmit) {
      event.currentTarget.form?.requestSubmit();
    }
  }

  return (
    <div className={isEmptyConversation ? "flex min-h-[calc(100dvh-13rem)] flex-col justify-center pb-[6vh]" : "flex min-h-[calc(100dvh-12rem)] flex-col gap-[34px] pb-5"}>
      {!isEmptyConversation && <PhaseIndicator phase={state.phase} />}

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
        <div className={isEmptyConversation ? "mx-auto flex w-full max-w-5xl flex-col items-center gap-5" : "contents"}>
          {isEmptyConversation && (
            <header className="max-w-4xl text-center" style={{ animation: "soft-rise 520ms ease-out both" }}>
              <div
                className="mx-auto mb-3 flex items-center justify-center gap-2.5"
                aria-label="Tu council"
              >
                {AGENT_IDS.map((id, i) => (
                  <span
                    key={id}
                    style={{
                      animation: `soft-rise 700ms ease-out ${i * 120}ms both`,
                    }}
                  >
                    <AgentFace agent={id} size={36} mood="listening" />
                  </span>
                ))}
              </div>
              <p className="text-xs font-medium uppercase tracking-widest text-accent">
                Tu council está aquí
              </p>
              <h2 className="mt-2 text-balance text-2xl font-semibold tracking-tight text-foreground md:text-4xl">
                Marco, Elena y Rafael te están esperando.
              </h2>
              <p className="mx-auto mt-3 max-w-3xl text-balance text-sm leading-relaxed text-muted md:text-base">
                Cuéntales lo que te tiene así. Sin filtros. Cuando termines, te
                van a responder los tres a la vez, sin ponerse de acuerdo. Si dos
                de ellos se contradicen, uno toma la palabra y te hace una sola
                pregunta dura. Después, tu turno.
              </p>
              <div className="mx-auto mt-5 max-w-3xl">
                <PhaseIndicator phase={state.phase} />
              </div>
            </header>
          )}
          <form
            id="session-composer"
            onSubmit={handleSubmit}
            className={composerClassName}
            style={
              isEmptyConversation
                ? { animation: "soft-rise 560ms ease-out 90ms both" }
                : undefined
            }
          >
          {dictationStatus === "listening" ? (
            <DictationRecordingPanel
              elapsedSeconds={dictationElapsed}
              levels={dictationLevels}
              onCancel={cancelDictation}
              onConfirm={stopDictation}
            />
          ) : (
            <textarea
              ref={composerTextAreaRef}
              id="user-input"
              aria-label="Mensaje para el council"
              value={state.userInput}
              onChange={handleUserInputChange}
              onKeyDown={handleComposerKeyDown}
              maxLength={4000}
              rows={isEmptyConversation ? 2 : 3}
              disabled={state.phase === "fase4"}
              placeholder="Cuéntales lo que te tiene así. Como te salga. No tienes que ordenarlo."
              className="resize-none overflow-y-hidden rounded-council border border-[#d8a47d]/55 bg-[#fffaf4]/76 px-4 py-3 font-sans text-sm leading-relaxed text-foreground placeholder:text-muted/70 focus:border-[#d96339] focus:outline-none focus:ring-1 focus:ring-[#d96339]/35 disabled:opacity-60"
              autoFocus={state.phase === "wait"}
            />
          )}
          {dictationError && (
            <p className="text-xs text-error" role="status">
              {dictationError}
            </p>
          )}
          {dictationStatus !== "listening" && (
            <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted">
              <div className="flex min-w-0 flex-wrap items-center gap-2">
                <span>{state.userInput.length} / 4000</span>
                {canRequestSynthesis && (
                  <AgentReplySelector
                    value={replyTarget}
                    onChange={setReplyTarget}
                  />
                )}
              </div>
              <div className="flex flex-wrap items-center justify-end gap-2">
                <DictationControl
                  status={dictationStatus}
                  disabled={!canUseDictation && dictationStatus === "idle"}
                  onStart={startDictation}
                />
                {canRequestSynthesis && (
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => void handleSynthesis()}
                  >
                    Concluir
                  </Button>
                )}
                <Button type="submit" disabled={!canSubmit}>
                  {state.loading ? "Espera…" : "Enviar"}
                </Button>
              </div>
            </div>
          )}
          </form>
        </div>
      )}
    </div>
  );
}

function DictationControl({
  status,
  disabled,
  onStart,
}: {
  status: DictationStatus;
  disabled: boolean;
  onStart: () => void;
}) {
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
      className="inline-flex h-10 w-10 items-center justify-center rounded-council border border-[#d96339]/35 bg-[#fff7ef]/92 text-[#d96339] shadow-soft transition hover:-translate-y-px hover:border-[#d96339]/60 hover:bg-[#fff0e5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
    >
      <MicrophoneIcon />
    </button>
  );
}

function DictationRecordingPanel({
  elapsedSeconds,
  levels,
  onCancel,
  onConfirm,
}: {
  elapsedSeconds: number;
  levels: number[];
  onCancel: () => void;
  onConfirm: () => void;
}) {
  const hasSound = levels.some((level) => level > 0.08);
  const midPoint = Math.floor(levels.length / 2);

  return (
    <div
      className="relative flex min-h-[58px] w-full items-center gap-3 overflow-hidden rounded-full px-4 text-[#9b4c33] sm:px-6"
      role="status"
      aria-live="polite"
      aria-label="Dictado activo"
    >
      <div className="flex min-w-0 flex-1 items-center gap-2.5">
        <span className="flex h-8 min-w-0 flex-1 items-center justify-between gap-[2.5px]" aria-hidden>
          {levels.map((level, index) => {
            const height = hasSound ? 8 + level * 26 : 2;
            const distanceFromNow = Math.abs(index - midPoint) / midPoint;
            const baseOpacity = 0.24 + (1 - distanceFromNow) * 0.18;
            return (
              <span
                key={index}
                className="block w-[2.5px] rounded-full bg-[#9b4c33]/55 transition-[height,opacity,background-color] duration-100 ease-out"
                style={{
                  height: `${height}px`,
                  opacity: level > 0.05 ? 0.95 : baseOpacity,
                }}
              />
            );
          })}
        </span>
        <span
          className="w-9 shrink-0 text-center text-[0.68rem] font-medium tabular-nums text-[#8f5d48]"
          aria-label={`Grabando ${formatRecordingTime(elapsedSeconds)}`}
        >
          {formatRecordingTime(elapsedSeconds)}
        </span>
      </div>
      <div className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          onClick={onCancel}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#8f5d48] transition hover:bg-[#f3d8c6] hover:text-[#c55332] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/35"
          aria-label="Cancelar dictado"
          title="Cancelar dictado"
        >
          <XIcon />
        </button>
        <button
          type="button"
          onClick={onConfirm}
          className="inline-flex h-8 w-8 items-center justify-center rounded-full text-[#6f4d3b] transition hover:bg-[#f3d8c6] hover:text-[#d96339] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/35"
          aria-label="Usar dictado"
          title="Usar dictado"
        >
          <CheckIcon />
        </button>
      </div>
    </div>
  );
}

function formatRecordingTime(totalSeconds: number) {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function AgentReplySelector({
  value,
  onChange,
}: {
  value: AgentId | null;
  onChange: (agent: AgentId | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const label = value ? `Responder a ${AGENT_LABELS[value]}` : "Responder a";

  return (
    <div
      className="relative"
      onBlur={(event) => {
        const nextTarget = event.relatedTarget;
        if (
          nextTarget instanceof Node &&
          event.currentTarget.contains(nextTarget)
        ) {
          return;
        }
        setOpen(false);
      }}
    >
      <button
        type="button"
        className="inline-flex h-10 items-center justify-center gap-2 rounded-full border border-[#d96339]/45 bg-[#fff7ef]/92 px-4 text-sm font-medium text-[#d96339] shadow-soft backdrop-blur transition hover:-translate-y-px hover:border-[#d96339]/65 hover:bg-[#fff2e9] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/55 focus-visible:ring-offset-2 focus-visible:ring-offset-background"
        aria-haspopup="menu"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
      >
        {label}
        <ChevronDownIcon />
      </button>
      {open && (
        <div
          role="menu"
          className="absolute bottom-full left-0 z-50 mb-2 w-48 overflow-hidden rounded-[1.35rem] border border-[#d8a47d]/55 bg-[#fffaf4] p-2 text-sm text-[#5f4638] shadow-[0_22px_50px_rgba(116,68,43,0.22)]"
          style={{ animation: "dropdown-pop 160ms cubic-bezier(0.22, 1, 0.36, 1) both" }}
        >
          {AGENT_IDS.map((agent) => (
            <button
              key={agent}
              type="button"
              role="menuitemradio"
              aria-checked={value === agent}
              className="flex w-full items-center justify-between rounded-[0.85rem] px-3 py-2 text-left transition hover:bg-[#f4d8c7]/55 hover:text-[#c55332] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/35"
              onClick={() => {
                onChange(agent);
                setOpen(false);
              }}
            >
              <span>{AGENT_LABELS[agent]}</span>
              {value === agent && (
                <span className="h-1.5 w-1.5 rounded-full bg-[#d96339]" />
              )}
            </button>
          ))}
          {value && (
            <button
              type="button"
              role="menuitem"
              className="mt-1 w-full rounded-[0.85rem] border-t border-[#d8a47d]/25 px-3 py-2 text-left text-xs text-muted transition hover:bg-[#f4d8c7]/45 hover:text-[#8f5d48] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d96339]/35"
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
            >
              Sin agente elegido
            </button>
          )}
        </div>
      )}
    </div>
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

function XIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
    >
      <path
        d="m7 7 10 10M17 7 7 17"
        stroke="currentColor"
        strokeLinecap="round"
        strokeWidth="2"
      />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-6 w-6"
      fill="none"
    >
      <path
        d="m5.5 12.7 4.2 4.1L18.5 7"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="2"
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

function ChevronDownIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      className="h-4 w-4"
      fill="none"
    >
      <path
        d="m7 10 5 5 5-5"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth="1.8"
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
    auth: "Define GEMINI_API_KEYS o GEMINI_API_KEY y reinicia el servidor. En local, edita .env.local y reinicia npm run dev.",
    quota:
      "El proveedor está limitando llamadas. Espera unos segundos o revisa la cuota disponible de Gemini.",
    network:
      "La red entre el servidor y el proveedor de IA falló. Reintenta; si persiste, revisa logs del hosting.",
  };
  const hint =
    (
      {
        auth: "Define GEMINI_API_KEYS con claves separadas por coma, o GEMINI_API_KEY para compatibilidad. Si quieres fallback pagado, define OPENAI_API_KEY. Reinicia el servidor despues de editar .env.local.",
        quota:
          "Revisa la cuota de cada clave Gemini, el orden de GEMINI_MODELS y que OPENAI_API_KEY este disponible para fallback.",
        network:
          "La red entre el servidor y el proveedor de IA fallo. Reintenta; si persiste, revisa logs del hosting.",
      } as Partial<Record<LlmErrorCode, string>>
    )[code] ?? HINTS[code];
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
