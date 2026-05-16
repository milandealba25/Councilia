-- COUNCILia · Fotos de perfil de usuario.
-- Aplicar en Supabase SQL Editor si ya corriste las migraciones anteriores.

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

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'user-avatars',
  'user-avatars',
  true,
  2097152,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set
    public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;
