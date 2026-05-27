import { NextResponse } from "next/server";

import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import { getRequestAppUrl } from "@/lib/appUrl";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import {
  PLANS,
  isValidBillingCycle,
  resolveLookupKey,
  type BillingCycle,
  type PlanId,
} from "@/lib/billing/plans";
import {
  getStripeClient,
  requireStripeClient,
} from "@/lib/billing/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = logger.child({ module: "billing.checkout" });

export async function POST(request: Request) {
  if (!getStripeClient()) {
    return NextResponse.json(
      { error: "Stripe no está configurado todavía. Pide a un admin que cargue STRIPE_SECRET_KEY." },
      { status: 503 },
    );
  }

  const auth = await authenticateRequest(request);
  if (isAuthError(auth)) return auth;

  let body: { plan?: unknown; billingCycle?: unknown } = {};
  try {
    body = (await request.json()) as typeof body;
  } catch {
    return NextResponse.json(
      { error: "El cuerpo debe ser JSON con { plan, billingCycle }." },
      { status: 400 },
    );
  }

  const planId = body.plan as PlanId | undefined;
  const billingCycle = body.billingCycle as BillingCycle | undefined;

  if (!planId || planId === "free" || !PLANS[planId]?.paid) {
    return NextResponse.json(
      { error: "Plan inválido. Usa 'plus' o 'pro'." },
      { status: 400 },
    );
  }
  if (!isValidBillingCycle(billingCycle)) {
    return NextResponse.json(
      { error: "billingCycle debe ser 'monthly' o 'annual'." },
      { status: 400 },
    );
  }

  const lookupKey = resolveLookupKey(planId, billingCycle);
  if (!lookupKey) {
    return NextResponse.json(
      { error: "Ese plan no tiene precio configurado." },
      { status: 400 },
    );
  }

  const stripe = requireStripeClient();
  const prices = await stripe.prices.list({
    lookup_keys: [lookupKey],
    active: true,
    expand: ["data.product"],
    limit: 1,
  });
  const price = prices.data[0];
  if (!price) {
    log.error("Stripe price not found", { lookupKey });
    return NextResponse.json(
      { error: "No encontramos el precio en Stripe. Vuelve a sincronizar el catálogo." },
      { status: 500 },
    );
  }

  const customerId = await ensureStripeCustomer({
    userId: auth.user.id,
    email: auth.user.email,
    name:
      (typeof auth.user.metadata?.["full_name"] === "string"
        ? (auth.user.metadata["full_name"] as string)
        : null) ?? null,
  });

  const origin = getRequestAppUrl(request);

  const session = await stripe.checkout.sessions.create({
    mode: "subscription",
    customer: customerId,
    line_items: [{ price: price.id, quantity: 1 }],
    allow_promotion_codes: true,
    billing_address_collection: "auto",
    automatic_tax: { enabled: false },
    success_url: `${origin}/account?billing=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url: `${origin}/account?billing=cancel`,
    client_reference_id: auth.user.id,
    subscription_data: {
      metadata: {
        councilia_user_id: auth.user.id,
        plan: planId,
        billing_cycle: billingCycle,
      },
    },
    metadata: {
      councilia_user_id: auth.user.id,
      plan: planId,
      billing_cycle: billingCycle,
    },
  });

  if (!session.url) {
    return NextResponse.json(
      { error: "Stripe no devolvió URL de checkout." },
      { status: 502 },
    );
  }

  log.info("checkout.session.created", {
    sessionId: session.id,
    userId: auth.user.id,
    plan: planId,
    billingCycle,
  });

  return NextResponse.json({ url: session.url, sessionId: session.id });
}
