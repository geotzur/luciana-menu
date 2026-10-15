# Menu data restore

The `noham` Supabase project (`nylufogmuromxuqvsvkx`) was deleted on 2026-10-15.
A deleted project cannot be reopened: it no longer appears in the project list,
and both `get_project` and `restore_project` refuse with a permission error.

`casa_vina_menu_2026-10-04.sql` is a snapshot taken on 4 October — 13 categories
and 108 dishes, with Hebrew and English names and descriptions, prices,
multi-option price labels, serving cut-offs, dietary flags and display order.
It is the only copy of that data. The same content is in the `.json` file beside
it, for anything that prefers data to SQL.

## Restoring into a replacement project

1. Create a new project, then apply every migration in `supabase/migrations/` in
   filename order. They end with the app-claim scoping, so `is_admin()` will
   require `app_metadata.app = 'menu'`.
2. Run `casa_vina_menu_2026-10-04.sql` in the SQL editor. It runs in a
   transaction and aborts if `categories` or `dishes` already hold rows, so it
   cannot silently duplicate an existing menu.
3. Create the admin account and grant it the claim (see `SETUP-NEW-CLIENT.md`),
   then sign in again.
4. Update `.env` and `supabase/config.toml` with the new project ref, URL and
   anon key.
5. Re-upload the dish photos and repoint them — the last comment in the SQL file
   has the one-line `update`.

## What is not in here

- **The 80 dish photos.** They lived in the deleted project's storage bucket.
  The rows keep their URLs, but those will 404 until the images are re-uploaded.
- **Auth users.** Accounts and their `app` claims have to be recreated.
- **Anything changed between 4 October and the deletion.**

## Avoiding a repeat

Supabase keeps automated backups on paid plans only; on the free tier a deleted
project is unrecoverable.

`.github/workflows/backup-menu.yml` now snapshots the live menu into `backups/`
every night and on demand, committing only when something changed. Git history
is the version store, so any past commit is a restorable snapshot.

It needs two repository secrets, under Settings → Secrets and variables →
Actions:

| Secret | Value |
| --- | --- |
| `SUPABASE_URL` | `https://<project-ref>.supabase.co` |
| `SUPABASE_ANON_KEY` | the anon / publishable key — **not** `service_role` |

The anon key is sufficient, because `categories` and `dishes` are publicly
readable and the `dish-images` bucket is public. CI never holds a privileged
credential.

Two things it does deliberately:

- **It mirrors the photos**, not only the rows. The photos were the one part of
  this incident that could not be reconstructed from anything else.
- **It refuses to shrink.** If a run returns fewer than 90% of the dishes the
  last snapshot held, it fails instead of committing — a revoked key or a
  half-finished import must not quietly replace a good backup with an empty
  one. Override with `ALLOW_SHRINK=true` for a genuine large deletion.

To rebuild a restore script from any snapshot, including an older commit:

```sh
node scripts/menu-json-to-sql.mjs backups/menu-latest.json > restore.sql
```

Run it before an Excel import too — importing deletes every category and dish
first, so a snapshot taken just beforehand is the cheapest possible undo.
