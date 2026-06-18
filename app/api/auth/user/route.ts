import { NextResponse } from "next/server";
import {
  requireSupabaseConfig,
} from "@/lib/db/supabase";
import {
  getProfileAvatarUrl,
  getProfileName,
  syncPublicUserBestEffort,
} from "@/lib/auth/profileSync";
import { isValidName, sanitizeName } from "@/lib/auth/validation";

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

  const profile = await syncPublicUserBestEffort(url, user, {
    apiKey: anonKey,
    bearerToken: authorization.slice("Bearer ".length).trim(),
  });

  return NextResponse.json({
    user: {
      ...user,
      name: profile?.displayName ?? user.name,
      avatarUrl: profile?.avatarUrl ?? user.avatarUrl,
    },
  });
}

export async function PATCH(request: Request) {
  const { url, anonKey } = requireSupabaseConfig();
  const authorization = request.headers.get("authorization");

  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Falta la sesión del usuario." },
      { status: 401 },
    );
  }

  const body = (await request.json().catch(() => null)) as {
    name?: unknown;
  } | null;
  const name = sanitizeName(body?.name);

  if (!isValidName(name)) {
    return NextResponse.json(
      { error: "El nombre debe tener entre 2 y 80 caracteres." },
      { status: 400 },
    );
  }

  const sessionResponse = await fetch(new URL("/auth/v1/user", url), {
    headers: {
      apikey: anonKey,
      authorization,
    },
  });

  if (!sessionResponse.ok) {
    return NextResponse.json(
      { error: "La sesión no es válida o expiró." },
      { status: sessionResponse.status },
    );
  }

  const user = (await sessionResponse.json().catch(() => null)) as {
    id?: string;
    email?: string;
  } | null;

  if (!user?.id || !user.email) {
    return NextResponse.json(
      { error: "Supabase no devolvió un usuario válido." },
      { status: 502 },
    );
  }

  const profileResponse = await fetch(new URL("/rest/v1/users", url), {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      display_name: name,
    }),
  });

  if (!profileResponse.ok) {
    return NextResponse.json(
      { error: "No pudimos guardar el nombre en tu perfil." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      name,
    },
  });
}
