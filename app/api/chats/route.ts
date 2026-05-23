import { NextResponse } from "next/server";
import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import {
  createUserChatSession,
  listUserChatSessions,
} from "@/lib/chat/server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const sessions = await listUserChatSessions(auth);
    return NextResponse.json({ sessions });
  } catch {
    return NextResponse.json(
      {
        error:
          "No pudimos cargar tus chats. Revisa que la migracion de persistencia este aplicada.",
      },
      { status: 502 },
    );
  }
}

export async function POST(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  try {
    const session = await createUserChatSession(auth);
    if ("error" in session) {
      return NextResponse.json(
        { error: "survey_required" },
        { status: 409 },
      );
    }
    return NextResponse.json({ session });
  } catch {
    return NextResponse.json(
      { error: "No pudimos crear el chat." },
      { status: 502 },
    );
  }
}
