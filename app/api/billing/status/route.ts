import { NextResponse } from "next/server";

import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import { getBillingProfileByUserId } from "@/lib/billing/repository";
import { PLANS, type PlanId } from "@/lib/billing/plans";
import { isStripeConfigured } from "@/lib/billing/stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(request: Request) {
  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  if (!isStripeConfigured()) {
    return NextResponse.json({
      stripeConfigured: false,
      plan: "free" as PlanId,
      planCopy: PLANS.free.copy,
      subscription: null,
    });
  }

  const profile = await getBillingProfileByUserId(auth.user.id).catch(() => null);
  const plan: PlanId = profile?.plan ?? "free";
  const definition = PLANS[plan];

  return NextResponse.json({
    stripeConfigured: true,
    plan,
    planCopy: definition.copy,
    subscription: profile
      ? {
          status: profile.subscriptionStatus,
          billingCycle: profile.subscriptionBillingCycle,
          currentPeriodEnd: profile.subscriptionCurrentPeriodEnd,
          cancelAtPeriodEnd: profile.subscriptionCancelAtPeriodEnd,
          hasCustomer: Boolean(profile.stripeCustomerId),
        }
      : null,
  });
}
