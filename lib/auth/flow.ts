"use client";

import {
  getValidAuthSession,
  loadAuthSession,
  type AuthSession,
} from "@/lib/auth/client";
import {
  loadUserContext,
  saveUserContext,
} from "@/lib/survey/storage";
import { userContextSchema, type UserContext } from "@/lib/survey/survey.v1";

export interface RemoteSurveyStatus {
  completed: boolean;
  completedAt: string | null;
  councilId: string | null;
  userContext: unknown | null;
}

export async function fetchSurveyStatus(
  session: AuthSession | null = loadAuthSession(),
): Promise<RemoteSurveyStatus | null> {
  if (!session) return null;
  const response = await fetch("/api/survey/status", {
    headers: {
      authorization: `Bearer ${session.accessToken}`,
    },
  });
  if (!response.ok) return null;
  return (await response.json()) as RemoteSurveyStatus;
}

export async function syncPendingSurvey(
  session: AuthSession | null = loadAuthSession(),
  opts?: { force?: boolean },
): Promise<boolean> {
  if (!session || !opts?.force) return false;
  const userContext = loadUserContext();
  if (!userContext) return false;
  const response = await fetch("/api/survey/complete", {
    method: "POST",
    headers: {
      authorization: `Bearer ${session.accessToken}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({ userContext }),
  });
  return response.ok;
}

export async function resolvePostAuthRedirect(
  preferred = "/session",
): Promise<string> {
  const session = await getValidAuthSession();
  if (!session) return "/login";

  if (await syncPendingSurvey(session)) {
    return "/session";
  }

  const status = await fetchSurveyStatus(session);
  const remoteContext = parseRemoteUserContext(status?.userContext);
  if (remoteContext) {
    saveUserContext(remoteContext);
  }
  if (status?.completed) {
    return preferred === "/" ? "/session" : preferred;
  }
  return "/onboarding";
}

function parseRemoteUserContext(value: unknown): UserContext | null {
  const parsed = userContextSchema.safeParse(value);
  return parsed.success ? parsed.data : null;
}
