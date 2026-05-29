import "server-only";
import { NextResponse } from "next/server";
import { replicaRequestSchema } from "@/lib/api/contracts";
import { getDebateRouter } from "@/lib/api/orchestrator";
import { sseHeaders, sseStreamFromIterable, type SseEvent } from "@/lib/sse";
import {
  LlmError,
  llmErrorHeadline,
  type LlmErrorCode,
} from "@/orchestrator/llm";
import { clientKeyFromHeaders, sessionsLimiter } from "@/lib/security/rateLimit";
import { logger } from "@/lib/observability/logger";
import { emit as emitEvent } from "@/lib/observability/events";
import { tryAuthenticateRequest } from "@/lib/auth/serverSession";
import { getModelForUser } from "@/lib/billing/models";

/**
 * I3 · POST /api/sessions/replica — réplica selectiva con contexto reducido.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Event =
  | {
      type: "plan";
      speaker: string;
      respondingTo: string;
      tensionScore: number;
    }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "skipped"; reason: string }
  | { type: "config_error"; code: LlmErrorCode; message: string };

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "sessions.replica" });
  const clientKey = clientKeyFromHeaders(req.headers);
  const rl = sessionsLimiter.consume(clientKey);
  if (!rl.allowed) {
    log.warn("rate_limited", { clientKey });
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: rl.retryAfterMs },
      { status: 429 },
    );
  }

  let parsed;
  try {
    const json = await req.json();
    parsed = replicaRequestSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: err instanceof Error ? err.message : "validation_failed",
      },
      { status: 400 },
    );
  }

  const { userContext, userMessage, conversationMemory, postures } = parsed;
  let llmModel: string | undefined;
  const auth = await tryAuthenticateRequest(req);
  if (auth) {
    try {
      llmModel = (await getModelForUser(auth.user.id)).llmModel;
    } catch {
      llmModel = undefined;
    }
  }

  const stream = sseStreamFromIterable(
    (async function* (): AsyncIterable<SseEvent<Event>> {
      let started;
      try {
        const router = getDebateRouter();
        started = router.startReplica({
          postures,
          userContext,
          userMessage,
          conversationMemory,
          model: llmModel,
        });
      } catch (err) {
        const code: LlmErrorCode =
          err instanceof LlmError ? err.code : "auth";
        log.error("replica_init_failed", {
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
        return;
      }

      if (!started) {
        emitEvent("session.replica.skipped", {
          requestId,
          reason: "no_significant_contradiction",
        });
        yield {
          event: "skipped",
          data: {
            type: "skipped",
            reason: "no_significant_contradiction",
          },
        };
        return;
      }

      emitEvent("session.replica.completed", {
        requestId,
        speaker: started.plan.speaker,
        respondingTo: started.plan.respondingTo,
        tensionScore: started.plan.tensionScore,
      });

      yield {
        event: "plan",
        data: {
          type: "plan",
          speaker: started.plan.speaker,
          respondingTo: started.plan.respondingTo,
          tensionScore: started.plan.tensionScore,
        },
      };

      try {
        for await (const chunk of started.stream) {
          yield {
            event: "delta",
            data: { type: "delta", text: chunk },
          };
        }
        yield { event: "done", data: { type: "done" } };
      } catch (err) {
        const code: LlmErrorCode =
          err instanceof LlmError ? err.code : "unknown";
        log.error("replica_stream_failed", {
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
      }
    })(),
  );

  return new Response(stream, { headers: sseHeaders() });
}
