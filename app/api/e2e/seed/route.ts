import { NextResponse } from "next/server";

import {
  E2eConfigError,
  requireE2eCredentials,
  requireE2eSecret,
  type E2eScenario,
} from "@/lib/e2e/config";
import { runE2eSeed } from "@/lib/e2e/seed";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const SCENARIOS: E2eScenario[] = [
  "free_second_chat",
  "plus_eleventh_chat",
  "free_sixth_message",
];

export async function POST(request: Request) {
  try {
    requireE2eSecret(request);
  } catch (err) {
    if (err instanceof E2eConfigError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const body = (await request.json().catch(() => null)) as {
    scenario?: string;
    email?: string;
  } | null;

  const scenario = body?.scenario;
  if (!scenario || !SCENARIOS.includes(scenario as E2eScenario)) {
    return NextResponse.json(
      { error: "scenario inválido", allowed: SCENARIOS },
      { status: 400 },
    );
  }

  let credentials;
  try {
    credentials = requireE2eCredentials();
  } catch (err) {
    if (err instanceof E2eConfigError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    throw err;
  }

  const email = body?.email?.trim() || credentials.email;

  try {
    const seed = await runE2eSeed(scenario as E2eScenario, email);
    return NextResponse.json({ ok: true, seed });
  } catch (err) {
    console.error("[e2e/seed]", err);
    return NextResponse.json(
      {
        error:
          err instanceof Error ? err.message : "No se pudo preparar el escenario E2E.",
      },
      { status: 502 },
    );
  }
}
