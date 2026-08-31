-- Hardening for the shared "noham" project only.
--
-- That project already hosted a youth / community-centre application whose
-- every table carried a single policy: FOR ALL TO authenticated USING (true).
-- That grants any account on the project -- including the restaurant menu
-- administrator created for this app -- full read and write over youth records,
-- parent phone numbers and treatment status.
--
-- Re-scope those tables to the same `app` claim the menu uses, so each
-- application can only reach its own data. The auth.uid() term is a
-- transitional safety net for the one pre-existing account, whose
-- already-issued token predates the claim; it can be dropped once that app has
-- been confirmed working (see SETUP-NEW-CLIENT.md).
--
-- Every statement is guarded by to_regclass / pg_policies lookups, so this is a
-- no-op on a project that hosts only the menu. It lives in the migration chain
-- rather than outside it so that the repository matches what was actually
-- applied to the database.

do $$
declare
  t text;
  app_tables text[] := array[
    'activities', 'activity_participants', 'ai_actions', 'ai_document_processing',
    'community_centers', 'documents', 'expenses', 'operators', 'youths'
  ];
  predicate constant text :=
    'public.jwt_app() = ''noham'' or auth.uid() = ''432a5cab-3cab-45db-8df5-32d77bace844''::uuid';
begin
  foreach t in array app_tables loop
    if to_regclass('public.' || quote_ident(t)) is not null then
      execute format('drop policy if exists %I on public.%I', t || '_authenticated_all', t);
      execute format('drop policy if exists %I on public.%I', t || '_noham_app', t);
      execute format(
        'create policy %I on public.%I for all to authenticated using (%s) with check (%s)',
        t || '_noham_app', t, predicate, predicate
      );
    end if;
  end loop;

  -- The private documents bucket had the same shape.
  if exists (
    select 1 from pg_policies
    where schemaname = 'storage' and tablename = 'objects'
      and policyname = 'documents_authenticated_all'
  ) then
    drop policy "documents_authenticated_all" on storage.objects;
    execute format(
      'create policy %I on storage.objects for all to authenticated using (%s) with check (%s)',
      'documents_noham_app',
      'bucket_id = ''documents'' and (' || predicate || ')',
      'bucket_id = ''documents'' and (' || predicate || ')'
    );
  end if;
end $$;
