/**
 * Column resolution for the admin Excel importer.
 *
 * Kept separate from the uploader component so the header-matching rules can be
 * unit tested against real client spreadsheets, which vary a lot in shape.
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
