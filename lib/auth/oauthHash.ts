"use client";

import {
  saveAuthSession,
  type AuthSession,
} from "@/lib/auth/client";
import { normalizeNextPath } from "@/lib/auth/validation";

type OAuthHashResult =
  | { status: "empty"; next: string }
  | { status: "success"; next: string }
  | { status: "error"; next: string; message: string };

export function hasOAuthHash(hash: string): boolean {
  const params = parseHashParams(hash);
  return (
    params.has("access_token") ||
    params.has("error") ||
    params.has("error_description")
  );
}

export async function saveOAuthHashSession(opts?: {
  hash?: string;
  next?: string | null;
  stripHash?: boolean;
}): Promise<OAuthHashResult> {
  const hashParams = parseHashParams(
    opts?.hash ?? (typeof window !== "undefined" ? window.location.hash : ""),
  );
  const searchParams =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search)
      : new URLSearchParams();
  const next = normalizeNextPath(opts?.next ?? searchParams.get("next"));
  const error =
    hashParams.get("error_description") ||
    hashParams.get("error") ||
    searchParams.get("error_description") ||
    searchParams.get("error");
  const hasAuthSignal = hasOAuthHashParams(hashParams) || Boolean(error);

  if (!hasAuthSignal) {
    return { status: "empty", next };
  }

  if (opts?.stripHash !== false && hashParams.toString()) {
    stripHashFromUrl();
  }

  if (error) {
    return { status: "error", next, message: error };
  }

  const accessToken = hashParams.get("access_token");
  if (!accessToken) {
    return {
      status: "error",
      next,
      message: "Supabase no devolvio un token de acceso.",
    };
  }

  const response = await fetch("/api/auth/user", {
    headers: {
      authorization: `Bearer ${accessToken}`,
    },
  });

  const data = (await response.json().catch(() => null)) as {
    user?: AuthSession["user"];
    error?: string;
  } | null;

  if (!response.ok || !data?.user?.id || !data.user.email) {
    return {
      status: "error",
      next,
      message: data?.error ?? "No pudimos validar tu sesion.",
    };
  }

  saveAuthSession({
    accessToken,
    refreshToken: hashParams.get("refresh_token"),
    expiresAt: readExpiresAt(hashParams),
    user: data.user,
  });

  return { status: "success", next };
}

function parseHashParams(hash: string): URLSearchParams {
  return new URLSearchParams(hash.replace(/^#/, ""));
}

function hasOAuthHashParams(params: URLSearchParams): boolean {
  return (
    params.has("access_token") ||
    params.has("refresh_token") ||
    params.has("expires_in") ||
    params.has("expires_at") ||
    params.has("error") ||
    params.has("error_description")
  );
}

function readExpiresAt(params: URLSearchParams): number | null {
  const expiresAt = Number(params.get("expires_at") ?? "0");
  if (Number.isFinite(expiresAt) && expiresAt > 0) {
    return expiresAt * 1000;
  }

  const expiresIn = Number(params.get("expires_in") ?? "0");
  if (Number.isFinite(expiresIn) && expiresIn > 0) {
    return Date.now() + expiresIn * 1000;
  }

  return null;
}

function stripHashFromUrl(): void {
  if (typeof window === "undefined" || !window.location.hash) return;
  const cleanUrl = `${window.location.pathname}${window.location.search}`;
  window.history.replaceState(window.history.state, document.title, cleanUrl);
}
