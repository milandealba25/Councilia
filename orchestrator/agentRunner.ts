import type { Llm, LlmErrorCode } from "./llm";
import { LlmError } from "./llm";
import type { AgentId } from "@/lib/agents/ids";
import type { UserContext } from "@/lib/survey/survey.v1";
import { getAgent } from "@/agents/registry";
import { activeAgents } from "./intentCalibrator";
import {
  buildInitialSystemPrompt,
  buildReplicaSystemPrompt,
} from "./buildPrompt";

/**
 * K3 · AgentRunner.
 *
 * Ejecuta las llamadas a los agentes con dependencias inyectadas (Llm),
 * coordinando paralelismo en fase 1 y aislamiento de contexto en réplica.
 *
 * Diseñado para ser consumido por route handlers que reenvían SSE al cliente.
 */

export interface RunInitialEvent {
  agent: AgentId;
  type: "delta" | "done" | "error";
  text?: string;
  error?: string;
  /** Categoría estable del error (presente solo cuando `type === "error"`). */
  code?: LlmErrorCode;
}

export interface RunInitialOpts {
  userContext: UserContext;
  userMessage: string;
  conversationMemory?: string;
  model?: string;
  signal?: AbortSignal;
}

export class AgentRunner {
  constructor(private readonly llm: Llm) {}

  /**
   * Lanza en paralelo las posturas iniciales de los agentes activos (no atenuados).
   * Devuelve un único `AsyncIterable` con eventos etiquetados por agente,
   * ideal para reenviar como SSE.
   */
  async *runInitial(opts: RunInitialOpts): AsyncIterable<RunInitialEvent> {
    const agents = activeAgents(opts.userContext);
    const queue: RunInitialEvent[] = [];
    let pending = agents.length;
    let resolveNext: (() => void) | null = null;

    const wait = () =>
      new Promise<void>((res) => {
        resolveNext = res;
      });

    const push = (ev: RunInitialEvent) => {
      queue.push(ev);
      if (resolveNext) {
        const r = resolveNext;
        resolveNext = null;
        r();
      }
    };

    const consumeAgent = async (agent: AgentId) => {
      try {
        const spec = getAgent(agent);
        const system = buildInitialSystemPrompt({
          agent,
          userContext: opts.userContext,
        });
        for await (const chunk of this.llm.stream({
          systemPrompt: withConversationMemory(system, opts.conversationMemory),
          messages: [{ role: "user", content: opts.userMessage }],
          model: opts.model,
          maxTokens: spec.maxOutputTokens,
          signal: opts.signal,
        })) {
          push({ agent, type: "delta", text: chunk });
        }
        push({ agent, type: "done" });
      } catch (err) {
        push({
          agent,
          type: "error",
          error: err instanceof Error ? err.message : String(err),
          code: err instanceof LlmError ? err.code : "unknown",
        });
      } finally {
        pending -= 1;
        if (pending === 0 && resolveNext) {
          const r = resolveNext;
          resolveNext = null;
          r();
        }
      }
    };

    for (const agent of agents) void consumeAgent(agent);

    while (pending > 0 || queue.length > 0) {
      if (queue.length === 0) await wait();
      while (queue.length > 0) yield queue.shift()!;
    }
  }

  /**
   * Réplica selectiva: un solo agente, contexto reducido a la postura del otro.
   */
  async *runReplica(args: {
    agent: AgentId;
    respondingTo: AgentId;
    otherAgentPosture: string;
    userContext: UserContext;
    userMessage: string;
    conversationMemory?: string;
    model?: string;
    signal?: AbortSignal;
  }): AsyncIterable<string> {
    const spec = getAgent(args.agent);
    const system = buildReplicaSystemPrompt({
      agent: args.agent,
      userContext: args.userContext,
      respondingTo: args.respondingTo,
      otherAgentPosture: args.otherAgentPosture,
    });
    yield* this.llm.stream({
      systemPrompt: withConversationMemory(system, args.conversationMemory),
      messages: [{ role: "user", content: args.userMessage }],
      model: args.model,
      maxTokens: spec.maxOutputTokens,
      signal: args.signal,
    });
  }
}

function withConversationMemory(system: string, memory?: string): string {
  const clean = memory?.trim();
  if (!clean) return system;
  return [
    system,
    "",
    "Memoria breve de conversaciones previas (usar como contexto, no citar como verdad absoluta):",
    clean,
  ].join("\n");
}
