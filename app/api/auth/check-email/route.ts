import { NextResponse } from "next/server";
import { checkEmailInUse } from "@/lib/auth/emailLookup";
import { requireSupabaseConfig } from "@/lib/db/supabase";
import { isValidEmail, sanitizeEmail } from "@/lib/auth/validation";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const email = sanitizeEmail(requestUrl.searchParams.get("email"));

  if (!isValidEmail(email)) {
    return NextResponse.json(
      { error: "Escribe un correo valido." },
      { status: 400 },
    );
  }

  let supabaseUrl: string;
  try {
    supabaseUrl = requireSupabaseConfig().url;
  } catch {
    return NextResponse.json(
      {
        error:
          "Supabase todavia no esta configurado. Define SUPABASE_URL y SUPABASE_ANON_KEY.",
      },
      { status: 503 },
    );
  }

  try {
    const exists = await checkEmailInUse(supabaseUrl, email);
    return NextResponse.json({ exists });
  } catch {
    return NextResponse.json(
      {
        error:
          "Falta SUPABASE_SERVICE_ROLE_KEY para revisar si el correo ya existe.",
      },
      { status: 503 },
    );
  }
}
