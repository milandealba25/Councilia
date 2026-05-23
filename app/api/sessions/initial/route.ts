import "server-only";
import { NextResponse } from "next/server";
import { initialRequestSchema } from "@/lib/api/contracts";
import { getAgentRunner } from "@/lib/api/orchestrator";
import { sseHeaders, sseStreamFromIterable, type SseEvent } from "@/lib/sse";
import { detectCrisis } from "@/orchestrator/crisisDetector";
import { activeAgents } from "@/orchestrator/intentCalibrator";
import type { AgentId } from "@/lib/agents/ids";
import type { RunInitialEvent } from "@/orchestrator/agentRunner";
import {
  LlmError,
  llmErrorHeadline,
  type LlmErrorCode,
} from "@/orchestrator/llm";
import { clientKeyFromHeaders, sessionsLimiter } from "@/lib/security/rateLimit";
import { logger } from "@/lib/observability/logger";
import { emit as emitEvent } from "@/lib/observability/events";

/**
 * I2 · POST /api/sessions/initial — SSE de 3 streams paralelos.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Event =
  | { agent?: AgentId; type: "delta"; text: string }
  | { agent: AgentId; type: "done" }
  | { agent: AgentId; type: "error"; error: string; code: LlmErrorCode }
  | { type: "meta"; activeAgents: AgentId[]; attenuated: AgentId[] }
  | { type: "crisis"; categories: string[] }
  | { type: "config_error"; code: LlmErrorCode; message: string }
  | { type: "complete" };

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "sessions.initial" });
  const clientKey = clientKeyFromHeaders(req.headers);

  const rl = sessionsLimiter.consume(clientKey);
  if (!rl.allowed) {
    log.warn("rate_limited", { clientKey, retryAfterMs: rl.retryAfterMs });
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      {
        status: 429,
        headers: {
          "Retry-After": Math.ceil(rl.retryAfterMs / 1000).toString(),
        },
      },
    );
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = initialRequestSchema.parse(json);
  } catch (err) {
    log.warn("invalid_request", {
      detail: err instanceof Error ? err.message : "validation_failed",
    });
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

  emitEvent("session.started", {
    requestId,
    decisionType: userContext.decisionType,
    urgency: userContext.urgency,
    attenuated,
    messageLength: userMessage.length,
  });

  const stream = sseStreamFromIterable(
    (async function* (): AsyncIterable<SseEvent<Event>> {
      if (crisis.triggered) {
        emitEvent("session.crisis.triggered", {
          requestId,
          categories: crisis.categories,
        });
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

      let runner;
      try {
        runner = getAgentRunner();
      } catch (err) {
        const code: LlmErrorCode =
          err instanceof LlmError ? err.code : "auth";
        log.error("initial_orchestrator_init_failed", {
          err: err instanceof Error ? err.message : String(err),
          code,
        });
        yield {
          event: "config_error",
          data: {
            type: "config_error",
            code,
            message: llmErrorHeadline(code),
          },
        };
        yield { event: "complete", data: { type: "complete" } };
        return;
      }

      const abort = new AbortController();
      req.signal?.addEventListener?.("abort", () => abort.abort());

      const completed = new Set<AgentId>();
      const errorCodes = new Set<LlmErrorCode>();
      try {
        for await (const ev of runner.runInitial({
          userContext,
          userMessage,
          signal: abort.signal,
        })) {
          if (ev.type === "done") {
            completed.add(ev.agent);
            emitEvent("session.posture.completed", {
              requestId,
              agent: ev.agent,
            });
          }
          if (ev.type === "error") {
            const code = ev.code ?? "unknown";
            errorCodes.add(code);
            emitEvent("session.error", {
              requestId,
              agent: ev.agent,
              code,
              error: ev.error,
            });
          }
          yield encodeEvent(ev);
        }
      } catch (err) {
        log.error("initial_stream_fatal", {
          err: err instanceof Error ? err.message : String(err),
        });
        const code: LlmErrorCode =
          err instanceof LlmError ? err.code : "unknown";
        yield {
          event: "config_error",
          data: {
            type: "config_error",
            code,
            message: llmErrorHeadline(code),
          },
        };
      }

      // Si todos los agentes activos fallaron con el mismo código sistémico,
      // emitir un único `config_error` para que la UI lo presente como banner
      // accionable en lugar de tres errores idénticos.
      if (
        completed.size === 0 &&
        errorCodes.size === 1 &&
        (errorCodes.has("auth") ||
          errorCodes.has("quota") ||
          errorCodes.has("network"))
      ) {
        const code = [...errorCodes][0]!;
        yield {
          event: "config_error",
          data: {
            type: "config_error",
            code,
            message: llmErrorHeadline(code),
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
      code: ev.code ?? "unknown",
    },
  };
}
