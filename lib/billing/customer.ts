import "server-only";

import { requireStripeClient } from "@/lib/billing/stripe";
import {
  getBillingProfileByUserId,
  setStripeCustomerId,
} from "@/lib/billing/repository";

export interface EnsureCustomerInput {
  userId: string;
  email: string;
  name?: string | null;
}

/**
 * Devuelve el `stripe_customer_id` del usuario, creándolo si todavía no existe.
 * Idempotente: si ya está enlazado, simplemente lo devuelve.
 */
export async function ensureStripeCustomer(
  input: EnsureCustomerInput,
): Promise<string> {
  const stripe = requireStripeClient();
  const existing = await getBillingProfileByUserId(input.userId);
  if (existing?.stripeCustomerId) {
    return existing.stripeCustomerId;
  }

  const customer = await stripe.customers.create({
    email: input.email,
    name: input.name ?? undefined,
    metadata: {
      councilia_user_id: input.userId,
    },
  });

  await setStripeCustomerId(input.userId, customer.id);
  return customer.id;
}
