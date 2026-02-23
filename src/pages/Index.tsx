import { useState } from "react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { DishCard } from "@/components/menu/DishCard";
import { useCategories, useDishes } from "@/hooks/useMenu";
import { Language, t } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const Index = () => {
  const [lang, setLang] = useState<Language>("he");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);

  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: dishes = [], isLoading: dishesLoading } = useDishes(activeCategory ?? undefined);

  const isRtl = lang === "he";

  return (
    <div
      dir={isRtl ? "rtl" : "ltr"}
      className={cn(
        "min-h-screen bg-background",
        isLargeText && "large-text",
        isHighContrast && "high-contrast"
      )}
    >
      <MenuHeader
        lang={lang}
        onLangChange={setLang}
        onToggleLargeText={() => setIsLargeText((p) => !p)}
        onToggleHighContrast={() => setIsHighContrast((p) => !p)}
        isLargeText={isLargeText}
        isHighContrast={isHighContrast}
      />

      {catsLoading ? (
        <div className="flex gap-2 px-4 py-3">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-9 w-24 rounded-full" />
          ))}
        </div>
      ) : (
        <CategoryNav
          categories={categories}
          activeCategory={activeCategory}
          onSelect={setActiveCategory}
          lang={lang}
        />
      )}

      <main className="px-4 py-6 pb-20 max-w-2xl mx-auto">
        {dishesLoading ? (
          <div className="grid gap-4">
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-64 rounded-xl" />
            ))}
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">{t(lang, "noResults")}</p>
            <p className="text-muted-foreground/60 text-sm mt-2">
              {lang === "he" ? "המנות יעלו בקרוב..." : "Dishes coming soon..."}
            </p>
          </div>
        ) : (
          <div className="grid gap-4">
            {dishes.map((dish) => (
              <DishCard key={dish.id} dish={dish} lang={lang} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
