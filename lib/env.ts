import "server-only";
import { z } from "zod";

const optionalUrl = z.preprocess(
  (v) => (v === "" || v === undefined ? undefined : v),
  z.string().url().optional(),
);

const serverEnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  GEMINI_API_KEY: z.string().min(1).optional(),
  GEMINI_API_KEYS: z.string().min(1).optional(),
  GEMINI_MODELS: z.string().min(1).optional(),
  OPENAI_API_KEY: z.string().min(1).optional(),
  NEXT_PUBLIC_APP_URL: optionalUrl,
  SUPABASE_URL: optionalUrl,
  SUPABASE_ANON_KEY: z.string().min(1).optional(),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1).optional(),
  STRIPE_SECRET_KEY: z.string().min(1).optional(),
  STRIPE_WEBHOOK_SECRET: z.string().min(1).optional(),
  NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY: z.string().min(1).optional(),
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;

function rawServerEnv() {
  return {
    NODE_ENV: process.env.NODE_ENV,
    GEMINI_API_KEY: process.env.GEMINI_API_KEY,
    GEMINI_API_KEYS: process.env.GEMINI_API_KEYS,
    GEMINI_MODELS: process.env.GEMINI_MODELS,
    OPENAI_API_KEY: process.env.OPENAI_API_KEY,
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY,
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    STRIPE_SECRET_KEY: process.env.STRIPE_SECRET_KEY,
    STRIPE_WEBHOOK_SECRET: process.env.STRIPE_WEBHOOK_SECRET,
    NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY:
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY,
  };
}

function parseServerEnv(): ServerEnv {
  if (process.env.SKIP_ENV_VALIDATION === "1") {
    return serverEnvSchema.parse({
      ...rawServerEnv(),
      NODE_ENV: process.env.NODE_ENV ?? "development",
    });
  }

  const parsed = serverEnvSchema.safeParse(rawServerEnv());

  if (!parsed.success) {
    const detail = parsed.error.errors
      .map((e) => `${e.path.join(".") || "root"}: ${e.message}`)
      .join(" | ");
    throw new Error(
      `[COUNCILia env] Configuracion invalida (${detail}). Copia .env.example a .env.local y completa los valores obligatorios para tu entorno.`,
    );
  }

  const data = parsed.data;
  const isProd = data.NODE_ENV === "production";

  if (isProd) {
    if (!data.OPENAI_API_KEY && !data.GEMINI_API_KEY && !data.GEMINI_API_KEYS) {
      throw new Error(
        "[COUNCILia env] En produccion, OPENAI_API_KEY, GEMINI_API_KEY o GEMINI_API_KEYS es obligatoria.",
      );
    }
  }

  return data;
}

export const env: ServerEnv = parseServerEnv();

function parseEnvList(value: string | undefined): string[] {
  return value
    ? value
        .split(",")
        .map((item) => item.trim())
        .filter(Boolean)
    : [];
}

export function getGeminiApiKeys(): string[] {
  return [
    ...new Set([
      ...parseEnvList(env.GEMINI_API_KEYS),
      ...parseEnvList(env.GEMINI_API_KEY),
    ]),
  ];
}

export function requireGeminiKey(): string {
  const key = getGeminiApiKeys()[0];
  if (!key) {
    throw new Error(
      "[COUNCILia env] Falta GEMINI_API_KEYS o GEMINI_API_KEY. Anadela a .env.local para llamadas a Gemini (ver .env.example).",
    );
  }
  return key;
}
