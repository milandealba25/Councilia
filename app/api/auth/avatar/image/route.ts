import { NextResponse } from "next/server";
import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "user-avatars";
const AVATAR_PATH_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}\/avatar\.(jpg|png|webp)$/i;

export async function GET(request: Request) {
  const path = new URL(request.url).searchParams.get("path");
  if (!path || !AVATAR_PATH_RE.test(path)) {
    return NextResponse.json(
      { error: "Ruta de avatar inválida." },
      { status: 400 },
    );
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    return NextResponse.json(
      { error: "Falta SUPABASE_SERVICE_ROLE_KEY." },
      { status: 503 },
    );
  }

  let supabaseConfig: ReturnType<typeof requireSupabaseConfig>;
  try {
    supabaseConfig = requireSupabaseConfig();
  } catch {
    return NextResponse.json(
      { error: "Supabase todavía no está configurado." },
      { status: 503 },
    );
  }

  const imageResponse = await fetch(
    new URL(`/storage/v1/object/${BUCKET}/${path}`, supabaseConfig.url),
    {
      headers: {
        apikey: serviceRoleKey,
        authorization: `Bearer ${serviceRoleKey}`,
      },
    },
  );

  if (!imageResponse.ok || !imageResponse.body) {
    return NextResponse.json(
      { error: "No pudimos leer la foto de perfil." },
      { status: imageResponse.status || 404 },
    );
  }

  return new NextResponse(imageResponse.body, {
    headers: {
      "cache-control": "public, max-age=31536000, immutable",
      "content-type":
        imageResponse.headers.get("content-type") ?? "application/octet-stream",
    },
  });
}
