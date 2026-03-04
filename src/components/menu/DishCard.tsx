import { useState, useCallback } from "react";
import { Language, t } from "@/lib/i18n";
import type { Dish } from "@/hooks/useMenu";
import { Leaf, WheatOff, Flame, Sprout, ChefHat } from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

interface DishCardProps {
  dish: Dish;
  lang: Language;
  index?: number;
}

export function DishCard({ dish, lang, index = 0 }: DishCardProps) {
  const [open, setOpen] = useState(false);
  const [imgLoaded, setImgLoaded] = useState(false);
  const [dialogImgLoaded, setDialogImgLoaded] = useState(false);
  const onImgLoad = useCallback(() => setImgLoaded(true), []);
  const name = lang === "he" ? dish.name_he : dish.name_en || dish.name_he;
  const description = lang === "he" ? dish.description_he : dish.description_en || dish.description_he;
  const chefNote = (dish as any).chef_note;
  const thumbnailUrl = getProxiedImageUrl(dish.image_url, 'thumbnail');
  const fullImageUrl = getProxiedImageUrl(dish.image_url, 'full');

  const badges = [];
  if (dish.is_new) badges.push({ label: t(lang, "newDish"), icon: null, color: "bg-primary text-primary-foreground" });
  if (dish.is_vegan) badges.push({ label: t(lang, "vegan"), icon: Leaf, color: "bg-green-900/60 text-green-300" });
  if (dish.is_vegetarian) badges.push({ label: t(lang, "vegetarian"), icon: Sprout, color: "bg-emerald-900/60 text-emerald-300" });
  if (dish.is_gluten_free) badges.push({ label: t(lang, "glutenFree"), icon: WheatOff, color: "bg-amber-900/60 text-amber-300" });
  if (dish.is_spicy) badges.push({ label: t(lang, "spicy"), icon: Flame, color: "bg-red-900/60 text-red-300" });

  return (
    <>
      <div
        className="dish-card group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-colors duration-300 cursor-pointer"
        onClick={() => setOpen(true)}
      >
        {thumbnailUrl ? (
          <div className="relative aspect-[16/10] overflow-hidden bg-muted">
            {/* Shimmer skeleton shown while image loads */}
            {!imgLoaded && (
              <div className="absolute inset-0 skeleton-shimmer" />
            )}
            <img
              src={thumbnailUrl}
              alt={name}
              width={400}
              height={250}
              className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${imgLoaded ? "opacity-100" : "opacity-0"}`}
              loading={index < 4 ? "eager" : "lazy"}
              decoding="async"
              fetchPriority={index < 2 ? "high" : "auto"}
              onLoad={onImgLoad}
            />
            {badges.length > 0 && (
              <div className="absolute top-2 start-2 flex flex-wrap gap-1">
                {badges.map((b) => (
                  <span
                    key={b.label}
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}
                  >
                    {b.icon && <b.icon className="w-3 h-3" />}
                    {b.label}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          badges.length > 0 && (
            <div className="flex flex-wrap gap-1 px-4 pt-4">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}
                >
                  {b.icon && <b.icon className="w-3 h-3" />}
                  {b.label}
                </span>
              ))}
            </div>
          )
        )}

        <div className="p-4 space-y-2">
          <div className="flex items-start justify-between gap-3">
            <h3 className="font-bold text-2xl text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
              {name}
            </h3>
            <span className="shrink-0 text-primary font-bold text-2xl">
              {t(lang, "price")}{dish.price}
            </span>
          </div>
          {description && (
            <p className="text-muted-foreground text-lg leading-relaxed">
              {description}
            </p>
          )}
          {chefNote && (
            <div className="flex items-center gap-1.5 text-primary/70 text-base mt-1">
              <ChefHat className="w-4 h-4" />
              <span>{lang === "he" ? "דבר השף" : "Chef's Note"}</span>
            </div>
          )}
        </div>
      </div>

      <Dialog open={open} onOpenChange={(v) => { setOpen(v); if (!v) setDialogImgLoaded(false); }}>
        <DialogContent dir={lang === "he" ? "rtl" : "ltr"} className="max-w-md">
          <DialogHeader>
            <DialogTitle style={{ fontFamily: "'Playfair Display', serif" }}>{name}</DialogTitle>
          </DialogHeader>
          {fullImageUrl && (
            <div className="relative w-full h-48 overflow-hidden rounded-lg bg-muted">
              {!dialogImgLoaded && <div className="absolute inset-0 skeleton-shimmer" />}
              <img
                src={fullImageUrl}
                alt={name}
                className={`w-full h-full object-cover transition-opacity duration-500 ease-out ${dialogImgLoaded ? "opacity-100" : "opacity-0"}`}
                onLoad={() => setDialogImgLoaded(true)}
              />
            </div>
          )}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-primary font-bold text-2xl">{t(lang, "price")}{dish.price}</span>
              {badges.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {badges.map((b) => (
                    <span key={b.label} className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-semibold ${b.color}`}>
                      {b.icon && <b.icon className="w-3 h-3" />}
                      {b.label}
                    </span>
                  ))}
                </div>
              )}
            </div>
            {description && (
              <p className="text-muted-foreground text-base leading-relaxed">{description}</p>
            )}
            {chefNote && (
              <div className="bg-muted/50 rounded-lg p-3 border border-border">
                <div className="flex items-center gap-2 text-primary font-medium text-base mb-1">
                  <ChefHat className="w-5 h-5" />
                  <span>{lang === "he" ? "דבר השף" : "Chef's Note"}</span>
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
