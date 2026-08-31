import { brand } from "@/config/brand";
import type { Language } from "@/lib/i18n";
import { cn } from "@/lib/utils";

interface BrandLogoProps {
  lang: Language;
  size?: "sm" | "md" | "lg";
  className?: string;
}

const IMAGE_SIZE = {
  sm: "h-8",
  md: "h-10",
  lg: "h-12",
} as const;

const NAME_SIZE = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
} as const;

const TAGLINE_SIZE = {
  sm: "text-[9px]",
  md: "text-[10px]",
  lg: "text-[11px]",
} as const;

/**
 * The client's mark. Renders `brand.logo` when artwork exists, and otherwise a
 * typographic wordmark built from `brand.name` — so a new client's menu looks
 * finished before their logo file arrives, and swapping to the real logo is a
 * one-line change in the config.
 */
export function BrandLogo({ lang, size = "md", className }: BrandLogoProps) {
  const name = lang === "he" ? brand.name.he : brand.name.en;
  const tagline = brand.tagline ? (lang === "he" ? brand.tagline.he : brand.tagline.en) : null;

  if (brand.logo) {
    return (
      <img
        src={brand.logo}
        alt={name}
        className={cn(IMAGE_SIZE[size], "object-contain", className)}
      />
    );
  }

  return (
    <div className={cn("flex flex-col items-center leading-none", className)}>
      <span
        className={cn(NAME_SIZE[size], "font-extrabold tracking-[0.08em] text-foreground")}
        style={{ fontFamily: "var(--font-heading)", textTransform: "var(--font-heading-transform)" as never }}
      >
        {name}
      </span>
      {tagline && (
        <span
          className={cn(TAGLINE_SIZE[size], "mt-1 tracking-[0.2em] text-primary uppercase")}
        >
          {tagline}
        </span>
      )}
    </div>
  );
}
