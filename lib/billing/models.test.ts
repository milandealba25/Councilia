import { beforeEach, describe, expect, it, vi } from "vitest";

import { PLANS, type PlanId } from "@/lib/billing/plans";
import type { UserEntitlements } from "@/lib/billing/entitlements";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/billing/entitlements", () => ({
  getUserEntitlements: vi.fn(),
}));

describe("billing/models — modelo LLM por plan efectivo", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    ["free", "gemini-flash", "gemini-flash"],
    ["plus", "gpt-4o-mini", "gpt-4o-mini"],
    ["pro", "gpt-4o-mini", "gpt-4o"],
  ] as const satisfies ReadonlyArray<
    [PlanId, string, string]
  >)(
    "plan %s → llm=%s synthesis=%s",
    async (plan, llmModel, synthesisModel) => {
      const { getModelForUser } = await import("@/lib/billing/models");
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      vi.mocked(getUserEntitlements).mockResolvedValue(
        entitlementsForPlan(plan),
      );

      const result = await getModelForUser("user_1");
      expect(result).toEqual({ llmModel, synthesisModel, plan });
    },
  );

  it("usuario Plus degradado a Free recibe modelos Gemini (no mini/4o)", async () => {
    const { getModelForUser } = await import("@/lib/billing/models");
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    vi.mocked(getUserEntitlements).mockResolvedValue({
      userId: "user_1",
      storedPlan: "plus",
      effectivePlan: "free",
      subscriptionStatus: "past_due",
      limits: PLANS.free.limits,
    });

    const result = await getModelForUser("user_1");
    expect(result.plan).toBe("free");
    expect(result.llmModel).toBe(PLANS.free.limits.llmModel);
    expect(result.synthesisModel).toBe(PLANS.free.limits.synthesisModel);
  });
});

function entitlementsForPlan(plan: PlanId): UserEntitlements {
  return {
    userId: "user_1",
    storedPlan: plan,
    effectivePlan: plan,
    subscriptionStatus: plan === "free" ? null : "active",
    limits: PLANS[plan].limits,
  };
}
