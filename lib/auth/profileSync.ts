import "server-only";
import { getSupabaseServiceRoleKey } from "@/lib/db/supabase";

export interface AuthProfile {
  id: string;
  email: string;
  name?: string | null;
  avatarUrl?: string | null;
}

export interface PublicUserProfile {
  displayName: string | null;
  avatarUrl: string | null;
}

export async function syncPublicUser(
  supabaseUrl: string,
  profile: AuthProfile,
): Promise<void> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return;

  const existingProfile = await getPublicUserProfile(supabaseUrl, profile.id);
  const payload: Record<string, string | null> = {
    id: profile.id,
    email: profile.email,
    display_name: profile.name ?? existingProfile?.displayName ?? null,
  };

  if (profile.avatarUrl && !existingProfile?.avatarUrl) {
    payload.avatar_url = profile.avatarUrl;
  }

  const url = new URL("/rest/v1/users", supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    throw new Error("[auth] No se pudo sincronizar public.users.");
  }
}

export async function getPublicUserProfile(
  supabaseUrl: string,
  userId: string,
): Promise<PublicUserProfile | null> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return null;

  const url = new URL("/rest/v1/users", supabaseUrl);
  url.searchParams.set("select", "display_name,avatar_url");
  url.searchParams.set("id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
    },
  });

  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<{
    display_name?: string | null;
    avatar_url?: string | null;
  }>;
  const profile = rows[0];
  if (!profile) return null;
  return {
    displayName: profile.display_name ?? null,
    avatarUrl: profile.avatar_url ?? null,
  };
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

export function getProfileAvatarUrl(metadata: unknown): string | null {
  if (!metadata || typeof metadata !== "object") return null;
  const record = metadata as Record<string, unknown>;
  const value =
    record.avatar_url ?? record.picture ?? record.avatar ?? null;
  return typeof value === "string" && value.trim()
    ? value.trim()
    : null;
}
