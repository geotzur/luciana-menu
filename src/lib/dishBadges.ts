import { Leaf, WheatOff, Flame, Sprout, type LucideIcon } from "lucide-react";
import { brand } from "@/config/brand";
import { Language, t } from "@/lib/i18n";
import type { Dish } from "@/hooks/useMenu";

export interface DishBadge {
  label: string;
  icon: LucideIcon | null;
  className: string;
}

/**
 * Badge palettes have to follow the theme's mode: the deep 900/60 tints read
 * well on Luciana's near-black background but turn muddy on a light build.
 */
const PALETTE = {
  dark: {
    new: "bg-primary text-primary-foreground",
    vegan: "bg-green-900/60 text-green-300",
    vegetarian: "bg-emerald-900/60 text-emerald-300",
    glutenFree: "bg-amber-900/60 text-amber-300",
    spicy: "bg-red-900/60 text-red-300",
  },
  light: {
    new: "bg-primary text-primary-foreground",
    vegan: "bg-green-100 text-green-800",
    vegetarian: "bg-emerald-100 text-emerald-800",
    glutenFree: "bg-amber-100 text-amber-900",
    spicy: "bg-red-100 text-red-800",
  },
} as const;

/**
 * Returns the dietary badges for a dish, or an empty list when the client has
 * badges switched off in their brand config.
 */
export function getDishBadges(dish: Dish, lang: Language): DishBadge[] {
  if (!brand.features.showDietaryBadges) return [];

  const c = PALETTE[brand.theme.mode];
  const badges: DishBadge[] = [];

  if (dish.is_new) badges.push({ label: t(lang, "newDish"), icon: null, className: c.new });
  if (dish.is_vegan) badges.push({ label: t(lang, "vegan"), icon: Leaf, className: c.vegan });
  if (dish.is_vegetarian) badges.push({ label: t(lang, "vegetarian"), icon: Sprout, className: c.vegetarian });
  if (dish.is_gluten_free) badges.push({ label: t(lang, "glutenFree"), icon: WheatOff, className: c.glutenFree });
  if (dish.is_spicy) badges.push({ label: t(lang, "spicy"), icon: Flame, className: c.spicy });

  return badges;
}
