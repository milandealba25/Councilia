/**
 * Script de verificación: una llamada mínima a Gemini.
 *
 * Uso: `npm run test:gemini` con `GEMINI_API_KEY` en `.env.local`
 * (o variables exportadas en el shell).
 */
import { config as loadEnv } from "dotenv";
import { resolve } from "node:path";

loadEnv({ path: resolve(process.cwd(), ".env.local") });
loadEnv();
import { GoogleGenerativeAI } from "@google/generative-ai";

async function main() {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.error(
      "[hello-gemini] Falta GEMINI_API_KEY. Copia .env.example a .env.local y define la clave.",
    );
    process.exit(1);
  }

  const modelId =
    process.env.GEMINI_MODELS?.split(",").map((m) => m.trim()).find(Boolean) ??
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
    console.error("[hello-gemini] Respuesta vacía o bloqueada.");
    process.exit(1);
  }

  console.log("[hello-gemini] OK · modelo:", modelId);
  console.log(text);
}

main().catch((err) => {
  console.error("[hello-gemini] Error:", err);
  process.exit(1);
});
