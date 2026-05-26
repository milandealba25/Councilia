import "server-only";
import { env } from "@/lib/env";

export interface SupabaseConfig {
  url: string;
  anonKey: string;
}

export function getSupabaseConfig(): SupabaseConfig | null {
  if (!env.SUPABASE_URL || !env.SUPABASE_ANON_KEY) return null;
  return { url: env.SUPABASE_URL, anonKey: env.SUPABASE_ANON_KEY };
}

export function requireSupabaseConfig(): SupabaseConfig {
  const cfg = getSupabaseConfig();
  if (!cfg) {
    throw new Error(
      "[supabase] Faltan SUPABASE_URL / SUPABASE_ANON_KEY (ver .env.example). Define ambas para activar persistencia.",
    );
  }
  return cfg;
}

export function getSupabaseServiceRoleKey(): string | null {
  return env.SUPABASE_SERVICE_ROLE_KEY ?? null;
}
