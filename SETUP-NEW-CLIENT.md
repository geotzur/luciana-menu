# Setting up a new client

This branch is a per-client replica of the menu app. Everything client-specific
lives in **`src/config/brand.ts`** plus the Supabase credentials in `.env`.

## 1. Supabase — the `noham` project

This client runs on the existing **`noham`** project (ref `nylufogmuromxuqvsvkx`,
eu-central-1) rather than a dedicated one, to avoid the $10/month a second
project would cost.

**`noham` is shared.** It already hosted a youth / community-centre application
(`youths`, `community_centers`, `operators`, `activities`, `expenses`,
`documents`, …). That matters, because the menu app's original RLS model defined
an administrator as *any authenticated user* — and so did every table in the
youth app. Dropping the menu into that project unchanged would have let the
restaurant's `/admin` login read and edit youth records, including names, ages,
parent phone numbers and treatment status.

Two migrations fix this, and both are already applied:

- `20260831120000_scope_admin_to_app_claim.sql` — redefines `public.is_admin()`
  to require `app_metadata.app = 'menu'` in the caller's JWT, and applies the
  same rule to the `dish-images` storage policies.
- `20260831120100_scope_noham_tables_to_app_claim.sql` — re-scopes the youth
  app's nine tables and its private `documents` bucket to
  `app_metadata.app = 'noham'`.

`app_metadata` is writable only by the service role — a user cannot edit their
own, unlike `user_metadata` — so the claim cannot be forged from the browser.
The second migration is guarded by `to_regclass`, so it is a harmless no-op on a
project that hosts only the menu.

### Already done

- All five migrations applied to `noham`.
- The pre-existing youth-app account has been given `app_metadata.app = 'noham'`,
  so it keeps its access.
- Verified by simulating tokens: a `menu` account sees 0 of 10 youths, 0 of 3
  documents and 0 of 11 expenses, while the `noham` account still sees all of
  them and is *not* a menu admin.

### Still to do

1. **Paste the anon key.** `.env` currently has a placeholder. Copy the
   **anon / publishable key** from Project Settings → API in the `noham`
   project into `VITE_SUPABASE_PUBLISHABLE_KEY`. The other two values are
   already correct.

   `.env` is committed to this repository, so whatever you put here lands in git
   history. The anon key is designed to be public and RLS is what actually
   protects the data — but if you would rather it not be in the repo, add `.env`
   to `.gitignore` and set the three variables in your host's environment
   settings instead.

2. **Create the menu administrator.** Under **Authentication → Users**, add the
   account that will log in at `/admin`. A new account has no `app` claim, so it
   starts with access to *nothing* — which is the safe default. Grant it the
   menu role in the SQL editor:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb)
                           || '{"app":"menu"}'::jsonb
   where email = 'admin@example.com';
   ```

   The claim is baked into the token at issue time, so the user must sign in
   again afterwards for it to take effect.

3. **Restart the dev server** — Vite only reads `.env` at startup.

### Removing the transitional safety net

`20260831120100` allows the youth tables through for either the `noham` claim
*or* one hardcoded `auth.uid()`. That second term exists only because the
pre-existing account's token was issued before the claim was set. Once you have
confirmed the youth app still works after a fresh sign-in, drop it:

```sql
-- for each of the nine <table>_noham_app policies
alter policy "youths_noham_app" on public.youths
  using (public.jwt_app() = 'noham')
  with check (public.jwt_app() = 'noham');
```

### If you add a third app to this project

Give it its own claim value and its own policies. The rule to hold to: never
write a policy whose only condition is `authenticated`, because on a shared
project that means "every account of every app".

### Edge functions (optional)

`supabase/functions/` holds `proxy-image` and `import-drive-images`, used only
by the "import images from Google Drive" button in the admin panel. Deploy them
to the new project with the Supabase CLI if the client needs that feature:

```sh
supabase functions deploy proxy-image --project-ref nylufogmuromxuqvsvkx
supabase functions deploy import-drive-images --project-ref nylufogmuromxuqvsvkx
```

Both are configured with `verify_jwt = false` in `supabase/config.toml`, so they
are publicly callable — leave them undeployed unless the client uses the Drive
import.

## 2. Load the menu

Log in at `/admin/login`, go to the Excel upload tab and upload the client's
menu file. The importer matches column headers loosely (Hebrew or English),
auto-translates Hebrew names to English, and detects vegan / vegetarian /
gluten-free / spicy from keywords in the text. Review the parsed preview before
confirming the import.

## 3. Brand the app

All of it is in `src/config/brand.ts`:

| Field | What it controls |
| --- | --- |
| `name`, `tagline` | Wordmark text and the accessible logo label |
| `logo` | The logo image. `null` renders a typographic wordmark instead |
| `theme` | Every colour, plus corner radius. `mode` picks light/dark-appropriate badge palettes and high-contrast behaviour |
| `fonts` | Body and heading families, heading weight, tracking, uppercasing, base size |
| `layout` | `photo-first`, `grid`, or `list` |
| `headerStyle` | `left` or `centered` logo |
| `features` | Per-element on/off switches (see below) |
| `meta` | Browser tab title and share description |

To add the client's logo:

```ts
import clientLogo from "@/assets/client-logo.png";
// ...
logo: clientLogo,
```

### Visibility switches

Every flag in `features` hides its element everywhere it appears, including
inside the dish detail dialog:

`showPrices`, `showImages`, `showDietaryBadges`, `showSearch`,
`showCategoryNav`, `showChefNotes`, `showLanguageSwitcher`,
`showAccessibilityMenu`, `enableDishDialog`.

### Going further than the config

The config covers the common ground; it is not a ceiling. Because each client
gets their own branch, any component can be rewritten for one client without
affecting the others. `src/components/menu/DishCard.tsx` already branches on
`brand.layout` — add a new variant there rather than special-casing a client
inside an existing one.

## 4. Run it

```sh
npm install
npm run dev
```

If the dev server fails with `EAFNOSUPPORT ... :::8080`, the machine has no IPv6
and `vite.config.ts` binds to `::`. Run `npx vite --host 127.0.0.1` instead, or
change the `server.host` value.
