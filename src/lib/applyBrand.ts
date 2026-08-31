/**
 * Pushes the active brand config into the DOM: theme colours become CSS
 * variables, fonts become variables consumed by index.css, and the document
 * title / meta description follow the client's name.
 *
 * Called once from main.tsx before React renders, so the first paint is
 * already the client's colours rather than a flash of someone else's.
 */
import { brand, type BrandConfig, type BrandFonts } from "@/config/brand";
import type { Language } from "@/lib/i18n";

const COLOR_VARS: Array<[keyof BrandConfig["theme"], string]> = [
  ["background", "--background"],
  ["foreground", "--foreground"],
  ["card", "--card"],
  ["cardForeground", "--card-foreground"],
  ["popover", "--popover"],
  ["popoverForeground", "--popover-foreground"],
  ["primary", "--primary"],
  ["primaryForeground", "--primary-foreground"],
  ["secondary", "--secondary"],
  ["secondaryForeground", "--secondary-foreground"],
  ["muted", "--muted"],
  ["mutedForeground", "--muted-foreground"],
  ["accent", "--accent"],
  ["accentForeground", "--accent-foreground"],
  ["border", "--border"],
  ["input", "--input"],
  ["ring", "--ring"],
];

export function applyBrand(config: BrandConfig = brand): void {
  const root = document.documentElement;
  const { theme, fonts, meta } = config;


  for (const [key, cssVar] of COLOR_VARS) {
    root.style.setProperty(cssVar, theme[key] as string);
  }
  root.style.setProperty("--radius", theme.radius);

  // The sidebar tokens are only used by the shadcn sidebar component, but
  // leaving them on a stale palette makes it unusable on a light build.
  root.style.setProperty("--sidebar-background", theme.card);
  root.style.setProperty("--sidebar-foreground", theme.cardForeground);
  root.style.setProperty("--sidebar-primary", theme.primary);
  root.style.setProperty("--sidebar-primary-foreground", theme.primaryForeground);
  root.style.setProperty("--sidebar-accent", theme.secondary);
  root.style.setProperty("--sidebar-accent-foreground", theme.secondaryForeground);
  root.style.setProperty("--sidebar-border", theme.border);
  root.style.setProperty("--sidebar-ring", theme.ring);

  root.style.setProperty("--brand-primary", theme.primary);
  root.style.setProperty("--brand-accent", theme.accent);

  applyBrandLanguage(config.defaultLanguage, config);

  // Lets CSS branch on light vs dark for things variables can't express,
  // such as the high-contrast accessibility override.
  root.dataset.themeMode = theme.mode;
  root.dataset.brand = config.key;

  if (fonts.stylesheetUrl && !document.querySelector(`link[data-brand-font]`)) {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = fonts.stylesheetUrl;
    link.dataset.brandFont = "true";
    document.head.appendChild(link);
  }

  // Only `lang` — setting `dir` here would cascade text-align into portaled
  // dialogs, which set their own direction per the active language.
  root.lang = config.defaultLanguage;

  document.title = meta.title;
  setMeta("name", "description", meta.description);
  setMeta("property", "og:title", meta.title);
  setMeta("property", "og:description", meta.description);
  setMeta("name", "twitter:title", meta.title);
  setMeta("name", "twitter:description", meta.description);
}

/**
 * Applies the typography tokens for one language.
 *
 * A bilingual menu can pair a Hebrew face with a different Latin one, each with
 * its own tracking and casing -- Casa Vina sets Hebrew in Heebo and English in
 * Oswald uppercase. Anything a language does not override falls back to the
 * config's base font settings.
 */
export function applyBrandLanguage(lang: Language, config: BrandConfig = brand): void {
  const base = config.fonts;
  const f: BrandFonts = { ...base, ...(base.byLanguage?.[lang] ?? {}) };
  const root = document.documentElement;

  root.style.setProperty("--font-body", f.body);
  root.style.setProperty("--font-heading", f.heading);
  root.style.setProperty("--font-heading-weight", String(f.headingWeight));
  root.style.setProperty("--font-heading-tracking", f.headingTracking);
  root.style.setProperty("--font-heading-transform", f.headingUppercase ? "uppercase" : "none");
  root.style.setProperty("--font-base-size", f.baseSize);
  root.style.setProperty("--font-wordmark", f.wordmark ?? f.heading);
}

function setMeta(attr: "name" | "property", key: string, value: string): void {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute("content", value);
}
