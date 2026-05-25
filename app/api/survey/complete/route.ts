import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  type AuthenticatedRequest,
} from "@/lib/auth/serverSession";
import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";
import {
  SURVEY_VERSION,
  userContextSchema,
  type UserContext,
} from "@/lib/survey/survey.v1";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => null)) as {
    userContext?: unknown;
  } | null;
  const parsed = userContextSchema.safeParse(body?.userContext);
  if (!parsed.success) {
    return NextResponse.json(
      {
        error: "invalid_survey",
        detail: parsed.error.errors[0]?.message ?? "Respuestas invalidas.",
      },
      { status: 400 },
    );
  }

  const result = await persistSurvey(auth, parsed.data);
  if (!result.ok) {
    return NextResponse.json(
      { error: result.error },
      { status: result.status },
    );
  }

  return NextResponse.json({
    ok: true,
    completed: true,
    councilId: result.councilId,
  });
}

async function persistSurvey(
  auth: AuthenticatedRequest,
  userContext: UserContext,
): Promise<
  | { ok: true; councilId: string | null }
  | { ok: false; status: number; error: string }
> {
  const { url, anonKey } = requireSupabaseConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  const apiKey = serviceRoleKey ?? anonKey;
  const bearer = serviceRoleKey ?? auth.accessToken;
  const headers = {
    apikey: apiKey,
    authorization: `Bearer ${bearer}`,
    "content-type": "application/json",
  };

  await upsertPublicUser(url, headers, auth);

  const existing = await fetchLatestCouncil(url, headers, auth.user.id);
  if (existing?.id) {
    await markOnboardingCompleted(url, headers, auth.user.id);
    return { ok: true, councilId: existing.id };
  }

  const councilsUrl = new URL("/rest/v1/councils", url);
  const response = await fetch(councilsUrl, {
    method: "POST",
    headers: {
      ...headers,
      prefer: "return=representation",
    },
    body: JSON.stringify({
      user_id: auth.user.id,
      user_context: userContext,
      survey_version: userContext.surveyVersion ?? SURVEY_VERSION,
      name: "Council principal",
    }),
  });

  if (!response.ok) {
    return {
      ok: false,
      status: response.status,
      error:
        "No pudimos guardar la encuesta. Revisa que las migraciones de Supabase esten aplicadas.",
    };
  }

  await markOnboardingCompleted(url, headers, auth.user.id);
  const rows = (await response.json().catch(() => [])) as Array<{ id?: string }>;
  return { ok: true, councilId: rows[0]?.id ?? null };
}

async function upsertPublicUser(
  supabaseUrl: string,
  headers: Record<string, string>,
  auth: AuthenticatedRequest,
): Promise<void> {
  const usersUrl = new URL("/rest/v1/users", supabaseUrl);
  await fetch(usersUrl, {
    method: "POST",
    headers: {
      ...headers,
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: auth.user.id,
      email: auth.user.email,
    }),
  });
}

async function fetchLatestCouncil(
  supabaseUrl: string,
  headers: Record<string, string>,
  userId: string,
): Promise<{ id?: string } | null> {
  const councilsUrl = new URL("/rest/v1/councils", supabaseUrl);
  councilsUrl.searchParams.set("select", "id");
  councilsUrl.searchParams.set("user_id", `eq.${userId}`);
  councilsUrl.searchParams.set("order", "created_at.desc");
  councilsUrl.searchParams.set("limit", "1");

  const response = await fetch(councilsUrl, { headers });
  if (!response.ok) return null;
  const rows = (await response.json().catch(() => [])) as Array<{ id?: string }>;
  return rows[0] ?? null;
}

async function markOnboardingCompleted(
  supabaseUrl: string,
  headers: Record<string, string>,
  userId: string,
): Promise<void> {
  const usersUrl = new URL("/rest/v1/users", supabaseUrl);
  usersUrl.searchParams.set("id", `eq.${userId}`);
  await fetch(usersUrl, {
    method: "PATCH",
    headers,
    body: JSON.stringify({
      onboarding_completed_at: new Date().toISOString(),
    }),
  });
}
