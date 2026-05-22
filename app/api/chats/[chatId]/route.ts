import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import {
  deleteUserChatSession,
  renameUserChatSession,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  context: { params: { chatId: string } },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = (await request.json().catch(() => null)) as {
    title?: unknown;
  } | null;
  const title = typeof body?.title === "string" ? body.title : "";
  const session = await renameUserChatSession(auth, context.params.chatId, title);
  if (!session) {
    return NextResponse.json(
      { error: "No pudimos renombrar el chat." },
      { status: 400 },
    );
  }
  return NextResponse.json({ session });
}

export async function DELETE(
  request: Request,
  context: { params: { chatId: string } },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const ok = await deleteUserChatSession(auth, context.params.chatId);
  if (!ok) {
    return NextResponse.json(
      { error: "No pudimos borrar el chat." },
      { status: 400 },
    );
  }
  return NextResponse.json({ ok: true });
}
