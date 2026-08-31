import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { MenuHeader } from "@/components/menu/MenuHeader";
import { CategoryNav } from "@/components/menu/CategoryNav";
import { DishCard } from "@/components/menu/DishCard";
import { useCategories, useDishes } from "@/hooks/useMenu";
import { Language, t } from "@/lib/i18n";
import { brand } from "@/config/brand";
import { applyBrandLanguage } from "@/lib/applyBrand";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { Search, X, AlertTriangle } from "lucide-react";

const BATCH_SIZE = 6;

const supabaseHost = (() => {
  try {
    return new URL(import.meta.env.VITE_SUPABASE_URL).host;
  } catch {
    return "VITE_SUPABASE_URL is not set";
  }
})();

const Index = () => {
  const [lang, setLang] = useState<Language>(brand.defaultLanguage);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [isLargeText, setIsLargeText] = useState(false);
  const [isHighContrast, setIsHighContrast] = useState(false);
  const [visibleCount, setVisibleCount] = useState(BATCH_SIZE);
  const [searchQuery, setSearchQuery] = useState("");

  const {
    data: categories = [],
    isLoading: catsLoading,
    error: catsError,
    refetch: refetchCategories,
  } = useCategories();
  // When searching, load all dishes (no category filter)
  const {
    data: rawDishes = [],
    isLoading: dishesLoading,
    error: dishesError,
    refetch: refetchDishes,
  } = useDishes(searchQuery ? undefined : (activeCategory ?? undefined));

  // A failed request and an empty database both leave these arrays empty, so
  // without this the "menu coming soon" screen hides genuine connection
  // failures -- a misconfigured deploy looks exactly like an unpopulated one.
  const loadError = catsError ?? dishesError;

  // Build a category name lookup for search matching
  const categoryNameMap = useMemo(() => {
    const map = new Map<string, { he: string; en: string }>();
    for (const cat of categories) {
      map.set(cat.id, { he: cat.name_he, en: cat.name_en || "" });
    }
    return map;
  }, [categories]);

  // Filter dishes by search query (client-side)
  const dishes = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return rawDishes;
    return rawDishes.filter((dish) => {
      const catNames = categoryNameMap.get(dish.category_id);
      const fields = [
        dish.name_he,
        dish.name_en,
        dish.description_he,
        dish.description_en,
        dish.chef_note,
        dish.chef_note_en,
        catNames?.he,
        catNames?.en,
      ];
      return fields.some((f) => f && f.toLowerCase().includes(q));
    });
  }, [rawDishes, searchQuery, categoryNameMap]);

  // Hebrew and English can be set in different faces with different tracking,
  // so the typography tokens follow the active language.
  useEffect(() => {
    applyBrandLanguage(lang);
  }, [lang]);

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

  // Photo-first cards are tall and unboxed, so they need more air than the
  // compact boxed grid; the text-only list needs the least. With images turned
  // off the tall photo is gone, so that generous gap would just read as a
  // sparse, unstructured page.
  const photoFirstWithImages = brand.layout === "photo-first" && brand.features.showImages;
  const gridGap = photoFirstWithImages ? "gap-10" : brand.layout === "list" ? "gap-4" : "gap-6";
  const skeletonHeight = photoFirstWithImages ? "h-80" : brand.layout === "grid" ? "h-64" : "h-24";

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

      {brand.features.showCategoryNav &&
        (catsLoading ? (
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
        ))}

      {/* Search bar */}
      {brand.features.showSearch && (
      <div className="px-4 pt-4 pb-1 max-w-2xl mx-auto">
        <div className="relative">
          <Search className="absolute start-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder={t(lang, "searchPlaceholder")}
            className="w-full bg-card border border-border rounded-lg ps-10 pe-10 py-2.5 text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary/50 focus:border-primary/50 transition-colors"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery("")}
              className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
              aria-label={t(lang, "clearSearch")}
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>
      )}

      <main className="px-4 py-6 pb-20 max-w-2xl mx-auto">
        {dishesLoading ? (
          <div className={cn("grid", gridGap)}>
            {[1, 2, 3].map((i) => (
              <Skeleton key={i} className={cn("rounded-lg", skeletonHeight)} />
            ))}
          </div>
        ) : loadError ? (
          <div className="text-center py-20">
            <AlertTriangle className="w-8 h-8 mx-auto text-destructive mb-3" />
            <p className="text-foreground text-lg font-semibold">{t(lang, "loadError")}</p>
            <p className="text-muted-foreground text-sm mt-2">{t(lang, "loadErrorHint")}</p>
            <p className="text-muted-foreground/70 text-xs mt-3 font-mono break-all" dir="ltr">
              {(loadError as Error).message}
            </p>
            <p className="text-muted-foreground/50 text-xs mt-1 font-mono break-all" dir="ltr">
              {supabaseHost}
            </p>
            <button
              onClick={() => { refetchCategories(); refetchDishes(); }}
              className="text-primary text-sm mt-4 hover:underline"
            >
              {t(lang, "retry")}
            </button>
          </div>
        ) : dishes.length === 0 ? (
          <div className="text-center py-20">
            <p className="text-muted-foreground text-lg">
              {searchQuery ? t(lang, "searchNoResults") : t(lang, "emptyMenu")}
            </p>
            {searchQuery ? (
              <button
                onClick={() => setSearchQuery("")}
                className="text-primary text-sm mt-2 hover:underline"
              >
                {t(lang, "clearSearch")}
              </button>
            ) : (
              <p className="text-muted-foreground/60 text-sm mt-2">
                {lang === "he" ? "המנות יעלו בקרוב..." : "Dishes coming soon..."}
              </p>
            )}
          </div>
        ) : (
          <div className={cn("grid", gridGap)}>
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
