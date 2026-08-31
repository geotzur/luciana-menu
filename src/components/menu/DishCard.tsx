import { useState, useCallback } from "react";
import { Language, t } from "@/lib/i18n";
import type { Dish } from "@/hooks/useMenu";
import { ChefHat } from "lucide-react";
import { brand } from "@/config/brand";
import { getDishBadges, type DishBadge } from "@/lib/dishBadges";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { cn } from "@/lib/utils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DishCardProps {
  dish: Dish;
  lang: Language;
  index?: number;
}

function BadgeRow({ badges, className }: { badges: DishBadge[]; className?: string }) {
  if (badges.length === 0) return null;
  return (
    <div className={cn("flex flex-wrap gap-1", className)}>
      {badges.map((b) => (
        <span
          key={b.label}
          className={cn(
            "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold",
            b.className
          )}
        >
          {b.icon && <b.icon className="w-3 h-3" />}
          {b.label}
        </span>
      ))}
    </div>
  );
}

/**
 * Dish name and price on one line, price aligned to the far edge.
 *
 * The price is nowrap and never shrinks -- a multi-option string like
 * "₪79 יחיד / ₪149 זוג" is 200px wide, which on a 360px phone left barely a
 * third of the row for the name and wrapped it mid-phrase. Giving the name a
 * 60% flex basis and letting the row wrap drops the price onto its own line
 * when it cannot sit comfortably beside the name, instead of crushing it.
 */
function TitleRow({
  name,
  price,
  nameClass,
  priceClass,
}: {
  name: string;
  price: string | null;
  nameClass: string;
  priceClass: string;
}) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
      <h3 className={cn("dish-title text-foreground min-w-0 flex-1 basis-[60%]", nameClass)}>{name}</h3>
      {price && (
        // ms-auto keeps the price on the far edge even when it wraps onto its
        // own line: justify-between would otherwise leave a lone item at the
        // line start, putting a wrapped price under the name on the opposite
        // side from every other dish's price.
        <span className={cn("shrink-0 whitespace-nowrap text-primary ms-auto", priceClass)}>
          {price}
        </span>
      )}
    </div>
  );
}

export function DishCard({ dish, lang, index = 0 }: DishCardProps) {
  const [open, setOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [dialogImgLoaded, setDialogImgLoaded] = useState(false);
  const onImgLoad = useCallback(() => setImgLoaded(true), []);

  const { showPrices, showImages, showChefNotes, enableDishDialog } = brand.features;
  const layout = brand.layout;

  const name = lang === "he" ? dish.name_he : dish.name_en || dish.name_he;
  const description = lang === "he" ? dish.description_he : dish.description_en || dish.description_he;
  const chefNote = showChefNotes ? dish.chef_note : null;
  const thumbnailUrl = showImages ? getProxiedImageUrl(dish.image_url, "thumbnail") : null;
  const fullImageUrl = showImages ? getProxiedImageUrl(dish.image_url, "full") : null;
  const badges = getDishBadges(dish, lang);

  // A dish sold in two sizes carries its own display string ("₪12 / ₪10");
  // everything else falls back to the single numeric price.
  const price = showPrices ? dish.price_text?.trim() || `${t(lang, "price")}${dish.price}` : null;
  const chefNoteLabel = lang === "he" ? "דבר השף" : "Chef's Note";
  const openDialog = () => enableDishDialog && setOpen(true);

  const image = thumbnailUrl && (
    <div
      className={cn(
        "relative overflow-hidden bg-muted",
        layout === "photo-first" ? "aspect-[4/3] rounded-lg" : "aspect-[16/10]"
      )}
    >
      {/* Shimmer skeleton shown while image loads */}
      {!imgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
      <img
        src={thumbnailUrl}
        alt={name}
        width={800}
        height={600}
        className={cn(
          "w-full h-full object-cover transition-opacity duration-500 ease-out",
          imgLoaded ? "opacity-100" : "opacity-0"
        )}
        loading={index < 4 ? "eager" : "lazy"}
        decoding="async"
        fetchPriority={index < 2 ? "high" : "auto"}
        onLoad={onImgLoad}
      />
      <BadgeRow badges={badges} className="absolute top-2 start-2" />
    </div>
  );

  let card: JSX.Element;

  if (layout === "photo-first") {
    // Large edge-to-edge photo, text beneath, no card chrome. Until photography
    // exists the photo is gone and consecutive dishes would run together, so
    // borrow the list layout's hairline rule; it disappears once images are on.
    card = (
      <article
        className={cn(
          "dish-card group",
          !showImages && "border-b border-border pb-5",
          enableDishDialog && "cursor-pointer"
        )}
        onClick={openDialog}
      >
        {image}
        {!thumbnailUrl && <BadgeRow badges={badges} className="mb-2" />}
        <div className="pt-3 space-y-1.5">
          <TitleRow name={name} price={price} nameClass="text-xl" priceClass="text-xl font-extrabold" />
          {description && (
            <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
          )}
          {chefNote && (
            <div className="flex items-center gap-1.5 text-primary/80 text-sm pt-0.5">
              <ChefHat className="w-4 h-4" />
              <span>{chefNoteLabel}</span>
            </div>
          )}
        </div>
      </article>
    );
  } else if (layout === "list") {
    // Text-only rows split by thin dividers.
    card = (
      <article
        className={cn(
          "dish-card group border-b border-border pb-4",
          enableDishDialog && "cursor-pointer"
        )}
        onClick={openDialog}
      >
        <TitleRow name={name} price={price} nameClass="text-lg" priceClass="text-lg font-bold" />
        {description && (
          <p className="text-muted-foreground text-base leading-relaxed mt-1">{description}</p>
        )}
        <BadgeRow badges={badges} className="mt-2" />
        {chefNote && (
          <div className="flex items-center gap-1.5 text-primary/80 text-sm mt-1.5">
            <ChefHat className="w-4 h-4" />
            <span>{chefNoteLabel}</span>
          </div>
        )}
      </article>
    );
  } else {
    // "grid" — boxed card, image on top.
    card = (
      <article
        className={cn(
          "dish-card group bg-card rounded-lg overflow-hidden border border-border",
          "hover:border-primary/30 transition-colors duration-300",
          enableDishDialog && "cursor-pointer"
        )}
        onClick={openDialog}
      >
        {image}
        {!thumbnailUrl && <BadgeRow badges={badges} className="px-4 pt-4" />}
        <div className="p-4 space-y-2">
          <TitleRow name={name} price={price} nameClass="text-2xl" priceClass="text-2xl font-bold" />
          {description && (
            <p className="text-muted-foreground text-lg leading-relaxed">{description}</p>
          )}
          {chefNote && (
            <div className="flex items-center gap-1.5 text-primary/70 text-base mt-1">
              <ChefHat className="w-4 h-4" />
              <span>{chefNoteLabel}</span>
            </div>
          )}
        </div>
      </article>
    );
  }

  if (!enableDishDialog) return card;

  return (
    <>
      {card}

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDialogImgLoaded(false); }}>
        <DialogContent dir={lang === "he" ? "rtl" : "ltr"} className="max-w-md">
          <DialogHeader>
            <DialogTitle className="dish-title">{name}</DialogTitle>
          </DialogHeader>
          {fullImageUrl && (
            <div className="relative w-full h-48 overflow-hidden rounded-lg bg-muted">
              {!dialogImgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
              <img
                src={fullImageUrl}
                alt={name}
                className={cn(
                  "w-full h-full object-cover transition-opacity duration-500 ease-out",
                  dialogImgLoaded ? "opacity-100" : "opacity-0"
                )}
                onLoad={() => setDialogImgLoaded(true)}
              />
            </div>
          )}
          <div className="space-y-3">
            {(price || badges.length > 0) && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                {price && <span className="text-primary font-bold text-2xl">{price}</span>}
                <BadgeRow badges={badges} />
              </div>
            )}
            {description && (
              <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
            )}
            {chefNote && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 text-primary font-medium text-base mb-1">
                  <ChefHat className="w-5 h-5" />
                  <span>{chefNoteLabel}</span>
                </div>
                <p className="text-foreground/80 text-base leading-relaxed">{chefNote}</p>
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
