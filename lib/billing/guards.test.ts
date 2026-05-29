import { beforeEach, describe, expect, it, vi } from "vitest";

import type { UserEntitlements } from "@/lib/billing/entitlements";
import { PLANS, type PlanId } from "@/lib/billing/plans";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/db/supabase", () => ({
  getSupabaseServiceRoleKey: vi.fn(() => "service-role-key"),
  requireSupabaseConfig: vi.fn(() => ({
    url: "https://example.supabase.co",
    anonKey: "anon",
  })),
}));

vi.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: vi.fn(),
}));

describe("billing/guards", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it("free con 0 chats activos => permitido", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch).mockResolvedValue(countResponse(0));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({ allowed: true, plan: "free", limit: 1, used: 0 });
  });

  it("free con 1 chat activo => bloqueado", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch).mockResolvedValue(countResponse(1));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({
      allowed: false,
      code: "ACTIVE_CHAT_LIMIT_REACHED",
      plan: "free",
      limit: 1,
      used: 1,
    });
  });

  it("free con 4 mensajes user => permitido", async () => {
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch)
      .mockResolvedValueOnce(conversationResponse("active"))
      .mockResolvedValueOnce(countResponse(4));

    const result = await canSendMessage("user_1", "chat_1");
    expect(result).toMatchObject({ allowed: true, plan: "free", limit: 5, used: 4 });
  });

  it("free con 5 mensajes user => bloqueado", async () => {
    const { canSendMessage } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("free"));
    vi.mocked(fetch)
      .mockResolvedValueOnce(conversationResponse("active"))
      .mockResolvedValueOnce(countResponse(5));

    const result = await canSendMessage("user_1", "chat_1");
    expect(result).toMatchObject({
      allowed: false,
      code: "MESSAGE_LIMIT_REACHED",
      plan: "free",
      limit: 5,
      used: 5,
    });
  });

  it("plus con 9 chats => permitido", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("plus"));
    vi.mocked(fetch).mockResolvedValue(countResponse(9));

    const result = await canCreateChat("user_1");
    expect(result.allowed).toBe(true);
  });

  it("blocks plus user with 10 active chats", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("plus"));
    vi.mocked(fetch).mockResolvedValue(countResponse(10));

    const result = await canCreateChat("user_plus");
    expect(result.allowed).toBe(false);
    if (result.allowed) return;
    expect(result.code).toBe("ACTIVE_CHAT_LIMIT_REACHED");
    expect(result.plan).toBe("plus");
    expect(result.used).toBe(10);
    expect(result.limit).toBe(10);
  });

  it("pro con 100 chats => permitido (sin límite)", async () => {
    const { canCreateChat } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("pro"));
    vi.mocked(fetch).mockResolvedValue(countResponse(100));

    const result = await canCreateChat("user_1");
    expect(result).toMatchObject({ allowed: true, plan: "pro", used: 100 });
    expect(result.limit).toBeUndefined();
  });

  it("voz bloqueada en free y habilitada en plus", async () => {
    const { canUseVoice } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValueOnce(mockEntitlements("free"));
    const denied = await canUseVoice("user_1");
    expect(denied).toMatchObject({
      allowed: false,
      code: "VOICE_NOT_AVAILABLE",
      plan: "free",
    });

    vi.mocked(getUserEntitlements).mockResolvedValueOnce(mockEntitlements("plus"));
    const allowed = await canUseVoice("user_1");
    expect(allowed).toMatchObject({ allowed: true, plan: "plus" });
  });

  it("voz habilitada en pro", async () => {
    const { canUseVoice } = await import("@/lib/billing/guards");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements("pro"));
    const result = await canUseVoice("user_1");
    expect(result).toMatchObject({ allowed: true, plan: "pro" });
  });

  describe("matriz de límites por plan (desde catálogo PLANS)", () => {
    for (const planId of ["free", "plus", "pro"] as const) {
      const maxChats = PLANS[planId].limits.maxActiveChats;
      const maxMsgs = PLANS[planId].limits.maxMessagesPerChat;

      if (maxChats !== null) {
        it(`${planId}: permite chat con ${maxChats - 1} activos`, async () => {
          const { canCreateChat } = await import("@/lib/billing/guards");
          const { getUserEntitlements } = await import("@/lib/billing/entitlements");
          vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements(planId));
          vi.mocked(fetch).mockResolvedValue(countResponse(maxChats - 1));

          const result = await canCreateChat("user_1");
          expect(result.allowed).toBe(true);
          expect(result).toMatchObject({ plan: planId, limit: maxChats, used: maxChats - 1 });
        });

        it(`${planId}: bloquea chat con ${maxChats} activos (tope)`, async () => {
          const { canCreateChat } = await import("@/lib/billing/guards");
          const { getUserEntitlements } = await import("@/lib/billing/entitlements");
          vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements(planId));
          vi.mocked(fetch).mockResolvedValue(countResponse(maxChats));

          const result = await canCreateChat("user_1");
          expect(result.allowed).toBe(false);
          if (result.allowed) return;
          expect(result.code).toBe("ACTIVE_CHAT_LIMIT_REACHED");
          expect(result.limit).toBe(maxChats);
          expect(result.used).toBe(maxChats);
        });
      }

      if (maxMsgs !== null) {
        it(`${planId}: permite mensaje con ${maxMsgs - 1} previos`, async () => {
          const { canSendMessage } = await import("@/lib/billing/guards");
          const { getUserEntitlements } = await import("@/lib/billing/entitlements");
          vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements(planId));
          vi.mocked(fetch)
            .mockResolvedValueOnce(conversationResponse("active"))
            .mockResolvedValueOnce(countResponse(maxMsgs - 1));

          const result = await canSendMessage("user_1", "chat_1");
          expect(result.allowed).toBe(true);
          expect(result).toMatchObject({ plan: planId, limit: maxMsgs, used: maxMsgs - 1 });
        });

        it(`${planId}: bloquea con ${maxMsgs} mensajes user (tope)`, async () => {
          const { canSendMessage } = await import("@/lib/billing/guards");
          const { getUserEntitlements } = await import("@/lib/billing/entitlements");
          vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements(planId));
          vi.mocked(fetch)
            .mockResolvedValueOnce(conversationResponse("active"))
            .mockResolvedValueOnce(countResponse(maxMsgs));

          const result = await canSendMessage("user_1", "chat_1");
          expect(result.allowed).toBe(false);
          if (result.allowed) return;
          expect(result.code).toBe("MESSAGE_LIMIT_REACHED");
          expect(result.limit).toBe(maxMsgs);
          expect(result.used).toBe(maxMsgs);
        });
      } else {
        it(`${planId}: mensajes ilimitados con uso alto`, async () => {
          const { canSendMessage } = await import("@/lib/billing/guards");
          const { getUserEntitlements } = await import("@/lib/billing/entitlements");
          vi.mocked(getUserEntitlements).mockResolvedValue(mockEntitlements(planId));
          vi.mocked(fetch)
            .mockResolvedValueOnce(conversationResponse("active"))
            .mockResolvedValueOnce(countResponse(50_000));

          const result = await canSendMessage("user_1", "chat_1");
          expect(result.allowed).toBe(true);
          expect(result.used).toBe(50_000);
          expect(result.limit).toBeUndefined();
        });
      }
    }
  });
});

function mockEntitlements(plan: PlanId): UserEntitlements {
  return {
    userId: "user_1",
    storedPlan: plan,
    effectivePlan: plan,
    subscriptionStatus: plan === "free" ? null : "active",
    limits: PLANS[plan].limits,
  };
}

function countResponse(total: number): Response {
  return new Response("[]", {
    status: 200,
    headers: {
      "content-range": `0-0/${total}`,
    },
  });
}

function conversationResponse(status: string): Response {
  return new Response(JSON.stringify([{ id: "chat_1", status }]), {
    status: 200,
    headers: {
      "content-type": "application/json",
    },
  });
}
