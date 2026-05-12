-- COUNCILia · Migración inicial (J1)
-- Tablas: users, councils, conversations, messages.
-- RLS activada en todas para que el usuario solo vea lo suyo (G3).
--
-- Cómo aplicarla:
--   1) Supabase Dashboard → SQL Editor → New query
--   2) Pegar este archivo completo y "Run"
--   3) Verificar en Authentication → Policies que cada tabla tenga sus RLS

-- ────────────────────────────────────────────────────────────────────────────
-- 1. users (extiende auth.users con metadatos del producto)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  email text not null,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists users_email_idx on public.users (email);

-- ────────────────────────────────────────────────────────────────────────────
-- 2. councils (un council por encuesta completada; userContext en jsonb)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.councils (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  user_context jsonb not null,
  survey_version text not null default 'v1',
  name text,
  created_at timestamptz not null default now()
);

create index if not exists councils_user_id_idx on public.councils (user_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 3. conversations (una conversación = una sesión con N turnos)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.conversations (
  id uuid primary key default gen_random_uuid(),
  council_id uuid not null references public.councils (id) on delete cascade,
  user_id uuid not null references public.users (id) on delete cascade,
  title text,
  status text not null default 'active' check (status in ('active', 'archived', 'deleted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists conversations_user_id_idx
  on public.conversations (user_id, created_at desc);
create index if not exists conversations_council_id_idx
  on public.conversations (council_id, created_at desc);

-- ────────────────────────────────────────────────────────────────────────────
-- 4. messages (cada turno: user, agente o réplica; síntesis se guarda como
--    mensaje agente_role='synthesis' con content JSON estructurado)
-- ────────────────────────────────────────────────────────────────────────────
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.conversations (id) on delete cascade,
  agent_id text check (agent_id in ('marco', 'elena', 'rafael') or agent_id is null),
  role text not null check (role in ('user', 'agent', 'synthesis')),
  phase text not null check (phase in ('initial', 'replica', 'synthesis', 'user_input')),
  content text not null,
  content_json jsonb,
  token_count integer,
  replies_to_agent_id text check (replies_to_agent_id in ('marco', 'elena', 'rafael') or replies_to_agent_id is null),
  created_at timestamptz not null default now()
);

create index if not exists messages_conversation_idx
  on public.messages (conversation_id, created_at);

-- ────────────────────────────────────────────────────────────────────────────
-- 5. Trigger genérico de updated_at
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.set_updated_at() returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

drop trigger if exists trg_users_updated_at on public.users;
create trigger trg_users_updated_at before update on public.users
  for each row execute function public.set_updated_at();

drop trigger if exists trg_conversations_updated_at on public.conversations;
create trigger trg_conversations_updated_at before update on public.conversations
  for each row execute function public.set_updated_at();

-- ────────────────────────────────────────────────────────────────────────────
-- 6. Row-Level Security (G3 + Principio de mínima exposición)
-- ────────────────────────────────────────────────────────────────────────────
alter table public.users enable row level security;
alter table public.councils enable row level security;
alter table public.conversations enable row level security;
alter table public.messages enable row level security;

-- users: solo cada usuario ve / actualiza su propio perfil.
drop policy if exists users_self_select on public.users;
create policy users_self_select on public.users
  for select using (auth.uid() = id);

drop policy if exists users_self_update on public.users;
create policy users_self_update on public.users
  for update using (auth.uid() = id);

drop policy if exists users_self_insert on public.users;
create policy users_self_insert on public.users
  for insert with check (auth.uid() = id);

-- councils: el usuario controla los suyos.
drop policy if exists councils_self_all on public.councils;
create policy councils_self_all on public.councils
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- conversations: el usuario controla las suyas.
drop policy if exists conversations_self_all on public.conversations;
create policy conversations_self_all on public.conversations
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- messages: vía conversation_id; revisamos ownership por subselect.
drop policy if exists messages_self_select on public.messages;
create policy messages_self_select on public.messages
  for select using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists messages_self_insert on public.messages;
create policy messages_self_insert on public.messages
  for insert with check (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

drop policy if exists messages_self_delete on public.messages;
create policy messages_self_delete on public.messages
  for delete using (
    exists (
      select 1 from public.conversations c
      where c.id = messages.conversation_id and c.user_id = auth.uid()
    )
  );

-- ────────────────────────────────────────────────────────────────────────────
-- 7. Trigger que crea automáticamente public.users al confirmar auth.users
-- ────────────────────────────────────────────────────────────────────────────
create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$ language plpgsql security definer;

drop trigger if exists trg_on_auth_user_created on auth.users;
create trigger trg_on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
