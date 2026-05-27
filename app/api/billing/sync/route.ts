import { NextResponse } from "next/server";

import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import {
  applySubscriptionByCustomerId,
  getBillingProfileByUserId,
} from "@/lib/billing/repository";
import { normalizeSubscription } from "@/lib/billing/subscription";
import {
  getStripeClient,
  requireStripeClient,
} from "@/lib/billing/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = logger.child({ module: "billing.sync" });

/**
 * Sincroniza el plan del usuario actual contra Stripe.
 *
 * Útil cuando:
 *  - El usuario acaba de completar el Checkout (success_url) y queremos
 *    reflejar el plan sin esperar al webhook.
 *  - El webhook no está corriendo localmente (`stripe listen`) y queremos
 *    un fallback explícito ("Refrescar plan" en el UI).
 *  - Recuperar estado tras un fallo de webhook.
 *
 * Idempotente: si no hay suscripción, deja al usuario en `free`.
 */
export async function POST(request: Request) {
  if (!getStripeClient()) {
    return NextResponse.json(
      { error: "Stripe no está configurado todavía." },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  const customerId = await ensureStripeCustomer({
    userId: auth.user.id,
    email: auth.user.email,
    name:
      (typeof auth.user.metadata?.["full_name"] === "string"
        ? (auth.user.metadata["full_name"] as string)
        : null) ?? null,
  });

  const stripe = requireStripeClient();

  // Tomamos la suscripción más reciente del customer (activa, trial,
  // past_due, paused o canceled — la más nueva). El normalize se encarga
  // de mapear el status final a plan free/plus/pro.
  const subscriptions = await stripe.subscriptions.list({
    customer: customerId,
    status: "all",
    limit: 5,
    expand: ["data.items.data.price"],
  });

  if (subscriptions.data.length === 0) {
    await applySubscriptionByCustomerId(customerId, {
      plan: "free",
      stripeSubscriptionId: null,
      subscriptionStatus: null,
      subscriptionPriceId: null,
      subscriptionBillingCycle: null,
      subscriptionCurrentPeriodEnd: null,
      subscriptionCancelAtPeriodEnd: false,
    });
    log.info("synced (no subscription)", { userId: auth.user.id, customerId });
    return NextResponse.json({ plan: "free", source: "stripe" });
  }

  // Priorizamos activa/trial; si no hay, tomamos la más reciente.
  const ranked = [...subscriptions.data].sort((a, b) => {
    const score = (s: typeof a) =>
      s.status === "active" || s.status === "trialing" ? 0 : 1;
    const diff = score(a) - score(b);
    if (diff !== 0) return diff;
    return (b.created ?? 0) - (a.created ?? 0);
  });
  const chosen = ranked[0];
  const normalized = normalizeSubscription(chosen);

  await applySubscriptionByCustomerId(customerId, {
    plan: normalized.plan,
    stripeSubscriptionId: normalized.subscriptionId,
    subscriptionStatus: normalized.status,
    subscriptionPriceId: normalized.priceId,
    subscriptionBillingCycle: normalized.billingCycle,
    subscriptionCurrentPeriodEnd: normalized.currentPeriodEnd,
    subscriptionCancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
  });

  log.info("synced subscription", {
    userId: auth.user.id,
    customerId,
    plan: normalized.plan,
    status: normalized.status,
    subscriptionId: normalized.subscriptionId,
  });

  // Devolvemos el perfil actualizado para que el UI pueda mostrarlo
  // sin tener que hacer otra llamada a /api/billing/status.
  const profile = await getBillingProfileByUserId(auth.user.id);
  return NextResponse.json({
    plan: normalized.plan,
    source: "stripe",
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
