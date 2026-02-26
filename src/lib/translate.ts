/**
 * Translates text from Hebrew to English using the free MyMemory API.
 * No API key required — 1 000 words / day on the free tier.
 *
 * Falls back gracefully: returns the original text on failure so the
 * admin can always hand-correct if needed.
 */
export async function translateHeToEn(text: string): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) return "";

  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(trimmed)}&langpair=he|en`;
    const res = await fetch(url);
    if (!res.ok) return trimmed;

    const json = await res.json();
    const translated: string = json?.responseData?.translatedText ?? trimmed;

    // MyMemory sometimes returns all-uppercase; title-case short strings
    if (translated === translated.toUpperCase() && translated.length < 80) {
      return translated
        .toLowerCase()
        .replace(/\b\w/g, (c) => c.toUpperCase());
    }

    return translated;
  } catch {
    return trimmed;
  }
}

/**
 * Dietary keyword detection — scans Hebrew (and English) text for
 * common food-related terms and returns which dietary flags apply.
 *
 * Returns only the flags it *detected*; the caller can merge them into
 * the form without accidentally clearing flags the user set manually.
 */
export function detectDietaryTags(text: string): {
  is_vegan?: boolean;
  is_vegetarian?: boolean;
  is_gluten_free?: boolean;
  is_spicy?: boolean;
} {
  const lower = text.toLowerCase();
  const result: ReturnType<typeof detectDietaryTags> = {};

  // Vegan (check before vegetarian — vegan is a subset)
  if (
    lower.includes("טבעוני") ||
    lower.includes("vegan") ||
    lower.includes("plant-based") ||
    lower.includes("צמחי")
  ) {
    result.is_vegan = true;
    result.is_vegetarian = true; // vegan implies vegetarian
  }

  // Vegetarian
  if (
    lower.includes("צמחוני") ||
    lower.includes("vegetarian") ||
    lower.includes("veggie")
  ) {
    result.is_vegetarian = true;
  }

  // Gluten-free
  if (
    lower.includes("ללא גלוטן") ||
    lower.includes("gluten free") ||
    lower.includes("gluten-free") ||
    lower.includes("gf") ||
    lower.includes("נטול גלוטן")
  ) {
    result.is_gluten_free = true;
  }

  // Spicy
  if (
    lower.includes("חריף") ||
    lower.includes("spicy") ||
    lower.includes("hot pepper") ||
    lower.includes("צ'ילי") ||
    lower.includes("chili") ||
    lower.includes("פיקנטי") ||
    lower.includes("דיאבלו") ||
    lower.includes("diavolo") ||
    lower.includes("arrabbiata") ||
    lower.includes("אראביאטה")
  ) {
    result.is_spicy = true;
  }

  return result;
}
