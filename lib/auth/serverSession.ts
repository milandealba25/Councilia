import "server-only";
import { NextResponse } from "next/server";
import { requireSupabaseConfig } from "@/lib/db/supabase";

export interface AuthenticatedUser {
  id: string;
  email: string;
  metadata?: Record<string, unknown>;
}

export interface AuthenticatedRequest {
  accessToken: string;
  user: AuthenticatedUser;
}

export function getBearerToken(request: Request): string | null {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) return null;
  const token = authorization.slice("Bearer ".length).trim();
  return token || null;
}

export async function authenticateRequest(
  request: Request,
): Promise<AuthenticatedRequest | NextResponse> {
  const { url, anonKey } = requireSupabaseConfig();
  const accessToken = getBearerToken(request);
  if (!accessToken) {
    return NextResponse.json(
      { error: "Falta la sesion del usuario." },
      { status: 401 },
    );
  }

  const response = await fetch(new URL("/auth/v1/user", url), {
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${accessToken}`,
    },
  });

  if (!response.ok) {
    return NextResponse.json(
      { error: "La sesion no es valida o expiro." },
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
      { error: "Supabase no devolvio un usuario valido." },
      { status: 502 },
    );
  }

  return {
    accessToken,
    user: {
      id: data.id,
      email: data.email,
      metadata: data.user_metadata,
    },
  };
}

export function isAuthError(
  value: AuthenticatedRequest | NextResponse,
): value is NextResponse {
  return value instanceof NextResponse;
}
