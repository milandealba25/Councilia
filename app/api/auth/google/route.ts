import { NextResponse } from "next/server";
import { requireSupabaseConfig } from "@/lib/db/supabase";
import { getAppUrl, getLoginErrorUrl, normalizeNextPath } from "../_utils";

export const dynamic = "force-dynamic";

export function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const next = normalizeNextPath(requestUrl.searchParams.get("next"));
  let url: string;

  try {
    url = requireSupabaseConfig().url;
  } catch {
    return NextResponse.redirect(
      getLoginErrorUrl(request, "supabase_not_configured", next),
    );
  }

  const appUrl = getAppUrl(request);
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", next);

  const authUrl = new URL("/auth/v1/authorize", url);
  authUrl.searchParams.set("provider", "google");
  authUrl.searchParams.set("redirect_to", callbackUrl.toString());

  return NextResponse.redirect(authUrl);
}
