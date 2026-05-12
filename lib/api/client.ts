"use client";

import { parseSseStream } from "@/lib/sse";
import type { AgentId } from "@/lib/agents/ids";
import type { UserContext } from "@/lib/survey/survey.v1";
import type { Synthesis } from "@/orchestrator/synthesis";

/**
 * Cliente tipado de los endpoints del orquestador.
 * Cada función abre el stream SSE y devuelve un `AsyncIterable` con eventos
 * discriminados por `type`. Los componentes consumidores pueden hacer
 * pattern matching sobre el tipo sin parser propio.
 */

export type InitialEvent =
  | { type: "meta"; activeAgents: AgentId[]; attenuated: AgentId[] }
  | { type: "delta"; agent: AgentId; text: string }
  | { type: "done"; agent: AgentId }
  | { type: "error"; agent: AgentId; error: string }
  | { type: "crisis"; categories: string[] }
  | { type: "complete" };

export type ReplicaEvent =
  | {
      type: "plan";
      speaker: AgentId;
      respondingTo: AgentId;
      tensionScore: number;
    }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "skipped"; reason: string };

export interface TranscriptTurn {
  role: "user" | AgentId;
  text: string;
}

async function* streamPost<T>(
  url: string,
  body: unknown,
  signal?: AbortSignal,
): AsyncIterable<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
    signal,
  });
  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Endpoint error (${res.status}): ${detail}`);
  }
  for await (const ev of parseSseStream<T>(res.body)) {
    yield ev.data;
  }
}

export function streamInitial(args: {
  userContext: UserContext;
  userMessage: string;
  signal?: AbortSignal;
}): AsyncIterable<InitialEvent> {
  return streamPost<InitialEvent>(
    "/api/sessions/initial",
    { userContext: args.userContext, userMessage: args.userMessage },
    args.signal,
  );
}

export function streamReplica(args: {
  userContext: UserContext;
  userMessage: string;
  postures: Array<{ agent: AgentId; text: string }>;
  signal?: AbortSignal;
}): AsyncIterable<ReplicaEvent> {
  return streamPost<ReplicaEvent>(
    "/api/sessions/replica",
    {
      userContext: args.userContext,
      userMessage: args.userMessage,
      postures: args.postures,
    },
    args.signal,
  );
}

export async function requestSynthesis(args: {
  userContext: UserContext;
  transcript: TranscriptTurn[];
  signal?: AbortSignal;
}): Promise<Synthesis> {
  const res = await fetch("/api/sessions/synthesis", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      userContext: args.userContext,
      transcript: args.transcript,
    }),
    signal: args.signal,
  });
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Synthesis error (${res.status}): ${detail}`);
  }
  return (await res.json()) as Synthesis;
}
