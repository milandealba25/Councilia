import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import {
  appendTurnToUserChat,
  chatTurnPayloadSchema,
} from "@/lib/chat/server";
import { canSendMessage } from "@/lib/billing/guards";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(
  request: Request,
  context: { params: { chatId: string } },
) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const body = await request.json().catch(() => null);
  const parsed = chatTurnPayloadSchema.safeParse(body?.turn ?? body);
  if (!parsed.success) {
    return NextResponse.json(
      {
        code: "INVALID_TURN_PAYLOAD",
        message: parsed.error.errors[0]?.message ?? "Payload inválido.",
      },
      { status: 400 },
    );
  }

  try {
    const permission = await canSendMessage(auth.user.id, context.params.chatId);
    if (!permission.allowed) {
      const status =
        permission.code === "CONVERSATION_NOT_FOUND" ? 404 : 403;
      return NextResponse.json(
        {
          code: permission.code,
          message: permission.message,
          plan: permission.plan,
          limit: permission.limit,
          used: permission.used,
        },
        { status },
      );
    }

    const session = await appendTurnToUserChat(
      auth,
      context.params.chatId,
      parsed.data,
    );
    if (!session) {
      return NextResponse.json(
        { code: "CHAT_NOT_FOUND", message: "No encontramos este chat." },
        { status: 404 },
      );
    }
    return NextResponse.json({ session, plan: permission.plan });
  } catch (err) {
    console.error("[chats.turns] save failed", err);
    return NextResponse.json(
      { code: "TURN_APPEND_FAILED", message: "No pudimos enviar el mensaje." },
      { status: 502 },
    );
  }
}
