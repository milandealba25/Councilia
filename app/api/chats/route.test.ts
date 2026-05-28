import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextResponse } from "next/server";

vi.mock("server-only", () => ({}));

const auth = {
  accessToken: "token",
  user: { id: "user_1", email: "user@example.com" },
};

vi.mock("@/lib/auth/serverSession", () => ({
  authenticateRequest: vi.fn(),
  isAuthError: (value: unknown) => value instanceof NextResponse,
}));

vi.mock("@/lib/billing/guards", () => ({
  canCreateChat: vi.fn(),
}));

vi.mock("@/lib/chat/server", () => ({
  createUserChatSession: vi.fn(),
  listUserChatSessions: vi.fn(),
}));

function postChats() {
  return new Request("http://localhost/api/chats", {
    method: "POST",
    headers: { authorization: "Bearer token" },
  });
}

describe("POST /api/chats", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("Free con 0 chats activos → 200", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { createUserChatSession } = await import("@/lib/chat/server");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canCreateChat).mockResolvedValue({
      allowed: true,
      plan: "free",
      limit: 1,
      used: 0,
    });
    vi.mocked(createUserChatSession).mockResolvedValue({
      id: "chat_1",
      title: "Nuevo chat",
      createdAt: 1,
      updatedAt: 1,
      turns: [],
      summary: "",
      keyFacts: [],
    });

    const response = await POST(postChats());
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.session.id).toBe("chat_1");
    expect(body.plan).toBe("free");
  });

  it("Free con 1 chat activo → 403", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canCreateChat).mockResolvedValue({
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      message: "Tu plan Free permite 1 chat activo.",
      plan: "free",
      limit: 1,
      used: 1,
    });

    const response = await POST(postChats());
    expect(response.status).toBe(403);
    const body = await response.json();
    expect(body.code).toBe("ACTIVE_CHAT_LIMIT_REACHED");
    expect(body.used).toBe(1);
  });

  it("returns 403 when plus user tries to create chat number 11", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue({
      ...auth,
      user: { ...auth.user, id: "user_plus" },
    });
    vi.mocked(canCreateChat).mockResolvedValue({
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      message: "Llegaste al límite de 10 chats activos de tu plan.",
      plan: "plus",
      limit: 10,
      used: 10,
    });

    const response = await POST(
      new Request("http://localhost/api/chats", {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
      }),
    );
    const body = await response.json();
    expect(response.status).toBe(403);
    expect(body.code).toBe("ACTIVE_CHAT_LIMIT_REACHED");
    expect(body.plan).toBe("plus");
    expect(body.used).toBe(10);
    expect(body.limit).toBe(10);
  });

  it("allows plus user with 9 active chats", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { createUserChatSession } = await import("@/lib/chat/server");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue({
      ...auth,
      user: { ...auth.user, id: "user_plus" },
    });
    vi.mocked(canCreateChat).mockResolvedValue({
      allowed: true,
      plan: "plus",
      limit: 10,
      used: 9,
    });
    vi.mocked(createUserChatSession).mockResolvedValue({
      id: "chat_plus_10",
      title: "Nuevo chat",
      createdAt: 1,
      updatedAt: 1,
      turns: [],
      summary: "",
      keyFacts: [],
    });

    const response = await POST(
      new Request("http://localhost/api/chats", {
        method: "POST",
        headers: { authorization: "Bearer test-token" },
      }),
    );
    expect(response.status).toBe(200);
  });

  it("Pro con 50 chats activos → 200", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { createUserChatSession } = await import("@/lib/chat/server");
    const { POST } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(canCreateChat).mockResolvedValue({
      allowed: true,
      plan: "pro",
      used: 50,
    });
    vi.mocked(createUserChatSession).mockResolvedValue({
      id: "chat_pro",
      title: "Nuevo chat",
      createdAt: 1,
      updatedAt: 1,
      turns: [],
      summary: "",
      keyFacts: [],
    });

    const response = await POST(postChats());
    expect(response.status).toBe(200);
    expect((await response.json()).plan).toBe("pro");
  });
});
