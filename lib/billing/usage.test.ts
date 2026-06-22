import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLANS } from "@/lib/billing/plans";
import type { UserEntitlements } from "@/lib/billing/entitlements";

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

describe("billing/usage — snapshot de uso vs límites del plan", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it.each([
    ["free", 1, 15, 1, 5],
    ["plus", 10, 30, 7, 14],
    ["pro", null, null, 42, 999],
  ] as const)(
    "plan %s expone límites y conteos reales",
    async (plan, maxChats, maxMsgs, activeChats, messagesInChat) => {
      const { getPlanUsage } = await import("@/lib/billing/usage");
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      vi.mocked(getUserEntitlements).mockResolvedValue(
        entitlementsForPlan(plan),
      );
      vi.mocked(fetch)
        .mockResolvedValueOnce(countResponse(activeChats))
        .mockResolvedValueOnce(countResponse(messagesInChat));

      const snapshot = await getPlanUsage("user_1", "chat_1");

      expect(snapshot.plan).toBe(plan);
      expect(snapshot.limits.maxActiveChats).toBe(maxChats);
      expect(snapshot.limits.maxMessagesPerChat).toBe(maxMsgs);
      expect(snapshot.limits.voiceEnabled).toBe(PLANS[plan].limits.voiceEnabled);
      expect(snapshot.usage.activeChats).toBe(activeChats);
      expect(snapshot.usage.messagesInChat).toBe(messagesInChat);
    },
  );

  it("sin chatId no cuenta mensajes del chat", async () => {
    const { getPlanUsage } = await import("@/lib/billing/usage");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(entitlementsForPlan("free"));
    vi.mocked(fetch).mockResolvedValueOnce(countResponse(1));

    const snapshot = await getPlanUsage("user_1", null);
    expect(snapshot.usage.activeChats).toBe(1);
    expect(snapshot.usage.messagesInChat).toBeNull();
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it("Free al tope: usage refleja 1/1 chats y 5/5 mensajes", async () => {
    const { getPlanUsage } = await import("@/lib/billing/usage");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue(entitlementsForPlan("free"));
    vi.mocked(fetch)
      .mockResolvedValueOnce(countResponse(1))
      .mockResolvedValueOnce(countResponse(5));

    const snapshot = await getPlanUsage("user_1", "chat_1");
    expect(snapshot.usage).toEqual({ activeChats: 1, messagesInChat: 5 });
    expect(snapshot.limits.maxActiveChats).toBe(1);
    expect(snapshot.limits.maxMessagesPerChat).toBe(15);
  });
});

function entitlementsForPlan(
  plan: "free" | "plus" | "pro",
): UserEntitlements {
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
    headers: { "content-range": `0-0/${total}` },
  });
}
