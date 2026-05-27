import "server-only";

import Stripe from "stripe";
import { env } from "@/lib/env";

let cachedClient: Stripe | null = null;

/**
 * Devuelve un cliente Stripe inicializado contra `STRIPE_SECRET_KEY`.
 * Si la clave no está definida, se devuelve `null` para que el caller
 * pueda responder con un 503 amigable en vez de crashear.
 */
export function getStripeClient(): Stripe | null {
  if (cachedClient) return cachedClient;
  if (!env.STRIPE_SECRET_KEY) return null;
  cachedClient = new Stripe(env.STRIPE_SECRET_KEY, {
    appInfo: {
      name: "Councilia",
      url: "https://councilia.app",
    },
    typescript: true,
  });
  return cachedClient;
}

export function requireStripeClient(): Stripe {
  const client = getStripeClient();
  if (!client) {
    throw new Error(
      "[billing] Falta STRIPE_SECRET_KEY. Configúrala en .env.local para activar Stripe.",
    );
  }
  return client;
}

export function getStripeWebhookSecret(): string | null {
  return env.STRIPE_WEBHOOK_SECRET ?? null;
}

export function isStripeConfigured(): boolean {
  return Boolean(env.STRIPE_SECRET_KEY);
}

export { Stripe };
