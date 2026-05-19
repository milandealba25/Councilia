import { NextResponse } from "next/server";
import { requireSupabaseConfig } from "@/lib/db/supabase";
import {
  getProfileAvatarUrl,
  getProfileName,
  getPublicUserProfile,
  syncPublicUser,
} from "@/lib/auth/profileSync";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const { url, anonKey } = requireSupabaseConfig();
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Falta la sesión del usuario." },
      { status: 401 },
    );
  }

  const response = await fetch(new URL("/auth/v1/user", url), {
    headers: {
      apikey: anonKey,
      authorization,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "La sesión no es válida o expiró." },
      { status: response.status },
    );
  }

  const data = (await response.json()) as {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };

  if (!data.id || !data.email) {
    return NextResponse.json(
      { error: "Supabase no devolvió un usuario válido." },
      { status: 502 },
    );
  }

  const user = {
    id: data.id,
    email: data.email,
    name: getProfileName(data.user_metadata),
    avatarUrl: getProfileAvatarUrl(data.user_metadata),
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
    user: {
      ...user,
      name: profile?.displayName ?? user.name,
      avatarUrl: profile?.avatarUrl ?? user.avatarUrl,
    },
  });
}
