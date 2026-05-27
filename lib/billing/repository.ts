import "server-only";

import {
  getSupabaseServiceRoleKey,
  requireSupabaseConfig,
} from "@/lib/db/supabase";
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

interface PostgrestError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
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

function requireBillingRest() {
  const config = requireSupabaseConfig();
  const serviceRoleKey = getSupabaseServiceRoleKey();
  if (!serviceRoleKey) {
    throw new Error(
      "[billing] Falta SUPABASE_SERVICE_ROLE_KEY. La sincronización de Stripe necesita la service-role.",
    );
  }
  return { supabaseUrl: config.url, serviceRoleKey };
}

function restUrl(table: string): URL {
  const { supabaseUrl } = requireBillingRest();
  return new URL(`/rest/v1/${table}`, supabaseUrl);
}

function restHeaders(serviceRoleKey: string): HeadersInit {
  return {
    apikey: serviceRoleKey,
    authorization: `Bearer ${serviceRoleKey}`,
    "content-type": "application/json",
  };
}

async function readPostgrestError(response: Response): Promise<PostgrestError> {
  return (await response.json().catch(() => ({
    message: response.statusText,
  }))) as PostgrestError;
}

async function throwForPostgrest(response: Response): Promise<never> {
  const error = await readPostgrestError(response);
  throw new Error(
    error.message ?? `[supabase] Error HTTP ${response.status} en REST.`,
  );
}

async function getSingleBillingProfile(
  column: "id" | "stripe_customer_id",
  value: string,
): Promise<BillingProfile | null> {
  const { serviceRoleKey } = requireBillingRest();
  const url = restUrl("users");
  url.searchParams.set("select", BILLING_COLUMNS);
  url.searchParams.set(column, `eq.${value}`);
  url.searchParams.set("limit", "1");

  const response = await fetch(url, {
    headers: restHeaders(serviceRoleKey),
    cache: "no-store",
  });
  if (!response.ok) await throwForPostgrest(response);

  const rows = (await response.json().catch(() => [])) as UsersRow[];
  return rows[0] ? mapRow(rows[0]) : null;
}

export async function getBillingProfileByUserId(
  userId: string,
): Promise<BillingProfile | null> {
  return getSingleBillingProfile("id", userId);
}

export async function getBillingProfileByCustomerId(
  customerId: string,
): Promise<BillingProfile | null> {
  return getSingleBillingProfile("stripe_customer_id", customerId);
}

async function updateUsers(
  column: "id" | "stripe_customer_id",
  value: string,
  payload: Record<string, unknown>,
): Promise<void> {
  const { serviceRoleKey } = requireBillingRest();
  const url = restUrl("users");
  url.searchParams.set(column, `eq.${value}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...restHeaders(serviceRoleKey),
      prefer: "return=minimal",
    },
    body: JSON.stringify(payload),
  });
  if (!response.ok) await throwForPostgrest(response);
}

export async function setStripeCustomerId(
  userId: string,
  stripeCustomerId: string,
): Promise<void> {
  await updateUsers("id", userId, { stripe_customer_id: stripeCustomerId });
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
  await updateUsers("stripe_customer_id", customerId, {
    plan: patch.plan,
    stripe_subscription_id: patch.stripeSubscriptionId,
    subscription_status: patch.subscriptionStatus,
    subscription_price_id: patch.subscriptionPriceId,
    subscription_billing_cycle: patch.subscriptionBillingCycle,
    subscription_current_period_end: patch.subscriptionCurrentPeriodEnd,
    subscription_cancel_at_period_end: patch.subscriptionCancelAtPeriodEnd,
  });
}

export async function recordBillingEvent(args: {
  id: string;
  type: string;
  userId?: string | null;
  stripeCustomerId?: string | null;
  stripeSubscriptionId?: string | null;
  payload: unknown;
}): Promise<{ inserted: boolean }> {
  const { serviceRoleKey } = requireBillingRest();
  const response = await fetch(restUrl("billing_events"), {
    method: "POST",
    headers: {
      ...restHeaders(serviceRoleKey),
      prefer: "return=minimal",
    },
    body: JSON.stringify({
      id: args.id,
      type: args.type,
      user_id: args.userId ?? null,
      stripe_customer_id: args.stripeCustomerId ?? null,
      stripe_subscription_id: args.stripeSubscriptionId ?? null,
      payload: args.payload,
    }),
  });

  if (response.ok) return { inserted: true };

  const error = await readPostgrestError(response);
  if (response.status === 409 || error.code === "23505") {
    return { inserted: false };
  }
  throw new Error(error.message ?? "[billing] No se pudo registrar el evento.");
}

export async function markBillingEventProcessed(id: string): Promise<void> {
  const { serviceRoleKey } = requireBillingRest();
  const url = restUrl("billing_events");
  url.searchParams.set("id", `eq.${id}`);

  const response = await fetch(url, {
    method: "PATCH",
    headers: {
      ...restHeaders(serviceRoleKey),
      prefer: "return=minimal",
    },
    body: JSON.stringify({ processed_at: new Date().toISOString() }),
  });
  if (!response.ok) await throwForPostgrest(response);
}
