-- COUNCILia · Migración 006 · Billing / Stripe
--
-- Añade los campos de suscripción al perfil del usuario y crea la tabla
-- `billing_events` para idempotencia de webhooks. Las escrituras siempre
-- pasan por la service-role (api routes), por eso RLS no expone columnas
-- nuevas a los clientes.
--
-- Aplicación: Supabase Dashboard → SQL Editor → New query → pegar y "Run".

-- ────────────────────────────────────────────────────────────────────────────
-- 1. Ampliar enum de planes (free / plus / pro)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.users
  drop constraint if exists users_plan_check;

alter table public.users
  add constraint users_plan_check
    check (plan in ('free', 'plus', 'pro'));

-- ────────────────────────────────────────────────────────────────────────────
-- 2. Columnas de suscripción
-- ────────────────────────────────────────────────────────────────────────────
alter table public.users
  add column if not exists stripe_customer_id text,
  add column if not exists stripe_subscription_id text,
  add column if not exists subscription_status text,
  add column if not exists subscription_price_id text,
  add column if not exists subscription_billing_cycle text
    check (subscription_billing_cycle in ('monthly', 'annual')),
  add column if not exists subscription_current_period_end timestamptz,
  add column if not exists subscription_cancel_at_period_end boolean not null default false;

create unique index if not exists users_stripe_customer_id_uniq
  on public.users (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists users_stripe_subscription_id_uniq
  on public.users (stripe_subscription_id)
  where stripe_subscription_id is not null;

-- ────────────────────────────────────────────────────────────────────────────
-- 3. billing_events (idempotencia de webhooks de Stripe)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.billing_events (
  id text primary key,
  type text not null,
  user_id uuid references public.users (id) on delete set null,
  stripe_customer_id text,
  stripe_subscription_id text,
  payload jsonb not null,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

create index if not exists billing_events_type_idx
  on public.billing_events (type, received_at desc);

create index if not exists billing_events_user_idx
  on public.billing_events (user_id, received_at desc);

alter table public.billing_events enable row level security;

-- billing_events: nadie puede leerla desde el cliente; solo service-role.
drop policy if exists billing_events_deny_all on public.billing_events;
create policy billing_events_deny_all on public.billing_events
  for all using (false) with check (false);
