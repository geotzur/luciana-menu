import { useState, useEffect, useRef, useCallback } from "react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { DishCard } from "@/components/menu/DishCard";
import { useCategories, useDishes } from "@/hooks/useMenu";
import { Language, t } from "@/lib/i18n";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";

const BATCH_SIZE = 6;

const Index = () => {
  const [lang, setLang] = useState<Language>("he");
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);

  const { data: categories = [], isLoading: catsLoading } = useCategories();
  const { data: dishes = [], isLoading: dishesLoading } = useDishes(activeCategory ?? undefined);

  // Reset visible count when category changes or new dishes load
  useEffect(() => {
    setVisibleCount(BATCH_SIZE);
  }, [activeCategory, dishes]);

  // Intersection observer sentinel — loads more dishes when scrolled into view
  const sentinelRef = useRef<HTMLDivElement>(null);
  const loadMore = useCallback(() => {
    setVisibleCount((prev) => Math.min(prev + BATCH_SIZE, dishes.length));
  }, [dishes.length]);

  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMore();
      },
      { rootMargin: "400px" } // start loading 400px before reaching the end
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore, dishesLoading]);

  const visibleDishes = dishes.slice(0, visibleCount);
  const hasMore = visibleCount < dishes.length;
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
            {visibleDishes.map((dish, i) => (
              <DishCard key={dish.id} dish={dish} lang={lang} index={i} />
            ))}

            {/* Sentinel: triggers loading more dishes when scrolled near */}
            {hasMore && (
              <div ref={sentinelRef} className="flex justify-center py-4">
                <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
};

export default Index;
