import "server-only";
import { getSupabaseServiceRoleKey } from "@/lib/db/supabase";

export interface AuthProfile {
  id: string;
  email: string;
  name?: string | null;
}

export async function syncPublicUser(
  supabaseUrl: string,
  profile: AuthProfile,
): Promise<void> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return;

  const url = new URL("/rest/v1/users", supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: profile.id,
      email: profile.email,
      display_name: profile.name ?? null,
    }),
  });

  if (!response.ok) {
    throw new Error("[auth] No se pudo sincronizar public.users.");
  }
}

export function getProfileName(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const value =
    record.full_name ?? record.name ?? record.display_name ?? null;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}

