import lucianaLogo from "@/assets/luciana-logo.png";
import { Globe, Accessibility } from "lucide-react";
import { Button } from "@/components/ui/button";
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
  return (
    <header className="sticky top-0 z-50 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="relative flex items-center justify-between px-4 py-3">
        <div className="w-10" />
        <img
          src={lucianaLogo}
          alt="Luciana Italian House"
          className="h-10 object-contain absolute left-1/2 -translate-x-1/2"
        />
        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onLangChange(lang === "he" ? "en" : "he")}
            className="text-muted-foreground hover:text-foreground"
            aria-label={t(lang, "language")}
          >
            <Globe className="h-5 w-5" />
          </Button>

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
        </div>
      </div>
    </header>
  );
}
