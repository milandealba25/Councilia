-- COUNCILia · Añade nombre visible a perfiles de usuario.
-- Aplicar en Supabase SQL Editor si ya corriste 001_init.sql antes.

alter table public.users
  add column if not exists display_name text;

alter table public.users
  add column if not exists avatar_url text;

create or replace function public.handle_new_user() returns trigger as $$
begin
  insert into public.users (id, email, display_name, avatar_url)
  values (
    new.id,
    new.email,
    coalesce(
      new.raw_user_meta_data ->> 'full_name',
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'display_name'
    ),
    coalesce(
      new.raw_user_meta_data ->> 'avatar_url',
      new.raw_user_meta_data ->> 'picture',
      new.raw_user_meta_data ->> 'avatar'
    )
  )
  on conflict (id) do update
    set display_name = coalesce(
      excluded.display_name,
      public.users.display_name
    ),
    avatar_url = coalesce(
      excluded.avatar_url,
      public.users.avatar_url
    );
  return new;
end;
$$ language plpgsql security definer set search_path = public;

revoke execute on function public.handle_new_user() from public, anon, authenticated;
