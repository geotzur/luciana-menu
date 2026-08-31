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
- `.env` and `supabase/config.toml` point at `noham`, with the project's real
  anon key in place.

  `.env` is committed to this repository, so that key is in git history. It is
  designed to be public and RLS is what actually protects the data — but if you
  would rather it not be in the repo, add `.env` to `.gitignore` and set the
  three variables in your host's environment settings instead.

### Still to do

1. **Create the menu administrator.** Under **Authentication → Users**, add the
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

2. **Restart the dev server** — Vite only reads `.env` at startup.

### Checking the isolation yourself

Paste this into the `noham` SQL editor at any time. It impersonates each kind of
caller inside a transaction that is rolled back, so it changes nothing. Every
row should read `PASS`.

```sql
begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"11111111-1111-1111-1111-111111111111","role":"authenticated","app_metadata":{"app":"menu"}}';
select 'menu admin cannot see youths' as check,
       case when (select count(*) from public.youths) = 0 then 'PASS' else 'FAIL' end as result;
rollback;

begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"432a5cab-3cab-45db-8df5-32d77bace844","role":"authenticated","app_metadata":{"app":"noham"}}';
select 'noham user keeps youths' as check,
       case when (select count(*) from public.youths) > 0 then 'PASS' else 'FAIL' end as result;
select 'noham user is not menu admin' as check,
       case when public.is_admin() = false then 'PASS' else 'FAIL' end as result;
rollback;

-- A stale token issued before the claim was set: covered by the safety net.
begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"432a5cab-3cab-45db-8df5-32d77bace844","role":"authenticated","app_metadata":{"provider":"email"}}';
select 'pre-claim token still works' as check,
       case when (select count(*) from public.youths) > 0 then 'PASS' else 'FAIL' end as result;
rollback;

-- Any other account with no claim must reach nothing.
begin;
set local role authenticated;
set local request.jwt.claims =
  '{"sub":"99999999-9999-9999-9999-999999999999","role":"authenticated","app_metadata":{}}';
select 'unknown account is locked out' as check,
       case when (select count(*) from public.youths) = 0 and public.is_admin() = false
            then 'PASS' else 'FAIL' end as result;
rollback;
```

The last two are the cases that were still unverified when the tooling dropped
mid-session; run them once before treating the lockdown as fully proven.

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
menu file. The importer matches column headers loosely (Hebrew or English) and
detects vegan / vegetarian / gluten-free / spicy from keywords in the text.
Review the parsed preview before confirming the import.

### Casa Vina menu file — what to check

`casa_vina_menu_1.xlsx` parses to **79 dishes across 9 categories**: בוקר,
פתיחה וראשונות, דגים, פסטות, סלטים, מהטאבון, שתייה חמה, בירות בקבוק,
משקאות קלים.

Four things in that file need a human decision. None of them block the import.

1. **The milkshake price is a guess.** Row 82 carries `28` with the description
   *"המחיר לא הופיע בבירור בקובץ המקור - נא לוודא"*. That description is an
   internal note and **will be shown to customers** on the public menu — clear
   it once the real price is confirmed.

2. **Three drinks list two prices in an order that looks reversed.** The
   importer keeps the first number, so these would go live as the left-hand
   value:

   | Dish | Cell | Imported as |
   | --- | --- | --- |
   | אספרסו // כפול | `12 // 10` | ₪12 |
   | מקיאטו // כפול | `12 // 10` | ₪12 |
   | הפוך קטן // גדול | `16 // 14` | ₪16 |

   In each case the cheaper option is named first but priced second, so the
   single espresso would be sold at the double's price. Confirm the intended
   pairing before going live.

   `ארוחת בוקר` (`79 יחיד // 149 זוג`) is the same pattern but reads correctly
   at ₪79; only the couple's price is dropped, since `dishes.price` is a single
   numeric column.

3. **There is no English content.** The file has no `name_en` or
   `description_en` columns, so switching the menu to English gives English
   interface chrome with Hebrew dish names. The brand book specifies Oswald for
   English, so English is clearly intended — supply the two extra columns, or
   set `showLanguageSwitcher: false` in `src/config/brand.ts` until they exist.

4. **No dish photography yet.** `showImages` is `false`, so the photo-first
   layout renders as clean name/price/description rows separated by hairline
   rules. Flip it to `true` once images are uploaded and the layout becomes the
   intended photo-led design.

### Header-row detection

The file opens with a title row, an allergen disclaimer and a blank spacer
before the real header. The importer used to take the first non-empty row as
the header, which picked up the title and then failed to map any column. It now
scans for the first row that actually resolves both required columns
(`src/lib/menuColumns.ts`, covered by `src/test/menu-columns.test.ts`).

## 3. Brand the app

### Casa Vina specifics

- **Palette** — `#F1F1F0` off-white ground, `#424126` dark olive text,
  `#735b4b` brown for prices, the active category pill and the wordmark, and
  `#d3dbe0` pale blue-grey for inactive pills. Every pairing the UI actually
  uses was checked against WCAG AA at body size; the lowest is 5.58:1.
- **Type** — Hebrew in Heebo, English in Oswald uppercase, both from Google
  Fonts. Tracking follows the brand book's per-mille figures: `0.01em` for
  Heebo, `0.1em` for Oswald. The two faces are applied per language at runtime
  by `applyBrandLanguage()`.
- **The brand book's "Heebo at 90% width" is not applied.** CSS has no faithful
  equivalent: Heebo ships no width axis, and a `scaleX(0.9)` transform distorts
  the letterforms and breaks layout metrics. If the 90% condensing matters to
  the client, the honest fix is a genuinely condensed Hebrew face rather than a
  squashed Heebo.
- **The logo is not in the repo yet.** `logo` is `null`, so `BrandLogo` renders
  the wordmark in Prata — a high-contrast serif chosen to sit close to the real
  mark. Drop the PNG into `src/assets/casa-vina-logo.png` and set `logo` to the
  import to replace it.

### Every field

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
