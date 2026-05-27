import { NextResponse } from "next/server";
import type Stripe from "stripe";

import {
  applySubscriptionByCustomerId,
  getBillingProfileByCustomerId,
  markBillingEventProcessed,
  recordBillingEvent,
  setStripeCustomerId,
} from "@/lib/billing/repository";
import { normalizeSubscription } from "@/lib/billing/subscription";
import {
  getStripeClient,
  getStripeWebhookSecret,
  requireStripeClient,
} from "@/lib/billing/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = logger.child({ module: "billing.webhook" });

// Eventos que mantienen `users.subscription_*` sincronizado.
const SUBSCRIPTION_EVENTS = new Set([
  "customer.subscription.created",
  "customer.subscription.updated",
  "customer.subscription.deleted",
  "customer.subscription.paused",
  "customer.subscription.resumed",
]);

export async function POST(request: Request) {
  if (!getStripeClient()) {
    return NextResponse.json(
      { error: "Stripe no está configurado." },
      { status: 503 },
    );
  }
  const webhookSecret = getStripeWebhookSecret();
  if (!webhookSecret) {
    log.error("missing webhook secret");
    return NextResponse.json(
      { error: "Falta STRIPE_WEBHOOK_SECRET." },
      { status: 503 },
    );
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json(
      { error: "Falta el header stripe-signature." },
      { status: 400 },
    );
  }

  const stripe = requireStripeClient();
  const rawBody = await request.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      webhookSecret,
    );
  } catch (error) {
    log.warn("invalid signature", {
      error: error instanceof Error ? error.message : "unknown",
    });
    return NextResponse.json(
      { error: "Firma inválida." },
      { status: 400 },
    );
  }

  const customerId = extractCustomerId(event);
  const subscriptionId = extractSubscriptionId(event);

  const profile = customerId
    ? await getBillingProfileByCustomerId(customerId).catch((err) => {
        log.error("lookup profile failed", {
          customerId,
          error: err instanceof Error ? err.message : "unknown",
        });
        return null;
      })
    : null;

  const { inserted } = await recordBillingEvent({
    id: event.id,
    type: event.type,
    userId: profile?.userId,
    stripeCustomerId: customerId,
    stripeSubscriptionId: subscriptionId,
    payload: event,
  }).catch((err) => {
    log.error("event record failed", {
      error: err instanceof Error ? err.message : "unknown",
      eventId: event.id,
    });
    return { inserted: false };
  });

  if (!inserted) {
    log.info("event already processed", { eventId: event.id, type: event.type });
    return NextResponse.json({ received: true, duplicate: true });
  }

  try {
    if (event.type === "checkout.session.completed") {
      await handleCheckoutCompleted(event.data.object as Stripe.Checkout.Session);
    } else if (SUBSCRIPTION_EVENTS.has(event.type)) {
      await handleSubscriptionEvent(event.data.object as Stripe.Subscription);
    }
    await markBillingEventProcessed(event.id);
  } catch (error) {
    log.error("event handling failed", {
      eventId: event.id,
      type: event.type,
      error: error instanceof Error ? error.message : "unknown",
    });
    // Devolvemos 500 para que Stripe reintente.
    return NextResponse.json(
      { error: "No pudimos procesar el evento." },
      { status: 500 },
    );
  }

  return NextResponse.json({ received: true });
}

function extractCustomerId(event: Stripe.Event): string | null {
  const obj = event.data.object as { customer?: string | Stripe.Customer | null };
  if (!obj?.customer) return null;
  return typeof obj.customer === "string" ? obj.customer : obj.customer.id;
}

function extractSubscriptionId(event: Stripe.Event): string | null {
  const obj = event.data.object as {
    id?: string;
    subscription?: string | Stripe.Subscription | null;
  };
  if (event.type.startsWith("customer.subscription")) {
    return typeof obj.id === "string" ? obj.id : null;
  }
  if (!obj?.subscription) return null;
  return typeof obj.subscription === "string"
    ? obj.subscription
    : obj.subscription.id;
}

async function handleCheckoutCompleted(
  session: Stripe.Checkout.Session,
): Promise<void> {
  const userId =
    session.client_reference_id ??
    (typeof session.metadata?.councilia_user_id === "string"
      ? session.metadata.councilia_user_id
      : null);
  const customerId =
    typeof session.customer === "string"
      ? session.customer
      : session.customer?.id ?? null;

  if (userId && customerId) {
    // Aseguramos que el customer quede enlazado al usuario por si el
    // checkout creó uno nuevo desde Stripe Payment Links.
    await setStripeCustomerId(userId, customerId).catch((err) => {
      log.warn("setStripeCustomerId failed", {
        userId,
        customerId,
        error: err instanceof Error ? err.message : "unknown",
      });
    });
  }

  if (!session.subscription) return;
  const subscriptionId =
    typeof session.subscription === "string"
      ? session.subscription
      : session.subscription.id;
  const stripe = requireStripeClient();
  const subscription = await stripe.subscriptions.retrieve(subscriptionId, {
    expand: ["items.data.price"],
  });
  await syncSubscription(subscription);
}

async function handleSubscriptionEvent(
  subscription: Stripe.Subscription,
): Promise<void> {
  const stripe = requireStripeClient();
  let resolved = subscription;
  if (!subscription.items?.data?.[0]?.price?.lookup_key) {
    resolved = await stripe.subscriptions.retrieve(subscription.id, {
      expand: ["items.data.price"],
    });
  }
  await syncSubscription(resolved);
}

async function syncSubscription(subscription: Stripe.Subscription): Promise<void> {
  const customerId =
    typeof subscription.customer === "string"
      ? subscription.customer
      : subscription.customer?.id;
  if (!customerId) {
    log.warn("subscription without customer", {
      subscriptionId: subscription.id,
    });
    return;
  }

  const normalized = normalizeSubscription(subscription);
  await applySubscriptionByCustomerId(customerId, {
    plan: normalized.plan,
    stripeSubscriptionId: normalized.subscriptionId,
    subscriptionStatus: normalized.status,
    subscriptionPriceId: normalized.priceId,
    subscriptionBillingCycle: normalized.billingCycle,
    subscriptionCurrentPeriodEnd: normalized.currentPeriodEnd,
    subscriptionCancelAtPeriodEnd: normalized.cancelAtPeriodEnd,
  });
  log.info("subscription synced", {
    customerId,
    plan: normalized.plan,
    status: normalized.status,
  });
}
