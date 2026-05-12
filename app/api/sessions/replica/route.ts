import "server-only";
import { NextResponse } from "next/server";
import { replicaRequestSchema } from "@/lib/api/contracts";
import { getDebateRouter } from "@/lib/api/orchestrator";
import { sseHeaders, sseStreamFromIterable, type SseEvent } from "@/lib/sse";

/**
 * I3 · POST /api/sessions/replica
 *
 * Body: { userContext, userMessage, postures }
 * Respuesta SSE:
 *   - `plan`     → { speaker, respondingTo, tensionScore }   (antes del 1er token)
 *   - `delta`    → { text }
 *   - `done`     → final del stream
 *   - `skipped`  → no había contradicción suficiente; flujo salta a fase 3.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Event =
  | {
      type: "plan";
      speaker: string;
      respondingTo: string;
      tensionScore: number;
    }
  | { type: "delta"; text: string }
  | { type: "done" }
  | { type: "skipped"; reason: string };

export async function POST(req: Request) {
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

  const { userContext, userMessage, postures } = parsed;
  const router = getDebateRouter();
  const started = router.startReplica({
    postures,
    userContext,
    userMessage,
  });

  const stream = sseStreamFromIterable(
    (async function* (): AsyncIterable<SseEvent<Event>> {
      if (!started) {
        yield {
          event: "skipped",
          data: {
            type: "skipped",
            reason: "no_significant_contradiction",
          },
        };
        return;
      }

      yield {
        event: "plan",
        data: {
          type: "plan",
          speaker: started.plan.speaker,
          respondingTo: started.plan.respondingTo,
          tensionScore: started.plan.tensionScore,
        },
      };

      for await (const chunk of started.stream) {
        yield {
          event: "delta",
          data: { type: "delta", text: chunk },
        };
      }
      yield { event: "done", data: { type: "done" } };
    })(),
  );

  return new Response(stream, { headers: sseHeaders() });
}
