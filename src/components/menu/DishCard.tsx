import { Badge } from "@/components/ui/badge";
import { Language, t } from "@/lib/i18n";
import type { Dish } from "@/hooks/useMenu";
import { Leaf, WheatOff, Flame, Sprout } from "lucide-react";

interface DishCardProps {
  dish: Dish;
  lang: Language;
}

export function DishCard({ dish, lang }: DishCardProps) {
  const name = lang === "he" ? dish.name_he : dish.name_en || dish.name_he;
  const description = lang === "he" ? dish.description_he : dish.description_en || dish.description_he;

  const badges = [];
  if (dish.is_new) badges.push({ label: t(lang, "newDish"), icon: null, color: "bg-primary text-primary-foreground" });
  if (dish.is_vegan) badges.push({ label: t(lang, "vegan"), icon: Leaf, color: "bg-green-900/60 text-green-300" });
  if (dish.is_vegetarian) badges.push({ label: t(lang, "vegetarian"), icon: Sprout, color: "bg-emerald-900/60 text-emerald-300" });
  if (dish.is_gluten_free) badges.push({ label: t(lang, "glutenFree"), icon: WheatOff, color: "bg-amber-900/60 text-amber-300" });
  if (dish.is_spicy) badges.push({ label: t(lang, "spicy"), icon: Flame, color: "bg-red-900/60 text-red-300" });

  return (
    <div className="group bg-card rounded-xl overflow-hidden border border-border hover:border-primary/30 transition-all duration-300">
      {dish.image_url ? (
        <div className="relative aspect-[16/10] overflow-hidden">
          <img
            src={dish.image_url}
            alt={name}
            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
            loading="lazy"
          />
          {badges.length > 0 && (
            <div className="absolute top-2 start-2 flex flex-wrap gap-1">
              {badges.map((b) => (
                <span
                  key={b.label}
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.color}`}
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
                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold ${b.color}`}
              >
                {b.icon && <b.icon className="w-3 h-3" />}
                {b.label}
              </span>
            ))}
          </div>
        )
      )}

      <div className="p-4 space-y-1.5">
        <div className="flex items-start justify-between gap-3">
          <h3 className="font-semibold text-foreground leading-tight" style={{ fontFamily: "'Playfair Display', serif" }}>
            {name}
          </h3>
          <span className="shrink-0 text-primary font-bold text-lg">
            {t(lang, "price")}{dish.price}
          </span>
        </div>
        {description && (
          <p className="text-muted-foreground text-sm leading-relaxed">
            {description}
          </p>
        )}
      </div>
    </div>
  );
}
