import "server-only";

import { getBillingProfileByUserId } from "@/lib/billing/repository";
import { PLANS, isValidPlanId, type PlanDefinition, type PlanId } from "@/lib/billing/plans";

const ACTIVE_SUBSCRIPTION_STATUSES = new Set(["active", "trialing"]);

export type UserEntitlements = {
  userId: string;
  storedPlan: PlanId;
  effectivePlan: PlanId;
  subscriptionStatus: string | null;
  limits: PlanDefinition["limits"];
};

export async function getUserEntitlements(
  userId: string,
): Promise<UserEntitlements> {
  const profile = await getBillingProfileByUserId(userId);
  if (!profile) {
    throw new Error("USER_NOT_FOUND");
  }

  const storedPlan = normalizePlan(profile.plan);
  const subscriptionStatus = profile.subscriptionStatus?.toLowerCase() ?? null;
  const isPaidPlan = storedPlan === "plus" || storedPlan === "pro";
  const hasActiveSubscription = subscriptionStatus
    ? ACTIVE_SUBSCRIPTION_STATUSES.has(subscriptionStatus)
    : false;
  const effectivePlan: PlanId =
    isPaidPlan && hasActiveSubscription ? storedPlan : "free";

  return {
    userId,
    storedPlan,
    effectivePlan,
    subscriptionStatus,
    limits: PLANS[effectivePlan].limits,
  };
}

function normalizePlan(plan: unknown): PlanId {
  if (isValidPlanId(plan)) {
    return plan;
  }
  return "free";
}
