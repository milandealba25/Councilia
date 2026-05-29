import { NextResponse } from "next/server";

import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import { getPlanUsage } from "@/lib/billing/usage";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const url = new URL(request.url);
  const chatId = url.searchParams.get("chatId");

  try {
    const usage = await getPlanUsage(auth.user.id, chatId);
    return NextResponse.json(usage);
  } catch (err) {
    console.error("[billing/usage]", err);
    return NextResponse.json(
      { code: "USAGE_FETCH_FAILED", message: "No pudimos cargar tu uso del plan." },
      { status: 502 },
    );
  }
}
