import "server-only";

import type { Stripe } from "@/lib/billing/stripe";
import type {
  BillingCycle,
  PlanId,
} from "@/lib/billing/plans";
import { findPlanByLookupKey } from "@/lib/billing/plans";

export interface NormalizedSubscription {
  plan: PlanId;
  subscriptionId: string | null;
  status: string | null;
  priceId: string | null;
  billingCycle: BillingCycle | null;
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
}

/**
 * Convierte una suscripción de Stripe en el estado mínimo que persistimos
 * en `public.users`. Si la suscripción está activa o en trial, devuelve el
 * plan correspondiente (plus/pro); si está cancelada/incompleta/past_due,
 * devuelve `free`.
 */
export function normalizeSubscription(
  subscription: Stripe.Subscription,
): NormalizedSubscription {
  const item = subscription.items.data[0];
  const price = item?.price ?? null;
  const lookupKey = price?.lookup_key ?? null;

  let plan: PlanId = "free";
  let billingCycle: BillingCycle | null = null;
  if (lookupKey) {
    const match = findPlanByLookupKey(lookupKey);
    if (match) {
      plan = match.plan.id;
      billingCycle = match.cycle;
    }
  }

  // Solo dejamos al usuario en plan pago si la suscripción está activa.
  const status = subscription.status;
  if (status !== "active" && status !== "trialing") {
    plan = "free";
  }

  return {
    plan,
    subscriptionId: subscription.id,
    status,
    priceId: price?.id ?? null,
    billingCycle,
    currentPeriodEnd: resolveCurrentPeriodEnd(subscription, item ?? null),
    cancelAtPeriodEnd: Boolean(subscription.cancel_at_period_end),
  };
}

/**
 * Devuelve `current_period_end` como ISO string.
 *
 * En las API versions más recientes el campo se movió de la suscripción al
 * subscription item, así que probamos primero el item y caemos a la
 * suscripción para mantener compatibilidad con sandboxes en versiones viejas.
 */
function resolveCurrentPeriodEnd(
  subscription: Stripe.Subscription,
  item: Stripe.SubscriptionItem | null,
): string | null {
  const itemEnd = item
    ? (item as unknown as { current_period_end?: number | null }).current_period_end
    : null;
  if (typeof itemEnd === "number") {
    return new Date(itemEnd * 1000).toISOString();
  }
  const subEnd = (subscription as unknown as {
    current_period_end?: number | null;
  }).current_period_end;
  if (typeof subEnd === "number") {
    return new Date(subEnd * 1000).toISOString();
  }
  return null;
}
