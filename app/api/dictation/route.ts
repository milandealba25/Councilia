import { NextResponse, type NextRequest } from "next/server";
import { GoogleGenerativeAI } from "@google/generative-ai";
import OpenAI from "openai";
import { env } from "@/lib/env";
import { authenticateRequest, isAuthError } from "@/lib/auth/serverSession";
import { canUseVoice } from "@/lib/billing/guards";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_AUDIO_BYTES = 18 * 1024 * 1024;
const DEFAULT_GEMINI_TRANSCRIPTION_MODELS = [
  "gemini-2.5-flash",
  "gemini-2.0-flash",
] as const;

function jsonError(status: number, error: string, detail?: string) {
  return NextResponse.json({ error, detail }, { status });
}

function parseModelList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((model) => model.trim())
        .filter(Boolean)
    : [];
}

function uniqueModels(models: string[]): string[] {
  return [...new Set(models.filter(Boolean))];
}

function transcriptionModels(): string[] {
  return uniqueModels([
    process.env.GEMINI_TRANSCRIPTION_MODEL ?? "",
    ...DEFAULT_GEMINI_TRANSCRIPTION_MODELS,
    ...parseModelList(process.env.GEMINI_MODELS),
  ]);
}

async function transcribeWithGemini(file: File): Promise<string> {
  if (!env.GEMINI_API_KEY) {
    throw new Error("Falta GEMINI_API_KEY para transcribir audio.");
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  const genAI = new GoogleGenerativeAI(env.GEMINI_API_KEY);
  const errors: string[] = [];

  for (const modelId of transcriptionModels()) {
    try {
      const model = genAI.getGenerativeModel({
        model: modelId,
        systemInstruction:
          "Transcribe audio en español. Devuelve solo el texto dictado, sin comillas, explicaciones ni formato.",
      });
      const result = await model.generateContent({
        contents: [
          {
            role: "user",
            parts: [
              {
                inlineData: {
                  data: bytes.toString("base64"),
                  mimeType: file.type || "audio/webm",
                },
              },
              {
                text: "Transcribe exactamente lo que dice el usuario. Conserva puntuacion natural.",
              },
            ],
          },
        ],
        generationConfig: {
          temperature: 0,
          maxOutputTokens: 1200,
        },
      });
      return result.response.text().trim();
    } catch (err) {
      errors.push(err instanceof Error ? err.message : String(err));
    }
  }

  throw new Error(errors.at(-1) ?? "Gemini no pudo transcribir el audio.");
}

async function transcribeWithOpenAI(file: File): Promise<string> {
  if (!env.OPENAI_API_KEY) {
    throw new Error("Falta OPENAI_API_KEY para transcribir audio.");
  }

  const client = new OpenAI({ apiKey: env.OPENAI_API_KEY });
  const result = await client.audio.transcriptions.create({
    file,
    model: process.env.OPENAI_TRANSCRIPTION_MODEL ?? "gpt-4o-mini-transcribe",
    language: "es",
    response_format: "json",
  });

  return result.text.trim();
}

export async function POST(req: NextRequest) {
  const auth = await authenticateRequest(req);
  if (isAuthError(auth)) {
    return auth;
  }

  let permission;
  try {
    permission = await canUseVoice(auth.user.id);
    if (!permission.allowed) {
      return NextResponse.json(
        {
          code: permission.code,
          message: permission.message,
          plan: permission.plan,
        },
        { status: 403 },
      );
    }
  } catch (err) {
    console.error("[dictation] entitlement check failed", err);
    return jsonError(502, "dictation_guard_failed", "No pudimos validar tu plan.");
  }

  let formData: FormData;
  try {
    formData = await req.formData();
  } catch {
    return jsonError(400, "invalid_form", "El audio no llego correctamente.");
  }

  const audio = formData.get("audio");
  if (!(audio instanceof File)) {
    return jsonError(400, "missing_audio", "No recibimos ningun archivo de audio.");
  }
  if (audio.size === 0) {
    return jsonError(400, "empty_audio", "El audio llego vacio.");
  }
  if (audio.size > MAX_AUDIO_BYTES) {
    return jsonError(413, "audio_too_large", "El dictado es demasiado largo.");
  }

  try {
    const text = env.GEMINI_API_KEY
      ? await transcribeWithGemini(audio)
      : await transcribeWithOpenAI(audio);

    return NextResponse.json({ text, plan: permission.plan });
  } catch (err) {
    const detail =
      err instanceof Error
        ? err.message
        : "No pudimos transcribir el audio.";
    console.error("[dictation] transcription failed", err);
    return jsonError(502, "transcription_failed", detail);
  }
}
