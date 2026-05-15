import "server-only";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().url().optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function parseServerEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return serverEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV ?? "development",
      GEMINI_API_KEY: process.env.GEMINI_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    });
  }

  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
  });

  if (!parsed.success) {
    const detail = parsed.error.errors
      .map((e) => `${e.path.join(".") || "root"}: ${e.message}`)
      .join(" · ");
    throw new Error(
      `[COUNCILia env] Configuración inválida (${detail}). Copia .env.example a .env.local y completa los valores obligatorios para tu entorno.`,
    );
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";

  if (isProd) {
    if (!data.GEMINI_API_KEY) {
      throw new Error(
        "[COUNCILia env] En producción, GEMINI_API_KEY es obligatoria. Define la variable en el proveedor de hosting.",
      );
    }
  }

  return data;
}

export const env: ServerEnv = parseServerEnv();

export function requireGeminiKey(): string {
  const key = env.GEMINI_API_KEY;
  if (!key) {
    throw new Error(
      "[COUNCILia env] Falta GEMINI_API_KEY. Añádela a .env.local para llamadas a Gemini (ver .env.example).",
    );
  }
  return key;
}
