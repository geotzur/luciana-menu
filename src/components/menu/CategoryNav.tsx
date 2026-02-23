import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";
import { Language, t } from "@/lib/i18n";
import type { Category } from "@/hooks/useMenu";

interface CategoryNavProps {
  categories: Category[];
  activeCategory: string | null;
  onSelect: (id: string | null) => void;
  lang: Language;
}

export function CategoryNav({ categories, activeCategory, onSelect, lang }: CategoryNavProps) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const activeRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current;
      const el = activeRef.current;
      const left = el.offsetLeft - container.offsetWidth / 2 + el.offsetWidth / 2;
      container.scrollTo({ left, behavior: "smooth" });
    }
  }, [activeCategory]);

  return (
    <div className="sticky top-[57px] z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div
        ref={scrollRef}
        className="flex gap-2 overflow-x-auto px-4 py-3 scrollbar-hide"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          ref={activeCategory === null ? activeRef : undefined}
          onClick={() => onSelect(null)}
          className={cn(
            "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
            activeCategory === null
              ? "bg-primary text-primary-foreground"
              : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
          )}
        >
          {t(lang, "allDishes")}
        </button>
        {categories.map((cat) => (
          <button
            key={cat.id}
            ref={activeCategory === cat.id ? activeRef : undefined}
            onClick={() => onSelect(cat.id)}
            className={cn(
              "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition-all whitespace-nowrap",
              activeCategory === cat.id
                ? "bg-primary text-primary-foreground"
                : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
            )}
          >
            {lang === "he" ? cat.name_he : cat.name_en || cat.name_he}
          </button>
        ))}
      </div>
    </div>
  );
}
