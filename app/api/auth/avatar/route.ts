import { NextResponse } from "next/server";
import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const BUCKET = "user-avatars";
const MAX_FILE_SIZE = 2 * 1024 * 1024;
const ALLOWED_TYPES = new Map([
  ["image/jpeg", "jpg"],
  ["image/png", "png"],
  ["image/webp", "webp"],
]);

export async function POST(request: Request) {
  const authorization = request.headers.get("authorization");
  if (!authorization?.startsWith("Bearer ")) {
    return NextResponse.json(
      { error: "Falta la sesión del usuario." },
      { status: 401 },
    );
  }

  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    return NextResponse.json(
      {
        error:
          "Falta SUPABASE_SERVICE_ROLE_KEY para subir fotos de perfil.",
      },
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

  const user = await getSessionUser(
    supabaseConfig.url,
    supabaseConfig.anonKey,
    authorization,
  );
  if (!user) {
    return NextResponse.json(
      { error: "La sesión no es válida o expiró." },
      { status: 401 },
    );
  }

  const formData = await request.formData().catch(() => null);
  const file = formData?.get("avatar");
  if (!(file instanceof File)) {
    return NextResponse.json(
      { error: "Selecciona una imagen para tu perfil." },
      { status: 400 },
    );
  }

  const extension = ALLOWED_TYPES.get(file.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Usa una imagen JPG, PNG o WebP." },
      { status: 400 },
    );
  }

  if (file.size > MAX_FILE_SIZE) {
    return NextResponse.json(
      { error: "La imagen debe pesar máximo 2 MB." },
      { status: 400 },
    );
  }

  const bytes = Buffer.from(await file.arrayBuffer());
  if (!hasValidImageSignature(bytes, file.type)) {
    return NextResponse.json(
      { error: "La imagen no parece tener un formato válido." },
      { status: 400 },
    );
  }

  const avatarPath = `${user.id}/avatar.${extension}`;
  const uploadUrl = new URL(
    `/storage/v1/object/${BUCKET}/${avatarPath}`,
    supabaseConfig.url,
  );
  const uploadResponse = await fetch(uploadUrl, {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": file.type,
      "x-upsert": "true",
    },
    body: bytes,
  });

  if (!uploadResponse.ok) {
    return NextResponse.json(
      {
        error:
          "No pudimos subir la foto. Revisa que exista el bucket user-avatars en Supabase.",
      },
      { status: 502 },
    );
  }

  const avatarUrl = new URL("/api/auth/avatar/image", getRequestOrigin(request));
  avatarUrl.searchParams.set("path", avatarPath);
  avatarUrl.searchParams.set("v", Date.now().toString());

  const profileResponse = await fetch(new URL("/rest/v1/users", supabaseConfig.url), {
    method: "POST",
    headers: {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
      prefer: "resolution=merge-duplicates",
    },
    body: JSON.stringify({
      id: user.id,
      email: user.email,
      avatar_url: avatarUrl.toString(),
    }),
  });

  if (!profileResponse.ok) {
    return NextResponse.json(
      { error: "La foto subió, pero no pudimos guardarla en tu perfil." },
      { status: 502 },
    );
  }

  return NextResponse.json({
    user: {
      id: user.id,
      email: user.email,
      avatarUrl: avatarUrl.toString(),
    },
  });
}

function hasValidImageSignature(bytes: Buffer, mimeType: string): boolean {
  if (mimeType === "image/jpeg") {
    return bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  }
  if (mimeType === "image/png") {
    return (
      bytes[0] === 0x89 &&
      bytes[1] === 0x50 &&
      bytes[2] === 0x4e &&
      bytes[3] === 0x47
    );
  }
  if (mimeType === "image/webp") {
    return (
      bytes.toString("ascii", 0, 4) === "RIFF" &&
      bytes.toString("ascii", 8, 12) === "WEBP"
    );
  }
  return false;
}

function getRequestOrigin(request: Request): string {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  const forwardedHost = request.headers.get("x-forwarded-host");
  if (forwardedProto && forwardedHost) {
    return `${forwardedProto}://${forwardedHost}`;
  }
  return new URL(request.url).origin;
}

async function getSessionUser(
  supabaseUrl: string,
  anonKey: string,
  authorization: string,
): Promise<{ id: string; email: string } | null> {
  const response = await fetch(new URL("/auth/v1/user", supabaseUrl), {
    headers: {
      apikey: anonKey,
      authorization,
    },
  });
  if (!response.ok) return null;
  const data = (await response.json().catch(() => null)) as {
    id?: string;
    email?: string;
  } | null;
  if (!data?.id || !data.email) return null;
  return { id: data.id, email: data.email };
}
