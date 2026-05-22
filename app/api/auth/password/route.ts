import { NextResponse } from "next/server";
import {
  requireSupabaseConfig,
} from "@/lib/db/supabase";
import { checkEmailInUse } from "@/lib/auth/emailLookup";
import {
  getProfileAvatarUrl,
  getProfileName,
  getPublicUserProfile,
  syncPublicUser,
} from "@/lib/auth/profileSync";
import {
  isValidEmail,
  isValidName,
  isValidPassword,
  sanitizeEmail,
  sanitizeName,
  sanitizePassword,
} from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

type AuthMode = "login" | "register";

interface SupabaseAuthResponse {
  id?: string;
  email?: string;
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  session?: {
    access_token?: string;
    refresh_token?: string;
    expires_in?: number;
  } | null;
  user_metadata?: Record<string, unknown>;
  user?: {
    id?: string;
    email?: string;
    user_metadata?: Record<string, unknown>;
  };
  code?: string;
  error?: string;
  error_description?: string;
  message?: string;
  msg?: string;
}

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    name?: string;
    password?: string;
    mode?: AuthMode;
  } | null;
  const email = sanitizeEmail(body?.email);
  const name = sanitizeName(body?.name);
  const password = sanitizePassword(body?.password);
  const mode = body?.mode === "register" ? "register" : "login";

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Escribe un correo válido." },
      { status: 400 },
    );
  }

  if (!isValidPassword(password)) {
    return NextResponse.json(
      {
        error:
          "La contraseña debe tener mínimo 8 caracteres, 1 mayúscula, 1 número y 1 carácter especial.",
      },
      { status: 400 },
    );
  }

  if (mode === "register" && !isValidName(name)) {
    return NextResponse.json(
      { error: "Escribe tu nombre con al menos 2 caracteres." },
      { status: 400 },
    );
  }

  let supabaseConfig: ReturnType<typeof requireSupabaseConfig>;
  try {
    supabaseConfig = requireSupabaseConfig();
  } catch {
    return NextResponse.json(
      {
        error:
          "Supabase todavía no está configurado. Define SUPABASE_URL y SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }

  if (mode === "register") {
    const emailInUse = await checkEmailInUse(supabaseConfig.url, email).catch(
      () => false,
    );
    if (emailInUse) {
      return NextResponse.json(
        { error: "Ese correo ya tiene una cuenta. Prueba iniciar sesión." },
        { status: 409 },
      );
    }
  }

  const endpoint =
    mode === "register"
      ? new URL("/auth/v1/signup", supabaseConfig.url)
      : new URL("/auth/v1/token?grant_type=password", supabaseConfig.url);

  const response = await fetch(endpoint, {
    method: "POST",
    headers: {
      apikey: supabaseConfig.anonKey,
      authorization: `Bearer ${supabaseConfig.anonKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify(
      mode === "register"
        ? {
            email,
            password,
            data: {
              name,
              full_name: name,
              display_name: name,
            },
          }
        : { email, password },
    ),
  });

  const data = (await response.json().catch(() => null)) as
    | SupabaseAuthResponse
    | null;

  if (!response.ok) {
    return NextResponse.json(
      { error: mapAuthError(data, mode, response.status) },
      { status: response.status },
    );
  }

  const user = getAuthUser(data);
  const session = getAuthSession(data);

  if (!user && mode === "register") {
    return NextResponse.json({
      ok: true,
      needsEmailConfirmation: true,
      message:
        "Cuenta creada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.",
    });
  }

  if (!user) {
    return NextResponse.json(
      { error: "Supabase no devolvió un usuario válido." },
      { status: 502 },
    );
  }

  if (!session?.accessToken) {
    return NextResponse.json({
      ok: true,
      needsEmailConfirmation: true,
      message:
        "Cuenta creada. Revisa tu correo para confirmar el acceso antes de iniciar sesión.",
    });
  }

  try {
    await syncPublicUser(supabaseConfig.url, user);
  } catch {
    return NextResponse.json(
      { error: "No pudimos sincronizar el perfil del usuario." },
      { status: 502 },
    );
  }

  const profile = await getPublicUserProfile(supabaseConfig.url, user.id);

  return NextResponse.json({
    ok: true,
    session: {
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt:
        typeof session.expiresIn === "number"
          ? Date.now() + session.expiresIn * 1000
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

function getAuthUser(
  data: SupabaseAuthResponse | null,
): { id: string; email: string; name?: string | null; avatarUrl?: string | null } | null {
  const candidate = data?.user ?? data;
  if (!candidate?.id || !candidate.email) return null;
  return {
    id: candidate.id,
    email: candidate.email,
    name: getUserName(candidate),
    avatarUrl: getProfileAvatarUrl(candidate.user_metadata),
  };
}

function getAuthSession(
  data: SupabaseAuthResponse | null,
): { accessToken: string; refreshToken: string | null; expiresIn?: number } | null {
  const accessToken = data?.access_token ?? data?.session?.access_token;
  if (!accessToken) return null;
  return {
    accessToken,
    refreshToken: data?.refresh_token ?? data?.session?.refresh_token ?? null,
    expiresIn: data?.expires_in ?? data?.session?.expires_in,
  };
}

function getUserName(candidate: {
  user_metadata?: Record<string, unknown>;
}): string | null {
  return getProfileName(candidate.user_metadata);
}

function mapAuthError(
  data: SupabaseAuthResponse | null,
  mode: AuthMode,
  status?: number,
): string {
  const raw = [
    data?.error,
    data?.error_description,
    data?.message,
    data?.msg,
    data?.code,
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();

  if (
    status === 429 ||
    raw.includes("rate limit") ||
    raw.includes("too many requests") ||
    raw.includes("over_email_send_rate_limit")
  ) {
    return "Supabase está limitando los registros por demasiados intentos o correos de confirmación. Espera unos minutos y vuelve a intentar, o configura SMTP propio en Supabase.";
  }
  if (raw.includes("invalid login") || raw.includes("invalid credentials")) {
    return "Correo o contraseña incorrectos.";
  }
  if (
    raw.includes("already registered") ||
    raw.includes("already exists") ||
    raw.includes("user_already_exists") ||
    raw.includes("user already registered")
  ) {
    return "Ese correo ya tiene una cuenta. Prueba iniciar sesión.";
  }
  if (raw.includes("database error saving new user")) {
    return "Supabase no pudo crear el perfil público del usuario. Revisa que la migración de tablas y triggers esté aplicada.";
  }
  if (raw.includes("email not confirmed")) {
    return "Falta confirmar tu correo antes de iniciar sesión.";
  }
  if (raw.includes("password")) {
    return "La contraseña no cumple con los requisitos de seguridad.";
  }
  if (mode === "register") {
    return "No pudimos crear la cuenta. Inténtalo de nuevo.";
  }
  return "No pudimos iniciar sesión. Inténtalo de nuevo.";
}
