import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
  type AuthenticatedRequest,
} from "@/lib/auth/serverSession";
import { requireSupabaseConfig } from "@/lib/db/supabase";

export const dynamic = "force-dynamic";

type SurveyStatus = {
  completed: boolean;
  completedAt: string | null;
  councilId: string | null;
  userContext: unknown | null;
};

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const status = await loadSurveyStatus(auth);
  return NextResponse.json(status);
}

async function loadSurveyStatus(
  auth: AuthenticatedRequest,
): Promise<SurveyStatus> {
  const { url, anonKey } = requireSupabaseConfig();
  const headers = {
    apikey: anonKey,
    authorization: `Bearer ${auth.accessToken}`,
  };

  const usersUrl = new URL("/rest/v1/users", url);
  usersUrl.searchParams.set("select", "onboarding_completed_at");
  usersUrl.searchParams.set("id", `eq.${auth.user.id}`);
  usersUrl.searchParams.set("limit", "1");

  const councilsUrl = new URL("/rest/v1/councils", url);
  councilsUrl.searchParams.set("select", "id,user_context,created_at");
  councilsUrl.searchParams.set("user_id", `eq.${auth.user.id}`);
  councilsUrl.searchParams.set("order", "created_at.desc");
  councilsUrl.searchParams.set("limit", "1");

  const [userRows, councilRows] = await Promise.all([
    fetch(usersUrl, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
    fetch(councilsUrl, { headers })
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []),
  ]) as [
    Array<{ onboarding_completed_at?: string | null }>,
    Array<{ id?: string; user_context?: unknown; created_at?: string | null }>,
  ];

  const user = userRows[0];
  const council = councilRows[0];
  const completedAt = user?.onboarding_completed_at ?? council?.created_at ?? null;

  return {
    completed: Boolean(completedAt || council),
    completedAt,
    councilId: council?.id ?? null,
    userContext: council?.user_context ?? null,
  };
}
