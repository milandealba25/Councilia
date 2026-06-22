import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLANS, type PlanId } from "@/lib/billing/plans";
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

/**
 * Simula un usuario con plan pagado almacenado pero suscripción inactiva:
 * effectivePlan = free y límites = PLANS.free.
 */
function downgradedEntitlements(storedPlan: PlanId): UserEntitlements {
  return {
    userId: "user_downgraded",
    storedPlan,
    effectivePlan: "free",
    subscriptionStatus: "past_due",
    limits: PLANS.free.limits,
  };
}

describe("billing/downgradeEnforcement — pago vencido cae a límites Free", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.stubGlobal("fetch", vi.fn());
  });

  it.each(["plus", "pro"] as const)(
    "%s past_due: 1 chat activo bloquea crear otro (como Free)",
    async (storedPlan) => {
      const { canCreateChat } = await import("@/lib/billing/guards");
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      vi.mocked(getUserEntitlements).mockResolvedValue(
        downgradedEntitlements(storedPlan),
      );
      vi.mocked(fetch).mockResolvedValue(countResponse(1));

      const result = await canCreateChat("user_downgraded");
      expect(result).toMatchObject({
        allowed: false,
        code: "ACTIVE_CHAT_LIMIT_REACHED",
        plan: "free",
        limit: PLANS.free.limits.maxActiveChats,
        used: 1,
      });
    },
  );

  it.each(["plus", "pro"] as const)(
    "%s past_due: 15 mensajes user bloquean el siguiente (como Free)",
    async (storedPlan) => {
      const { canSendMessage } = await import("@/lib/billing/guards");
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      vi.mocked(getUserEntitlements).mockResolvedValue(
        downgradedEntitlements(storedPlan),
      );
      vi.mocked(fetch)
        .mockResolvedValueOnce(conversationResponse("active"))
        .mockResolvedValueOnce(countResponse(15));

      const result = await canSendMessage("user_downgraded", "chat_1");
      expect(result).toMatchObject({
        allowed: false,
        code: "MESSAGE_LIMIT_REACHED",
        plan: "free",
        limit: PLANS.free.limits.maxMessagesPerChat,
        used: 15,
      });
    },
  );

  it.each(["plus", "pro"] as const)(
    "%s past_due: voz bloqueada (como Free)",
    async (storedPlan) => {
      const { canUseVoice } = await import("@/lib/billing/guards");
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      vi.mocked(getUserEntitlements).mockResolvedValue(
        downgradedEntitlements(storedPlan),
      );

      const result = await canUseVoice("user_downgraded");
      expect(result).toMatchObject({
        allowed: false,
        code: "VOICE_NOT_AVAILABLE",
        plan: "free",
      });
    },
  );
});

function countResponse(total: number): Response {
  return new Response("[]", {
    status: 200,
    headers: { "content-range": `0-0/${total}` },
  });
}

function conversationResponse(status: string): Response {
  return new Response(JSON.stringify([{ id: "chat_1", status }]), {
    status: 200,
    headers: { "content-type": "application/json" },
  });
}
