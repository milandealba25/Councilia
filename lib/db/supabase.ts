import "server-only";
import { env } from "@/lib/env";

/**
 * A6 (base) · Cliente Supabase server-side.
 *
 * El paquete `@supabase/supabase-js` se añadirá cuando llegue la migración
 * inicial (J1). Por ahora exponemos un factory tipado que valida config y
 * deja un único lugar donde inyectar el cliente real (sin esparcir lectura
 * de envs por la app).
 */

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
