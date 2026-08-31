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
  /**
   * Face used for the typographic wordmark when no logo image is configured.
   * Defaults to `heading` when unset.
   */
  wordmark?: string;
  /**
   * Per-language typography. A bilingual menu often pairs a Hebrew face with a
   * different Latin one, each with its own tracking and casing. Whatever a
   * language omits falls back to the values above.
   */
  byLanguage?: Partial<Record<Language, Partial<Omit<BrandFonts, "byLanguage" | "stylesheetUrl">>>>;
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
  key: "casa-vina",

  name: { he: "CASA VINA", en: "CASA VINA" },
  tagline: { he: "תפריט", en: "MENU" },

  // TODO: drop the supplied logo PNG into src/assets and import it here:
  //   import casaVinaLogo from "@/assets/casa-vina-logo.png";
  //   logo: casaVinaLogo,
  // Until then BrandLogo renders the wordmark in Prata, which closely matches
  // the high-contrast serif of the real mark.
  logo: null,

  defaultLanguage: "he",

  layout: "photo-first",
  headerStyle: "left",

  // Brand palette, verified for WCAG AA at body size on every pairing used:
  //   #F1F1F0 off-white   #d3dbe0 pale blue-grey
  //   #735b4b brown       #424126 dark olive
  theme: {
    mode: "light",
    background: "60 3% 94%",        // #F1F1F0
    foreground: "58 27% 20%",       // #424126
    card: "0 0% 100%",
    cardForeground: "58 27% 20%",
    popover: "0 0% 100%",
    popoverForeground: "58 27% 20%",
    primary: "24 21% 37%",          // #735b4b, the logo brown
    primaryForeground: "60 3% 96%",
    secondary: "203 17% 85%",       // #d3dbe0
    secondaryForeground: "58 27% 20%",
    muted: "60 4% 90%",
    mutedForeground: "58 12% 34%",
    accent: "203 17% 90%",
    accentForeground: "24 21% 32%",
    border: "60 5% 86%",
    input: "60 5% 86%",
    ring: "24 21% 37%",
    radius: "0.5rem",
  },

  // Brand spec: Hebrew set in Heebo, English in Oswald uppercase.
  // Tracking is given in the brand book as per-mille of the em (the Illustrator
  // convention), so 10 -> 0.01em for Heebo and 100 -> 0.1em for Oswald.
  //
  // The book also asks for Heebo at 90% horizontal width. CSS has no faithful
  // equivalent -- Heebo ships no width axis, and a scaleX() transform distorts
  // the letterforms and breaks layout metrics -- so it is deliberately not
  // applied. See SETUP-NEW-CLIENT.md.
  fonts: {
    body: "'Heebo', system-ui, sans-serif",
    heading: "'Heebo', system-ui, sans-serif",
    headingWeight: 700,
    headingTracking: "0.01em",
    headingUppercase: false,
    baseSize: "17px",
    wordmark: "'Prata', Georgia, serif",
    stylesheetUrl:
      "https://fonts.googleapis.com/css2?family=Heebo:wght@300;400;500;700;800&family=Oswald:wght@300;400;500;600&family=Prata&display=swap",
    byLanguage: {
      en: {
        body: "'Oswald', system-ui, sans-serif",
        heading: "'Oswald', system-ui, sans-serif",
        headingWeight: 500,
        headingTracking: "0.1em",
        headingUppercase: true,
      },
    },
  },

  features: {
    showPrices: true,
    // No dish photography supplied yet. The photo-first layout degrades to
    // clean name/price/description blocks until this is switched back on.
    showImages: false,
    showDietaryBadges: true,
    showSearch: true,
    showCategoryNav: true,
    showChefNotes: true,
    showLanguageSwitcher: true,
    showAccessibilityMenu: true,
    enableDishDialog: true,
  },

  meta: {
    title: "CASA VINA | תפריט",
    description: "התפריט של CASA VINA",
  },
};
