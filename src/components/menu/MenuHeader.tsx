import { Globe, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { brand } from "@/config/brand";
import { Language, t } from "@/lib/i18n";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface MenuHeaderProps {
  lang: Language;
  onLangChange: (lang: Language) => void;
  onToggleLargeText: () => void;
  onToggleHighContrast: () => void;
  isLargeText: boolean;
  isHighContrast: boolean;
}

export function MenuHeader({
  lang,
  onLangChange,
  onToggleLargeText,
  onToggleHighContrast,
  isLargeText,
  isHighContrast,
}: MenuHeaderProps) {
  const { showLanguageSwitcher, showAccessibilityMenu } = brand.features;
  const isCentered = brand.headerStyle === "centered";

  const controls = (
    <div className="flex items-center gap-1">
      {showLanguageSwitcher && (
        <Button
          variant="ghost"
          size="icon"
          onClick={() => onLangChange(lang === "he" ? "en" : "he")}
          className="text-muted-foreground hover:text-foreground"
          aria-label={t(lang, "language")}
        >
          <Globe className="h-5 w-5" />
        </Button>
      )}

      {showAccessibilityMenu && (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="text-muted-foreground hover:text-foreground"
              aria-label={t(lang, "accessibility")}
            >
              <Accessibility className="h-5 w-5" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align={lang === "he" ? "start" : "end"}>
            <DropdownMenuItem onClick={onToggleLargeText}>
              {isLargeText ? "✓ " : ""}{t(lang, "largeText")}
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onToggleHighContrast}>
              {isHighContrast ? "✓ " : ""}{t(lang, "highContrast")}
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      )}
    </div>
  );

  return (
    // Fixed 56px + 1px border: CategoryNav sticks directly beneath at top-[57px].
    <header className="sticky top-0 z-50 h-14 bg-background/95 backdrop-blur border-b border-border">
      <div className="relative flex h-full items-center justify-between px-4">
        {isCentered ? (
          <>
            <div className="w-10" />
            <BrandLogo lang={lang} size="md" className="absolute left-1/2 -translate-x-1/2" />
          </>
        ) : (
          <BrandLogo lang={lang} size="md" className="items-start" />
        )}
        {controls}
      </div>
    </header>
  );
}
