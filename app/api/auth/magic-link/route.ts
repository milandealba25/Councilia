import { NextResponse } from "next/server";
import { requireSupabaseConfig } from "@/lib/db/supabase";
import { getAppUrl, normalizeNextPath } from "../_utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const body = (await request.json().catch(() => null)) as {
    email?: string;
    next?: string;
  } | null;
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

  const { url, anonKey } = supabaseConfig;
  const email = body?.email?.trim().toLowerCase();

  if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return NextResponse.json(
      { error: "Escribe un correo válido." },
      { status: 400 },
    );
  }

  const appUrl = getAppUrl(request);
  const callbackUrl = new URL("/auth/callback", appUrl);
  callbackUrl.searchParams.set("next", normalizeNextPath(body?.next ?? null));

  const response = await fetch(new URL("/auth/v1/otp", url), {
    method: "POST",
    headers: {
      apikey: anonKey,
      authorization: `Bearer ${anonKey}`,
      "content-type": "application/json",
    },
    body: JSON.stringify({
      email,
      create_user: true,
      type: "magiclink",
      options: {
        email_redirect_to: callbackUrl.toString(),
      },
    }),
  });

  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    return NextResponse.json(
      {
        error:
          detail ||
          "No pudimos enviar el enlace. Revisa la configuración de Supabase.",
      },
      { status: response.status },
    );
  }

  return NextResponse.json({ ok: true });
}
