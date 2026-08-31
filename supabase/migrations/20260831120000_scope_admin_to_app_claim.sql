-- This Supabase project hosts more than one application, so "is logged in" is
-- no longer a safe definition of "menu administrator": an account belonging to
-- another app on this project would otherwise satisfy is_admin() and be able to
-- rewrite the menu.
--
-- Authorization now keys off an `app` claim carried in the JWT's app_metadata.
-- app_metadata is writable only by the service role -- unlike user_metadata,
-- a user cannot edit their own -- so the claim is not forgeable by the client.
--
-- Grant a menu administrator access with:
--   update auth.users
--   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
--                           || '{"app":"menu"}'::jsonb
--   where email = 'admin@example.com';
-- The claim only appears in a token issued after the update, so the user must
-- sign in again (or wait for their access token to refresh).

create or replace function public.jwt_app()
returns text
language sql
stable
set search_path = public
as $$
  select coalesce(auth.jwt() -> 'app_metadata' ->> 'app', '');
$$;

comment on function public.jwt_app() is
  'Owning application from the caller''s JWT app_metadata; empty string when unset.';

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select public.jwt_app() = 'menu';
$$;

comment on function public.is_admin() is
  'True only for users whose JWT app claim is "menu". Public menu reads do not use this.';

-- The dish-images bucket had the same "any authenticated user" problem.
drop policy if exists "Admin can upload dish images" on storage.objects;
drop policy if exists "Admin can update dish images" on storage.objects;
drop policy if exists "Admin can delete dish images" on storage.objects;

create policy "Admin can upload dish images" on storage.objects
  for insert with check (bucket_id = 'dish-images' and public.is_admin());
create policy "Admin can update dish images" on storage.objects
  for update using (bucket_id = 'dish-images' and public.is_admin());
create policy "Admin can delete dish images" on storage.objects
  for delete using (bucket_id = 'dish-images' and public.is_admin());
