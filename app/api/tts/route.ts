import { NextResponse, type NextRequest } from "next/server";
import { authenticateRequest, isAuthError } from "@/lib/auth/serverSession";
import { canUseVoice } from "@/lib/billing/guards";
import { clientKeyFromHeaders, ttsLimiter } from "@/lib/security/rateLimit";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const OPENAI_TTS_URL = "https://api.openai.com/v1/audio/speech";

const AGENT_VOICES: Record<string, string> = {
  marco: "onyx",
  elena: "nova",
  rafael: "echo",
  synthesis: "alloy",
};

const MAX_TEXT_LENGTH = 2000;

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status });
}

function getOpenAiApiKey(): string | undefined {
  return process.env.OPENAI_API_KEY;
}

export async function POST(req: NextRequest) {
  const ipKey = clientKeyFromHeaders(req.headers);
  const ipRl = ttsLimiter.consume(`ip:${ipKey}`);
  if (!ipRl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: ipRl.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(ipRl.retryAfterMs / 1000)) } },
    );
  }

  const apiKey = getOpenAiApiKey();
  if (!apiKey) {
    return jsonError(503, "tts_unavailable", "El servicio de voz no está configurado.");
  }

  const auth = await authenticateRequest(req);
  if (isAuthError(auth)) return auth;

  const userRl = ttsLimiter.consume(`user:${auth.user.id}`);
  if (!userRl.allowed) {
    return NextResponse.json(
      { error: "rate_limited", retryAfterMs: userRl.retryAfterMs },
      { status: 429, headers: { "retry-after": String(Math.ceil(userRl.retryAfterMs / 1000)) } },
    );
  }

  try {
    const permission = await canUseVoice(auth.user.id);
    if (!permission.allowed) {
      console.error("[tts] voice denied", { userId: auth.user.id, code: (permission as { code?: string }).code, plan: (permission as { plan?: string }).plan });
      return NextResponse.json(
        { code: permission.code, message: permission.message, plan: permission.plan },
        { status: 403 },
      );
    }
  } catch (err) {
    console.error("[tts] guard error", err);
    return jsonError(502, "tts_guard_failed", "No pudimos validar tu plan.");
  }

  let body: { text?: string; agent?: string };
  try {
    body = await req.json();
  } catch {
    return jsonError(400, "invalid_json", "El cuerpo de la petición no es JSON válido.");
  }

  const { text, agent } = body;
  if (!text || typeof text !== "string" || !text.trim()) {
    return jsonError(400, "missing_text", "Falta el texto para convertir a voz.");
  }
  if (text.length > MAX_TEXT_LENGTH) {
    return jsonError(400, "text_too_long", `El texto no puede superar ${MAX_TEXT_LENGTH} caracteres.`);
  }

  const voice = AGENT_VOICES[agent ?? "synthesis"] ?? AGENT_VOICES.synthesis;

  try {
    const response = await fetch(OPENAI_TTS_URL, {
      method: "POST",
      headers: {
        authorization: `Bearer ${apiKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "tts-1",
        input: text.trim(),
        voice,
        response_format: "mp3",
        speed: 1.0,
      }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      console.error("[tts] OpenAI TTS error", response.status, detail);
      return jsonError(502, "tts_provider_error", "El servicio de voz no respondió correctamente.");
    }

    const audioBuffer = await response.arrayBuffer();

    return new NextResponse(audioBuffer, {
      status: 200,
      headers: {
        "content-type": "audio/mpeg",
        "cache-control": "private, max-age=3600",
      },
    });
  } catch (err) {
    console.error("[tts] request failed", err);
    return jsonError(502, "tts_failed", "No pudimos generar el audio.");
  }
}
