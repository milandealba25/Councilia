import "server-only";

import { getSupabaseAdmin } from "@/lib/db/supabase";
import type { PlanId, BillingCycle } from "@/lib/billing/plans";
import { isValidPlanId, isValidBillingCycle } from "@/lib/billing/plans";

export interface BillingProfile {
  userId: string;
  email: string;
  plan: PlanId;
  stripeCustomerId: string | null;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionPriceId: string | null;
  subscriptionBillingCycle: BillingCycle | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
}

interface UsersRow {
  id: string;
  email: string;
  plan: string;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  subscription_status: string | null;
  subscription_price_id: string | null;
  subscription_billing_cycle: string | null;
  subscription_current_period_end: string | null;
  subscription_cancel_at_period_end: boolean | null;
}

const BILLING_COLUMNS = [
  "id",
  "email",
  "plan",
  "stripe_customer_id",
  "stripe_subscription_id",
  "subscription_status",
  "subscription_price_id",
  "subscription_billing_cycle",
  "subscription_current_period_end",
  "subscription_cancel_at_period_end",
].join(",");

function mapRow(row: UsersRow): BillingProfile {
  return {
    userId: row.id,
    email: row.email,
    plan: isValidPlanId(row.plan) ? row.plan : "free",
    stripeCustomerId: row.stripe_customer_id,
    stripeSubscriptionId: row.stripe_subscription_id,
    subscriptionStatus: row.subscription_status,
    subscriptionPriceId: row.subscription_price_id,
    subscriptionBillingCycle: isValidBillingCycle(row.subscription_billing_cycle)
      ? row.subscription_billing_cycle
      : null,
    subscriptionCurrentPeriodEnd: row.subscription_current_period_end,
    subscriptionCancelAtPeriodEnd: Boolean(row.subscription_cancel_at_period_end),
  };
}

function requireAdmin() {
  const admin = getSupabaseAdmin();
  if (!admin) {
    throw new Error(
      "[billing] Falta SUPABASE_SERVICE_ROLE_KEY. La sincronización de Stripe necesita la service-role.",
    );
  }
  return admin;
}

export async function getBillingProfileByUserId(
  userId: string,
): Promise<BillingProfile | null> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("users")
    .select(BILLING_COLUMNS)
    .eq("id", userId)
    .maybeSingle<UsersRow>();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function getBillingProfileByCustomerId(
  customerId: string,
): Promise<BillingProfile | null> {
  const admin = requireAdmin();
  const { data, error } = await admin
    .from("users")
    .select(BILLING_COLUMNS)
    .eq("stripe_customer_id", customerId)
    .maybeSingle<UsersRow>();
  if (error) throw error;
  return data ? mapRow(data) : null;
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin
    .from("users")
    .update({ stripe_customer_id: stripeCustomerId })
    .eq("id", userId);
  if (error) throw error;
}

export interface SubscriptionPatch {
  plan: PlanId;
  stripeSubscriptionId: string | null;
  subscriptionStatus: string | null;
  subscriptionPriceId: string | null;
  subscriptionBillingCycle: BillingCycle | null;
  subscriptionCurrentPeriodEnd: string | null;
  subscriptionCancelAtPeriodEnd: boolean;
}

export async function applySubscriptionByCustomerId(
  customerId: string,
  patch: SubscriptionPatch,
): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin
    .from("users")
    .update({
      plan: patch.plan,
      stripe_subscription_id: patch.stripeSubscriptionId,
      subscription_status: patch.subscriptionStatus,
      subscription_price_id: patch.subscriptionPriceId,
      subscription_billing_cycle: patch.subscriptionBillingCycle,
      subscription_current_period_end: patch.subscriptionCurrentPeriodEnd,
      subscription_cancel_at_period_end: patch.subscriptionCancelAtPeriodEnd,
    })
    .eq("stripe_customer_id", customerId);
  if (error) throw error;
}

/**
 * Registra un evento de Stripe para idempotencia.
 * Devuelve `false` si el evento ya estaba registrado.
 */
export async function recordBillingEvent(args: {
  id: string;
  type: string;
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  payload: unknown;
}): Promise<{ inserted: boolean }> {
  const admin = requireAdmin();
  const { error } = await admin.from("billing_events").insert({
    id: args.id,
    type: args.type,
    user_id: args.userId ?? null,
    stripe_customer_id: args.stripeCustomerId ?? null,
    stripe_subscription_id: args.stripeSubscriptionId ?? null,
    payload: args.payload as Record<string, unknown>,
  });
  if (!error) return { inserted: true };
  if (error.code === "23505") {
    return { inserted: false };
  }
  throw error;
}

export async function markBillingEventProcessed(id: string): Promise<void> {
  const admin = requireAdmin();
  const { error } = await admin
    .from("billing_events")
    .update({ processed_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}
