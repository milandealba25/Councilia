import { NextResponse } from "next/server";

import {
  authenticateRequest,
  isAuthError,
} from "@/lib/auth/serverSession";
import { getRequestAppUrl } from "@/lib/appUrl";
import { ensureStripeCustomer } from "@/lib/billing/customer";
import {
  getStripeClient,
  requireStripeClient,
} from "@/lib/billing/stripe";
import { logger } from "@/lib/observability/logger";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const log = logger.child({ module: "billing.portal" });

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

  const origin = getRequestAppUrl(request);
  const stripe = requireStripeClient();

  try {
    const portal = await stripe.billingPortal.sessions.create({
      customer: customerId,
      return_url: `${origin}/account?billing=portal`,
    });
    log.info("portal.session.created", {
      customerId,
      userId: auth.user.id,
    });
    return NextResponse.json({ url: portal.url });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Stripe rechazó la creación del portal.";
    log.error("portal.session.error", { error: message, customerId });
    // Mensaje frecuente: hay que configurar el Customer Portal en Stripe Dashboard.
    return NextResponse.json(
      {
        error:
          "No pudimos abrir el portal de facturación. Verifica que tengas el Customer Portal habilitado en Stripe.",
      },
      { status: 502 },
    );
  }
}
