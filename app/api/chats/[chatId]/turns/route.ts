import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import {
  appendTurnToUserChat,
  chatTurnPayloadSchema,
} from "@/lib/chat/server";

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
        error: "invalid_turn",
        detail: parsed.error.errors[0]?.message ?? "Turno invalido.",
      },
      { status: 400 },
    );
  }

  try {
    const session = await appendTurnToUserChat(
      auth,
      context.params.chatId,
      parsed.data,
    );
    if (!session) {
      return NextResponse.json(
        { error: "chat_not_found" },
        { status: 404 },
      );
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "No pudimos guardar el turno." },
      { status: 502 },
    );
  }
}
