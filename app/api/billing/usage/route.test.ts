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

vi.mock("@/lib/billing/usage", () => ({
  getPlanUsage: vi.fn(),
}));

function getUsage(chatId?: string) {
  const url = chatId
    ? `http://localhost/api/billing/usage?chatId=${chatId}`
    : "http://localhost/api/billing/usage";
  return new Request(url, {
    headers: { authorization: "Bearer token" },
  });
}

describe("GET /api/billing/usage", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["free", 1, 5, 1, 4, false],
    ["plus", 10, 30, 9, 19, true],
    ["pro", null, null, 100, 500, true],
  ] as const)(
    "plan %s devuelve límites y uso (%i/%s chats, %i/%s msgs)",
    async (plan, maxChats, maxMsgs, usedChats, usedMsgs, voice) => {
      const { authenticateRequest } = await import("@/lib/auth/serverSession");
      const { getPlanUsage } = await import("@/lib/billing/usage");
      const { GET } = await import("./route");

      vi.mocked(authenticateRequest).mockResolvedValue(auth);
      vi.mocked(getPlanUsage).mockResolvedValue({
        plan,
        limits: {
          maxActiveChats: maxChats,
          maxMessagesPerChat: maxMsgs,
          voiceEnabled: voice,
        },
        usage: {
          activeChats: usedChats,
          messagesInChat: usedMsgs,
        },
      });

      const response = await GET(getUsage("chat_1"));
      expect(response.status).toBe(200);
      const body = await response.json();
      expect(body.plan).toBe(plan);
      expect(body.limits.maxActiveChats).toBe(maxChats);
      expect(body.limits.maxMessagesPerChat).toBe(maxMsgs);
      expect(body.limits.voiceEnabled).toBe(voice);
      expect(body.usage.activeChats).toBe(usedChats);
      expect(body.usage.messagesInChat).toBe(usedMsgs);
      expect(getPlanUsage).toHaveBeenCalledWith("user_1", "chat_1");
    },
  );

  it("Free al tope: 1/1 chats y 5/5 mensajes", async () => {
    const { authenticateRequest } = await import("@/lib/auth/serverSession");
    const { getPlanUsage } = await import("@/lib/billing/usage");
    const { GET } = await import("./route");

    vi.mocked(authenticateRequest).mockResolvedValue(auth);
    vi.mocked(getPlanUsage).mockResolvedValue({
      plan: "free",
      limits: {
        maxActiveChats: 1,
        maxMessagesPerChat: 15,
        voiceEnabled: false,
      },
      usage: { activeChats: 1, messagesInChat: 5 },
    });

    const body = await (await GET(getUsage("chat_1"))).json();
    expect(body.usage).toEqual({ activeChats: 1, messagesInChat: 5 });
    expect(body.limits.maxActiveChats).toBe(1);
    expect(body.limits.maxMessagesPerChat).toBe(15);
  });
});
