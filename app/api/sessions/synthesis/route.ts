import "server-only";
import { NextResponse } from "next/server";
import { synthesisRequestSchema } from "@/lib/api/contracts";
import { getLlm } from "@/lib/api/orchestrator";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  synthesisSchema,
  validateSynthesis,
} from "@/orchestrator/synthesis";
import {
  LlmError,
  llmErrorHeadline,
  type LlmErrorCode,
} from "@/orchestrator/llm";
import { renderUserContextBlock } from "@/lib/survey/survey.v1";
import { renderIntentCalibrationBlock } from "@/orchestrator/intentCalibrator";
import { clientKeyFromHeaders, sessionsLimiter } from "@/lib/security/rateLimit";
import { logger } from "@/lib/observability/logger";
import { emit as emitEvent } from "@/lib/observability/events";

/**
 * I4 · POST /api/sessions/synthesis — síntesis con JSON contract validado.
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const requestId = crypto.randomUUID();
  const log = logger.child({ requestId, route: "sessions.synthesis" });
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
    parsed = synthesisRequestSchema.parse(json);
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: err instanceof Error ? err.message : "validation_failed",
      },
      { status: 400 },
    );
  }

  const { userContext, transcript, conversationMemory } = parsed;
  let llm;
  try {
    llm = getLlm();
  } catch (err) {
    const code: LlmErrorCode = err instanceof LlmError ? err.code : "auth";
    log.error("synthesis_init_failed", {
      err: err instanceof Error ? err.message : String(err),
      code,
    });
    return NextResponse.json(
      { error: "config_error", code, message: llmErrorHeadline(code) },
      { status: 503 },
    );
  }

  emitEvent("session.synthesis.requested", { requestId });

  const userContent = [
    "Contexto del usuario:",
    renderUserContextBlock(userContext),
    "",
    renderIntentCalibrationBlock(userContext),
    "",
    conversationMemory
      ? `Memoria breve de conversaciones previas:\n${conversationMemory}`
      : "",
    conversationMemory ? "" : "",
    "Transcripción de la deliberación:",
    ...transcript.map((t) => `[${t.role}] ${t.text.trim()}`),
    "",
    "Devuélveme la síntesis siguiendo el JSON contract.",
  ].join("\n");

  let completion;
  try {
    completion = await llm.complete({
      systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
      messages: [{ role: "user", content: userContent }],
      maxTokens: 600,
      temperature: 0.4,
    });
  } catch (err) {
    const code: LlmErrorCode = err instanceof LlmError ? err.code : "unknown";
    log.error("synthesis_llm_error", {
      err: err instanceof Error ? err.message : String(err),
      code,
    });
    return NextResponse.json(
      {
        error: "synthesis_llm_error",
        code,
        message: llmErrorHeadline(code),
      },
      { status: code === "auth" ? 503 : 502 },
    );
  }

  const jsonText = extractJsonBlock(completion.text);
  if (!jsonText) {
    log.warn("synthesis_unparseable");
    return NextResponse.json(
      { error: "synthesis_unparseable", raw: completion.text },
      { status: 502 },
    );
  }

  let synthesis;
  try {
    synthesis = synthesisSchema.parse(JSON.parse(jsonText));
  } catch (err) {
    return NextResponse.json(
      {
        error: "synthesis_invalid_shape",
        detail: err instanceof Error ? err.message : "parse_error",
        raw: completion.text,
      },
      { status: 502 },
    );
  }

  const v = validateSynthesis(synthesis);
  if (!v.ok) {
    log.warn("synthesis_violation", { violations: v.violations });
    return NextResponse.json(
      { error: "synthesis_violation", violations: v.violations },
      { status: 422 },
    );
  }

  emitEvent("session.synthesis.delivered", {
    requestId,
    paths: synthesis.paths.length,
    tradeoffs: synthesis.tradeoffs.length,
  });

  return NextResponse.json(synthesis);
}

function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}
