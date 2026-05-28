import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const auth = {
  accessToken: "token",
  user: { id: "user_1", email: "user@example.com" },
};

const validTurn = {
  userMessage: "Hola council",
  agents: { marco: "", elena: "", rafael: "" },
  replica: null,
};

vi.mock("@/lib/auth/serverSession", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: (value: unknown) => value instanceof NextResponse,
}));

vi.mock("@/lib/billing/guards", () => ({
  canSendMessage: vi.fn(),
}));

vi.mock("@/lib/chat/server", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/chat/server")>();
  return {
    ...actual,
    appendTurnToUserChat: vi.fn(),
  };
});

function postTurn(chatId: string, body: unknown = { turn: validTurn }) {
  return new Request(`http://localhost/api/chats/${chatId}/turns`, {
    method: "POST",
    headers: {
      authorization: "Bearer token",
      "content-type": "application/json",
    },
    body: JSON.stringify(body),
  });
}

describe("POST /api/chats/[chatId]/turns", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Free con 5 mensajes user → 403", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canSendMessage).mockResolvedValue({
      allowed: false,
      code: "MESSAGE_LIMIT_REACHED",
      message: "Tu plan Free permite 5 mensajes por chat.",
      plan: "free",
      limit: 5,
      used: 5,
    });

    const response = await POST(postTurn("chat_1"), {
      params: { chatId: "chat_1" },
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("MESSAGE_LIMIT_REACHED");
  });

  it("Chat de otro usuario → 404", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canSendMessage).mockResolvedValue({
      allowed: false,
      code: "CONVERSATION_NOT_FOUND",
      message: "No encontramos este chat o no pertenece a tu cuenta.",
      plan: "free",
    });

    const response = await POST(postTurn("chat_other"), {
      params: { chatId: "chat_other" },
    });
    expect(response.status).toBe(404);
  });

  it("Chat archived → 403", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canSendMessage).mockResolvedValue({
      allowed: false,
      code: "CONVERSATION_NOT_ACTIVE",
      message: "Este chat ya no está activo.",
      plan: "plus",
    });

    const response = await POST(postTurn("chat_archived"), {
      params: { chatId: "chat_archived" },
    });
    expect(response.status).toBe(403);
    expect((await response.json()).code).toBe("CONVERSATION_NOT_ACTIVE");
  });

  it("Permitido → 200 y devuelve session", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { appendTurnToUserChat } = await import("@/lib/chat/server");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canSendMessage).mockResolvedValue({
      allowed: true,
      plan: "plus",
      limit: 20,
      used: 4,
    });
    vi.mocked(appendTurnToUserChat).mockResolvedValue({
      id: "chat_1",
      title: "Chat",
      createdAt: 1,
      updatedAt: 2,
      turns: [validTurn],
      summary: "",
      keyFacts: [],
    });

    const response = await POST(postTurn("chat_1"), {
      params: { chatId: "chat_1" },
    });
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session.id).toBe("chat_1");
    expect(body.plan).toBe("plus");
  });
});
