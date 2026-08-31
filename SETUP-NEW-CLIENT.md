# Setting up a new client

This branch is a per-client replica of the menu app. Everything client-specific
lives in **`src/config/brand.ts`** plus the Supabase credentials in `.env`.

## 1. Point the app at its own Supabase project

> **Status: not done yet.** `.env` on this branch still points at the original
> client's Supabase project, so the menu currently reads *their* data. Nothing
> below is destructive to that project — but until you finish this step, do not
> use `/admin` on this branch, or you will edit the other client's live menu.

1. Create a new project in the Supabase account you want to bill.
2. Open **SQL Editor** in the new project and run the three files in
   `supabase/migrations/` **in filename order**:
   - `20260223185059_*.sql` — `categories` + `dishes` tables, RLS policies,
     `updated_at` triggers, and the public `dish-images` storage bucket
   - `20260225102045_*.sql` — adds `dishes.chef_note`
   - `20260603000000_add_chef_note_en.sql` — adds `dishes.chef_note_en`
3. Under **Authentication → Users**, add the user who will log in at `/admin`.
   Note the RLS model: `public.is_admin()` returns true for *any* authenticated
   user, so every account you create in this project has full menu write access.
   Only create accounts for people who should be able to edit the menu.
4. Copy **Project URL**, **project ref** and the **anon / publishable key** from
   Project Settings → API into `.env`:

   ```
   VITE_SUPABASE_PROJECT_ID="your-new-project-ref"
   VITE_SUPABASE_PUBLISHABLE_KEY="your-new-anon-key"
   VITE_SUPABASE_URL="https://your-new-project-ref.supabase.co"
   ```

   `.env` is committed to this repository, so whatever you put here lands in git
   history. The anon key is designed to be public and RLS is what actually
   protects the data — but if you would rather it not be in the repo, add `.env`
   to `.gitignore` and set the three variables in your host's environment
   settings instead.

5. Restart the dev server — Vite only reads `.env` at startup.

### Edge functions (optional)

`supabase/functions/` holds `proxy-image` and `import-drive-images`, used only
by the "import images from Google Drive" button in the admin panel. Deploy them
to the new project with the Supabase CLI if the client needs that feature:

```sh
supabase functions deploy proxy-image --project-ref <new-project-ref>
supabase functions deploy import-drive-images --project-ref <new-project-ref>
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
