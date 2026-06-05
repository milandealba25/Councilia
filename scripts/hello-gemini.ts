/**
 * Script de verificacion: una llamada minima a Gemini.
 *
 * Uso: `npm run test:gemini` con `GEMINI_API_KEYS` o `GEMINI_API_KEY`
 * en `.env.local` (o variables exportadas en el shell).
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv();
import { GoogleGenerativeAI } from "@google/generative-ai";

function parseList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

async function main() {
  const apiKey = [
    ...new Set([
      ...parseList(process.env.GEMINI_API_KEYS),
      ...parseList(process.env.GEMINI_API_KEY),
    ]),
  ][0];
  if (!apiKey) {
    console.error(
      "[hello-gemini] Falta GEMINI_API_KEYS o GEMINI_API_KEY. Define al menos una clave en .env.local.",
    );
    process.exit(1);
  }

  const modelId =
    parseList(process.env.GEMINI_MODELS)[0] ??
    process.env.GEMINI_MODEL ??
    "gemini-3.1-flash-lite";
  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({ model: modelId });
  const result = await model.generateContent({
    contents: [
      {
        role: "user",
        parts: [
          {
            text: "Responde en una sola frase: confirma que recibiste este mensaje de prueba de COUNCILia.",
          },
        ],
      },
    ],
    generationConfig: { maxOutputTokens: 128, temperature: 0.7 },
  });

  const text = result.response.text().trim();
  if (!text) {
    console.error("[hello-gemini] Respuesta vacia o bloqueada.");
    process.exit(1);
  }

  console.log("[hello-gemini] OK | modelo:", modelId);
  console.log(text);
}

main().catch((err) => {
  console.error("[hello-gemini] Error:", err);
  process.exit(1);
});
