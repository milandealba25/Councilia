import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
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

let _anonClient: SupabaseClient | null = null;
let _adminClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  if (!cfg) return null;
  if (!_anonClient) {
    _anonClient = createClient(cfg.url, cfg.anonKey);
  }
  return _anonClient;
}

export function getSupabaseAdmin(): SupabaseClient | null {
  const cfg = getSupabaseConfig();
  const serviceKey = getSupabaseServiceRoleKey();
  if (!cfg || !serviceKey) return null;
  if (!_adminClient) {
    _adminClient = createClient(cfg.url, serviceKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _adminClient;
}
