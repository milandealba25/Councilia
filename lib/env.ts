import "server-only";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().url().optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  ANTHROPIC_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function parseServerEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return serverEnvSchema.parse({
      NODE_ENV: process.env.NODE_ENV ?? "development",
      ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
      NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
      SUPABASE_URL: process.env.SUPABASE_URL,
      SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    });
  }

  const parsed = serverEnvSchema.safeParse({
    NODE_ENV: process.env.NODE_ENV,
    ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY,
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
    if (!data.ANTHROPIC_API_KEY) {
      throw new Error(
        "[COUNCILia env] En producción, ANTHROPIC_API_KEY es obligatoria. Define la variable en el proveedor de hosting.",
      );
    }
  }

  return data;
}

export const env: ServerEnv = parseServerEnv();

export function requireAnthropicKey(): string {
  const key = env.ANTHROPIC_API_KEY;
  if (!key) {
    throw new Error(
      "[COUNCILia env] Falta ANTHROPIC_API_KEY. Añádela a .env.local para llamadas a Claude (ver .env.example).",
    );
  }
  return key;
}
