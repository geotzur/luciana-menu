/**
 * Column and cell parsing for the admin Excel importer.
 *
 * Kept separate from the uploader component so these rules can be unit tested
 * against real client spreadsheets, which vary a lot in shape.
 */

export type SheetMatrix = (string | number | boolean | null)[][];

/** Lowercase, strip accents, and collapse separators so headers compare loosely. */
export function normalizeHeader(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[\s_/()-]+/g, " ")
    .trim();
}

/** Match a column by name against an already-normalized header row: exact, then prefix, then substring. */
export function findColumn(normalizedHeaders: string[], possibleNames: string[]): number {
  const normalizedNames = possibleNames.map(normalizeHeader);

  for (const name of normalizedNames) {
    const exact = normalizedHeaders.indexOf(name);
    if (exact !== -1) return exact;
  }
  for (const name of normalizedNames) {
    const prefix = normalizedHeaders.findIndex((h) => h.startsWith(name));
    if (prefix !== -1) return prefix;
  }
  for (const name of normalizedNames) {
    const contains = normalizedHeaders.findIndex((h) => h.includes(name));
    if (contains !== -1) return contains;
  }
  return -1;
}

/** The two columns an import cannot proceed without. */
export const CATEGORY_HEADERS = ["קטגוריה", "category"];
export const NAME_HE_HEADERS = [
  "שם המנה / משקה", "שם המנה", "שם משקה", "שם מנה", "שם",
  "name_he", "dish name", "name",
];

export function normalizeRow(row: SheetMatrix[number] | undefined): string[] {
  return (row ?? []).map((cell) => normalizeHeader(String(cell ?? "").trim()));
}

/**
 * Locate the header row.
 *
 * Menus routinely open with a restaurant name, an allergen disclaimer and a
 * blank spacer before the real header, so "the first non-empty row" is not a
 * safe guess -- it picks up the title and every column then fails to map.
 * Take the first row that actually resolves both required columns instead, and
 * fall back to the first non-empty row so an unrecognised file still surfaces
 * the more specific column-mapping error rather than this one.
 */
export function detectHeaderRow(matrix: SheetMatrix): number {
  const byRequiredColumns = matrix.findIndex((row) => {
    const normalized = normalizeRow(row);
    return (
      findColumn(normalized, CATEGORY_HEADERS) !== -1 &&
      findColumn(normalized, NAME_HE_HEADERS) !== -1
    );
  });
  if (byRequiredColumns !== -1) return byRequiredColumns;

  return matrix.findIndex((row) => row.some((cell) => String(cell ?? "").trim() !== ""));
}

/** Splits a price cell on the separators clients use for "this option // that option". */
function splitPriceOptions(raw: string): string[] {
  return raw
    .split(/\s*(?:\/\/|\||\/)\s*/)
    .map((part) => part.trim())
    .filter(Boolean);
}

/** The numeric price: the first number in the cell, ignoring currency symbols and words. */
export function parsePrice(raw: string): number {
  const [first = ""] = splitPriceOptions(String(raw ?? ""));
  return parseFloat(first.replace(/[^\d.]/g, "")) || 0;
}

/**
 * A display string for dishes sold in more than one size.
 *
 * "12 // 10" becomes "₪12 / ₪10", and "79 יחיד // 149 זוג" becomes
 * "₪79 יחיד / ₪149 זוג" -- the currency is prefixed only to parts that start
 * with a number, so descriptive words are left alone.
 *
 * Returns "" for an ordinary single price, which keeps `price_text` empty and
 * lets the numeric `price` column drive the UI as before.
 */
export function formatPriceOptions(raw: string, currency = "₪"): string {
  const parts = splitPriceOptions(String(raw ?? ""));
  if (parts.length < 2) return "";
  return parts.map((part) => (/^\d/.test(part) ? currency + part : part)).join(" / ");
}
