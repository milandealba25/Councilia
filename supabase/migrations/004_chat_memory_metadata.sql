-- COUNCILia - Persistencia MVP de chats
-- Agrega metadata ligera para memoria entre sesiones sin romper las tablas
-- existentes de conversaciones/mensajes.

alter table public.conversations
  add column if not exists summary text not null default '',
  add column if not exists key_facts jsonb not null default '[]'::jsonb,
  add column if not exists survey_snapshot jsonb,
  add column if not exists last_summarized_at timestamptz;

create index if not exists conversations_user_updated_idx
  on public.conversations (user_id, updated_at desc)
  where status = 'active';
