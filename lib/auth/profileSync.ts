import "server-only";
import { getSupabaseServiceRoleKey } from "@/lib/db/supabase";
import { logger } from "@/lib/observability/logger";

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

export interface SupabaseRestCredentials {
  apiKey: string;
  bearerToken: string;
}

export async function syncPublicUser(
  supabaseUrl: string,
  profile: AuthProfile,
): Promise<void> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return;

  await syncPublicUserWithCredentials(
    supabaseUrl,
    { apiKey: serviceRoleKey, bearerToken: serviceRoleKey },
    profile,
  );
}

export async function syncPublicUserWithCredentials(
  supabaseUrl: string,
  credentials: SupabaseRestCredentials,
  profile: AuthProfile,
): Promise<void> {
  const existingProfile = await getPublicUserProfileWithCredentials(
    supabaseUrl,
    credentials,
    profile.id,
  );
  const payload: Record<string, string | null> = {
    id: profile.id,
    email: profile.email,
    display_name: existingProfile?.displayName ?? profile.name ?? null,
  };

  if (profile.avatarUrl && !existingProfile?.avatarUrl) {
    payload.avatar_url = profile.avatarUrl;
  }

  const url = new URL("/rest/v1/users", supabaseUrl);
  const response = await fetch(url, {
    method: "POST",
    headers: {
      apikey: credentials.apiKey,
      authorization: `Bearer ${credentials.bearerToken}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(
      `[auth] No se pudo sincronizar public.users (${response.status}): ${detail.slice(0, 300)}`,
    );
  }
}

export async function syncPublicUserBestEffort(
  supabaseUrl: string,
  profile: AuthProfile,
  credentials?: SupabaseRestCredentials,
): Promise<PublicUserProfile | null> {
  try {
    if (credentials) {
      await syncPublicUserWithCredentials(supabaseUrl, credentials, profile);
    } else {
      await syncPublicUser(supabaseUrl, profile);
    }
  } catch (error) {
    logger.warn("[auth] La sincronizacion de public.users fallo.", {
      userId: profile.id,
      reason: error instanceof Error ? error.message : "unknown",
    });
  }

  const readProfile = credentials
    ? getPublicUserProfileWithCredentials(supabaseUrl, credentials, profile.id)
    : getPublicUserProfile(supabaseUrl, profile.id);

  return readProfile.catch((error) => {
    logger.warn("[auth] No se pudo leer public.users.", {
      userId: profile.id,
      reason: error instanceof Error ? error.message : "unknown",
    });
    return null;
  });
}

export async function getPublicUserProfile(
  supabaseUrl: string,
  userId: string,
): Promise<PublicUserProfile | null> {
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) return null;

  return getPublicUserProfileWithCredentials(
    supabaseUrl,
    { apiKey: serviceRoleKey, bearerToken: serviceRoleKey },
    userId,
  );
}

export async function getPublicUserProfileWithCredentials(
  supabaseUrl: string,
  credentials: SupabaseRestCredentials,
  userId: string,
): Promise<PublicUserProfile | null> {
  const url = new URL("/rest/v1/users", supabaseUrl);
  url.searchParams.set("select", "display_name,avatar_url");
  url.searchParams.set("id", `eq.${userId}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: {
      apikey: credentials.apiKey,
      authorization: `Bearer ${credentials.bearerToken}`,
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
