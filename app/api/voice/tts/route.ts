import "server-only";
import { NextResponse } from "next/server";
import { z } from "zod";
import { ElevenLabsClient } from "@elevenlabs/elevenlabs-js";
import { maybeElevenLabsKey } from "@/lib/env";
import { AGENT_VOICE_PROFILES } from "@/lib/voice/voiceProfiles";
import { AGENT_IDS } from "@/lib/agents/ids";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const ttsRequestSchema = z.object({
  agent: z.enum(AGENT_IDS),
  text: z.string().min(1).max(4000),
});

/**
 * TTS server-side con ElevenLabs.
 *
 * Devuelve `audio/mpeg` para que el cliente lo reproduzca con HTMLAudioElement.
 * Si no hay API key, responde 503 y el cliente cae al fallback de Web Speech API.
 */
export async function POST(req: Request) {
  let parsed: z.infer<typeof ttsRequestSchema>;
  try {
    parsed = ttsRequestSchema.parse(await req.json());
  } catch (err) {
    return NextResponse.json(
      {
        error: "invalid_request",
        detail: err instanceof Error ? err.message : "validation_failed",
      },
      { status: 400 },
    );
  }

  const apiKey = maybeElevenLabsKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "missing_api_key", detail: "ELEVENLABS_API_KEY no configurada." },
      { status: 503 },
    );
  }

  const profile = AGENT_VOICE_PROFILES[parsed.agent];
  const client = new ElevenLabsClient({ apiKey });

  try {
    const response = await client.textToSpeech.convert(profile.elevenVoiceId, {
      text: parsed.text,
      modelId: "eleven_v3",
      outputFormat: "mp3_44100_128",
    });

    const audioArrayBuffer = await new Response(
      response as unknown as BodyInit,
    ).arrayBuffer();
    const bytes = new Uint8Array(audioArrayBuffer);
    return new NextResponse(bytes, {
      status: 200,
      headers: {
        "Content-Type": "audio/mpeg",
        "Cache-Control": "no-store",
      },
    });
  } catch (err) {
    return NextResponse.json(
      {
        error: "tts_failed",
        detail: err instanceof Error ? err.message : "unknown",
      },
      { status: 502 },
    );
  }
}
