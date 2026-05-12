/**
 * Script de verificación **A5**: una llamada mínima a Claude Sonnet.
 *
 * Uso: `npm run test:anthropic` con `ANTHROPIC_API_KEY` en `.env.local`
 * (o variables exportadas en el shell).
 */
import "dotenv/config";
import Anthropic from "@anthropic-ai/sdk";

async function main() {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) {
    console.error(
      "[hello-anthropic] Falta ANTHROPIC_API_KEY. Copia .env.example a .env.local y define la clave.",
    );
    process.exit(1);
  }

  const client = new Anthropic({ apiKey });
  const model =
    process.env.ANTHROPIC_MODEL ?? "claude-3-5-sonnet-20241022";
  const message = await client.messages.create({
    model,
    max_tokens: 128,
    messages: [
      {
        role: "user",
        content: 'Responde en una sola frase: confirma que recibiste este mensaje de prueba de COUNCILia.',
      },
    ],
  });

  const text = message.content.find((b) => b.type === "text");
  if (!text || text.type !== "text") {
    console.error("[hello-anthropic] Respuesta inesperada:", message.content);
    process.exit(1);
  }

  console.log("[hello-anthropic] OK · modelo:", message.model);
  console.log(text.text.trim());
}

main().catch((err) => {
  console.error("[hello-anthropic] Error:", err);
  process.exit(1);
});
