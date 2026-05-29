import { beforeEach, describe, expect, it, vi } from "vitest";

import type { PlanId } from "@/lib/billing/plans";
import type { BillingProfile } from "@/lib/billing/repository";
import { PLANS } from "@/lib/billing/plans";

vi.mock("server-only", () => ({}));

vi.mock("@/lib/billing/repository", () => ({
  getBillingProfileByUserId: vi.fn(),
}));

describe("billing/entitlements", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it.each([
    { plan: "free", status: null, expected: "free" },
    { plan: "plus", status: "active", expected: "plus" },
    { plan: "plus", status: "trialing", expected: "plus" },
    { plan: "plus", status: "past_due", expected: "free" },
    { plan: "pro", status: "active", expected: "pro" },
    { plan: "pro", status: "canceled", expected: "free" },
  ] as const satisfies ReadonlyArray<{
    plan: PlanId;
    status: string | null;
    expected: PlanId;
  }>)(
    "storedPlan=$plan subscriptionStatus=$status => effectivePlan=$expected",
    async ({ plan, status, expected }) => {
      const { getUserEntitlements } = await import("@/lib/billing/entitlements");
      const { getBillingProfileByUserId } = await import("@/lib/billing/repository");
      vi.mocked(getBillingProfileByUserId).mockResolvedValue(
        makeProfile({
          plan,
          subscriptionStatus: status,
        }),
      );

      const entitlements = await getUserEntitlements("user_1");
      expect(entitlements.storedPlan).toBe(plan);
      expect(entitlements.effectivePlan).toBe(expected);
      expect(entitlements.limits).toEqual(PLANS[expected].limits);
    },
  );

  it("normaliza plan inválido a free", async () => {
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    const { getBillingProfileByUserId } = await import("@/lib/billing/repository");
    vi.mocked(getBillingProfileByUserId).mockResolvedValue(
      makeProfile({
        plan: "enterprise" as never,
        subscriptionStatus: "active",
      }),
    );

    const entitlements = await getUserEntitlements("user_1");
    expect(entitlements.storedPlan).toBe("free");
    expect(entitlements.effectivePlan).toBe("free");
  });

  it("plan activo expone límites idénticos al catálogo PLANS", async () => {
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    const { getBillingProfileByUserId } = await import("@/lib/billing/repository");

    for (const planId of ["free", "plus", "pro"] as const) {
      vi.mocked(getBillingProfileByUserId).mockResolvedValue(
        makeProfile({
          plan: planId,
          subscriptionStatus: planId === "free" ? null : "active",
        }),
      );
      const entitlements = await getUserEntitlements("user_1");
      expect(entitlements.limits).toEqual(PLANS[planId].limits);
    }
  });

  it("lanza USER_NOT_FOUND cuando no existe usuario", async () => {
    const { getUserEntitlements } = await import("@/lib/billing/entitlements");
    const { getBillingProfileByUserId } = await import("@/lib/billing/repository");
    vi.mocked(getBillingProfileByUserId).mockResolvedValue(null);

    await expect(getUserEntitlements("missing")).rejects.toThrow("USER_NOT_FOUND");
  });
});

function makeProfile(
  partial: Partial<Pick<BillingProfile, "plan" | "subscriptionStatus">>,
): BillingProfile {
  return {
    userId: "user_1",
    email: "user@example.com",
    plan: "free",
    stripeCustomerId: null,
    stripeSubscriptionId: null,
    subscriptionStatus: null,
    subscriptionPriceId: null,
    subscriptionBillingCycle: null,
    subscriptionCurrentPeriodEnd: null,
    subscriptionCancelAtPeriodEnd: false,
    ...partial,
  };
}
