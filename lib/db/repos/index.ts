import "server-only";
import { createMemoryRepos } from "./memory";
import type { Repos } from "./types";
import { getSupabaseConfig } from "../supabase";
import { logger } from "@/lib/observability/logger";

/**
 * Factory de repos. Hoy devuelve la implementación in-memory en todos los
 * entornos donde Supabase no está configurado; cuando `@supabase/supabase-js`
 * y las claves estén disponibles, este factory devolverá `SupabaseRepos`.
 *
 * Mantener una sola puerta de entrada evita que la app llame a `createClient()`
 * desde múltiples lugares y simplifica los tests.
 */

let cached: Repos | null = null;

export function getRepos(): Repos {
  if (cached) return cached;
  const supa = getSupabaseConfig();
  if (!supa) {
    logger.warn("repos.using_memory", {
      reason: "supabase_not_configured",
    });
  } else {
    logger.info("repos.using_memory_until_supabase_client_wired", {
      reason: "supabase_client_not_yet_wired",
    });
  }
  cached = createMemoryRepos();
  return cached;
}

export function resetReposForTests(): void {
  cached = null;
}

export type { Repos } from "./types";
