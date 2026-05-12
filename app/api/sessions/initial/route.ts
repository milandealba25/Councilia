import "server-only";
import { NextResponse } from "next/server";
import { initialRequestSchema } from "@/lib/api/contracts";
import { getAgentRunner } from "@/lib/api/orchestrator";
import { sseHeaders, sseStreamFromIterable, type SseEvent } from "@/lib/sse";
import { detectCrisis } from "@/orchestrator/crisisDetector";
import { activeAgents } from "@/orchestrator/intentCalibrator";
import type { AgentId } from "@/lib/agents/ids";
import type { RunInitialEvent } from "@/orchestrator/agentRunner";

/**
 * I2 · POST /api/sessions/initial
 *
 * Body: { userContext, userMessage }
 * Respuesta: stream SSE con eventos:
 *   - `meta`     → { activeAgents, attenuated }
 *   - `delta`    → { agent, text }
 *   - `done`     → { agent }
 *   - `error`    → { agent, error }
 *   - `crisis`   → { categories } (sustituye al resto si se dispara)
 *   - `complete` → fin de turno (todos los agentes han cerrado o fallado)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Event =
  | { agent?: AgentId; type: "delta"; text: string }
  | { agent: AgentId; type: "done" }
  | { agent: AgentId; type: "error"; error: string }
  | { type: "meta"; activeAgents: AgentId[]; attenuated: AgentId[] }
  | { type: "crisis"; categories: string[] }
  | { type: "complete" };

export async function POST(req: Request) {
  let parsed;
  try {
    const json = await req.json();
    parsed = initialRequestSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: err instanceof Error ? err.message : "validation_failed",
      },
      { status: 400 },
    );
  }

  const { userContext, userMessage } = parsed;
  const crisis = detectCrisis(userMessage);
  const active = activeAgents(userContext);
  const attenuated = (["marco", "elena", "rafael"] as const).filter(
    (a) => !active.includes(a),
  );

  const stream = sseStreamFromIterable(
    (async function* (): AsyncIterable<SseEvent<Event>> {
      if (crisis.triggered) {
        yield {
          event: "crisis",
          data: { type: "crisis", categories: crisis.categories },
        };
        yield { event: "complete", data: { type: "complete" } };
        return;
      }

      yield {
        event: "meta",
        data: {
          type: "meta",
          activeAgents: [...active],
          attenuated,
        },
      };

      const runner = getAgentRunner();
      const abort = new AbortController();
      req.signal?.addEventListener?.("abort", () => abort.abort());

      try {
        for await (const ev of runner.runInitial({
          userContext,
          userMessage,
          signal: abort.signal,
        })) {
          yield encodeEvent(ev);
        }
      } catch (err) {
        yield {
          event: "error",
          data: {
            type: "error",
            agent: "marco",
            error: err instanceof Error ? err.message : "unknown",
          },
        };
      }

      yield { event: "complete", data: { type: "complete" } };
    })(),
  );

  return new Response(stream, { headers: sseHeaders() });
}

function encodeEvent(ev: RunInitialEvent): SseEvent<Event> {
  if (ev.type === "delta") {
    return {
      event: "delta",
      data: { agent: ev.agent, type: "delta", text: ev.text ?? "" },
    };
  }
  if (ev.type === "done") {
    return { event: "done", data: { agent: ev.agent, type: "done" } };
  }
  return {
    event: "error",
    data: {
      agent: ev.agent,
      type: "error",
      error: ev.error ?? "unknown",
    },
  };
}
