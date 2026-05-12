import "server-only";
import { NextResponse } from "next/server";
import { synthesisRequestSchema } from "@/lib/api/contracts";
import { getLlm } from "@/lib/api/orchestrator";
import {
  SYNTHESIS_SYSTEM_PROMPT,
  synthesisSchema,
  validateSynthesis,
} from "@/orchestrator/synthesis";
import { renderUserContextBlock } from "@/lib/survey/survey.v1";

/**
 * I4 · POST /api/sessions/synthesis
 *
 * Body: { userContext, transcript }
 * Respuesta JSON:
 *   - 200 → { paths, tradeoffs, closing }
 *   - 422 → { error: "synthesis_violation", violations: [...] }
 *           (la síntesis violó una regla dura del producto)
 */
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
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

  const { userContext, transcript } = parsed;
  const llm = getLlm();

  const userContent = [
    "Contexto del usuario:",
    renderUserContextBlock(userContext),
    "",
    "Transcripción de la deliberación:",
    ...transcript.map(
      (t) => `[${t.role}] ${t.text.trim()}`,
    ),
    "",
    "Devuélveme la síntesis siguiendo el JSON contract.",
  ].join("\n");

  const completion = await llm.complete({
    systemPrompt: SYNTHESIS_SYSTEM_PROMPT,
    messages: [{ role: "user", content: userContent }],
    maxTokens: 600,
    temperature: 0.4,
  });

  const jsonText = extractJsonBlock(completion.text);
  if (!jsonText) {
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
    return NextResponse.json(
      { error: "synthesis_violation", violations: v.violations },
      { status: 422 },
    );
  }

  return NextResponse.json(synthesis);
}

/**
 * Extrae el primer bloque JSON aunque el modelo envuelva en texto.
 * El system prompt prohíbe texto fuera, pero defendemos al endpoint.
 */
function extractJsonBlock(text: string): string | null {
  const start = text.indexOf("{");
  const end = text.lastIndexOf("}");
  if (start === -1 || end === -1 || end < start) return null;
  return text.slice(start, end + 1);
}
