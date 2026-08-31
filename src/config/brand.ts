/**
 * Per-client branding configuration.
 *
 * Everything a single restaurant needs to look like itself lives in this file.
 * To spin up a new client: branch off, edit the `brand` object at the bottom,
 * drop a logo into src/assets, point .env at that client's Supabase project.
 *
 * This config is a starting point, not a cage — any component may be rewritten
 * on a client's own branch when a design needs something the options here don't
 * cover.
 */
import type { Language } from "@/lib/i18n";

/** Colours are HSL triplets without the `hsl()` wrapper, e.g. "36 60% 50%". */
export type Hsl = string;

/**
 * How the dish list is rendered.
 *  - "grid"        boxed cards, image on top, compact  (Luciana)
 *  - "photo-first" large full-width photos, text beneath, single column
 *  - "list"        no photos, name/price rows split by thin dividers
 */
export type MenuLayout = "grid" | "photo-first" | "list";

/** Logo centred with controls either side, or logo pinned to the start edge. */
export type HeaderStyle = "centered" | "left";

export interface BrandTheme {
  /**
   * Drives contrast-sensitive details that CSS variables can't express on their
   * own — dietary badge palettes and the high-contrast accessibility override.
   */
  mode: "light" | "dark";
  background: Hsl;
  foreground: Hsl;
  card: Hsl;
  cardForeground: Hsl;
  popover: Hsl;
  popoverForeground: Hsl;
  primary: Hsl;
  primaryForeground: Hsl;
  secondary: Hsl;
  secondaryForeground: Hsl;
  muted: Hsl;
  mutedForeground: Hsl;
  accent: Hsl;
  accentForeground: Hsl;
  border: Hsl;
  input: Hsl;
  ring: Hsl;
  /** Corner rounding for cards, inputs and buttons, e.g. "0.5rem". */
  radius: string;
}

export interface BrandFonts {
  /** CSS font-family stack for body copy. */
  body: string;
  /** CSS font-family stack for dish names and headings. */
  heading: string;
  /** Weight applied to headings — 800 reads as "bold sans", 600 as restrained. */
  headingWeight: number;
  /** Letter-spacing for headings, e.g. "0.02em". */
  headingTracking: string;
  /** Uppercase dish names and headings. */
  headingUppercase: boolean;
  /** Base body size in px. */
  baseSize: string;
  /**
   * Optional webfont stylesheet to load (Google Fonts etc). Leave undefined
   * when the fonts are self-hosted from /public/fonts.
   */
  stylesheetUrl?: string;
}

/**
 * Per-client visibility switches. Every one of these hides the element
 * everywhere it appears, including inside the dish detail dialog.
 */
export interface BrandFeatures {
  /** Dish prices on cards and in the detail dialog. */
  showPrices: boolean;
  /** Dish photography. Off turns any layout into a text-only menu. */
  showImages: boolean;
  /** Vegan / vegetarian / gluten-free / spicy / new badges. */
  showDietaryBadges: boolean;
  /** The search field above the dish list. */
  showSearch: boolean;
  /** The horizontal category filter strip. */
  showCategoryNav: boolean;
  /** The chef's note line on cards and its block in the dialog. */
  showChefNotes: boolean;
  /** The He/En globe toggle in the header. */
  showLanguageSwitcher: boolean;
  /** The accessibility dropdown (large text, high contrast). */
  showAccessibilityMenu: boolean;
  /** Tapping a dish opens a detail dialog. Off makes the menu read-only. */
  enableDishDialog: boolean;
}

export interface BrandConfig {
  /** Short slug, handy for debugging which build is deployed. */
  key: string;
  name: { he: string; en: string };
  tagline?: { he: string; en: string };
  /**
   * Imported logo image. When null the header renders a typographic wordmark
   * built from `name` + `tagline`, so the menu looks finished before the
   * client's artwork arrives.
   */
  logo: string | null;
  defaultLanguage: Language;
  layout: MenuLayout;
  headerStyle: HeaderStyle;
  theme: BrandTheme;
  fonts: BrandFonts;
  features: BrandFeatures;
  meta: { title: string; description: string };
}

// ---------------------------------------------------------------------------
// Active client
// ---------------------------------------------------------------------------

export const brand: BrandConfig = {
  key: "new-client",

  // TODO: replace with the client's real name once confirmed.
  name: { he: "המסעדה", en: "The Restaurant" },
  tagline: { he: "תפריט", en: "Menu" },

  // TODO: drop the client's logo into src/assets and import it here, e.g.
  //   import clientLogo from "@/assets/client-logo.png";
  //   logo: clientLogo,
  // Until then the header falls back to a typographic wordmark.
  logo: null,

  defaultLanguage: "he",

  // Big edge-to-edge dish photos, single column, text beneath the image.
  layout: "photo-first",
  headerStyle: "left",

  theme: {
    mode: "light",
    background: "40 20% 97%",
    foreground: "24 12% 12%",
    card: "0 0% 100%",
    cardForeground: "24 12% 12%",
    popover: "0 0% 100%",
    popoverForeground: "24 12% 12%",
    // Warm terracotta — appetising against food photography, and nothing
    // like Luciana's gold.
    primary: "12 72% 47%",
    primaryForeground: "0 0% 100%",
    secondary: "36 24% 92%",
    secondaryForeground: "24 12% 20%",
    muted: "36 20% 90%",
    mutedForeground: "24 8% 42%",
    accent: "12 60% 94%",
    accentForeground: "12 72% 38%",
    border: "36 16% 86%",
    input: "36 16% 86%",
    ring: "12 72% 47%",
    radius: "1rem",
  },

  fonts: {
    // Assistant is self-hosted from /public/fonts and covers Hebrew properly —
    // unlike Playfair Display, which has no Hebrew glyphs and silently falls
    // back mid-heading on the Luciana build.
    body: "'Assistant', system-ui, sans-serif",
    heading: "'Assistant', system-ui, sans-serif",
    headingWeight: 800,
    headingTracking: "-0.01em",
    headingUppercase: true,
    baseSize: "17px",
  },

  features: {
    showPrices: true,
    showImages: true,
    showDietaryBadges: true,
    showSearch: true,
    showCategoryNav: true,
    showChefNotes: true,
    showLanguageSwitcher: true,
    showAccessibilityMenu: true,
    enableDishDialog: true,
  },

  meta: {
    title: "תפריט",
    description: "התפריט שלנו",
  },
};
