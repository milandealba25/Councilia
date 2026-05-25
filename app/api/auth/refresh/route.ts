import { NextResponse } from "next/server";
import { requireSupabaseConfig } from "@/lib/db/supabase";
import {
  getProfileAvatarUrl,
  getProfileName,
  getPublicUserProfile,
  syncPublicUser,
} from "@/lib/auth/profileSync";

export const dynamic = "force-dynamic";

interface SupabaseRefreshResponse {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    refreshToken?: string;
  } | null;
  const refreshToken = body?.refreshToken?.trim();

  if (!refreshToken) {
    return NextResponse.json(
      { error: "Falta el token de renovacion." },
      { status: 400 },
    );
  }

  const { url, anonKey } = requireSupabaseConfig();
  const response = await fetch(
    new URL("/auth/v1/token?grant_type=refresh_token", url),
    {
      method: "POST",
      headers: {
        apikey: anonKey,
        authorization: `Bearer ${anonKey}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ refresh_token: refreshToken }),
    },
  );

  const data = (await response.json().catch(() => null)) as
    | SupabaseRefreshResponse
    | null;

  if (!response.ok || !data?.access_token || !data.user?.id || !data.user.email) {
    return NextResponse.json(
      { error: "La sesion guardada expiro. Vuelve a iniciar sesion." },
      { status: response.status || 401 },
    );
  }

  const user = {
    id: data.user.id,
    email: data.user.email,
    name: getProfileName(data.user.user_metadata),
    avatarUrl: getProfileAvatarUrl(data.user.user_metadata),
  };

  try {
    await syncPublicUser(url, user);
  } catch {
    return NextResponse.json(
      { error: "No pudimos sincronizar el perfil del usuario." },
      { status: 502 },
    );
  }

  const profile = await getPublicUserProfile(url, user.id);

  return NextResponse.json({
    session: {
      accessToken: data.access_token,
      refreshToken: data.refresh_token ?? refreshToken,
      expiresAt:
        typeof data.expires_in === "number"
          ? Date.now() + data.expires_in * 1000
          : null,
      user: {
        id: user.id,
        email: user.email,
        name: profile?.displayName ?? user.name ?? null,
        avatarUrl: profile?.avatarUrl ?? user.avatarUrl ?? null,
      },
    },
  });
}
