# Menu backups and restore

This repository holds two menus, each on its own Supabase project:

| Menu | Code | Backups |
| --- | --- | --- |
| Casa Vina | branch `claude/project-replica-new-client-6ipjfe` | releases `backup-casa-vina-*` |
| Luciana | `main` | releases `backup-luciana-*` |

## What is backed up

`.github/workflows/backup-menus.yml` checks both menus every day at 02:17 UTC.
When a menu has changed since its newest backup, it publishes a release with:

- `menu-latest.json`: every category and dish (names, descriptions, prices,
  flags, order).
- `<menu>-backup.zip`: the same JSON plus `dish-images/`, every dish photo.

Only the newest 5 backups per menu are kept. To take one on demand (before an
Excel import, which deletes the whole menu first): Actions → Backup menus →
Run workflow (tick "force" to publish even if nothing changed).

**Not backed up:** admin logins (Supabase auth users). Recreate them by hand,
step 5 below.

## Restoring into a new Supabase project

1. Download the backup zip from the repo's Releases page and unzip it.
2. Create a new Supabase project and run every file in `supabase/migrations/`
   (of that menu's branch) in filename order, in the SQL editor.
3. Build the restore script and run it in the SQL editor:
   `node scripts/menu-json-to-sql.mjs menu-latest.json > restore.sql`
4. Photos: in Storage → `dish-images`, upload the files from `dish-images/`,
   then run the `update ... replace(...)` line at the end of `restore.sql`
   with the old and new project refs.
5. Authentication → Users → Add user, then grant admin:
   `update auth.users set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"app":"menu"}'::jsonb where email = '<email>';`
   (Luciana's older code treats any signed-in user as admin, so this is only
   needed for Casa Vina.)
6. Point the app at the new project: `.env` and `supabase/config.toml` on the
   menu's branch, the Netlify site's `VITE_SUPABASE_*` environment variables,
   and the two `<MENU>_SUPABASE_*` secrets above. Then redeploy.
