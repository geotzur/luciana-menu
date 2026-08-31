import { describe, it, expect } from "vitest";
import {
  CATEGORY_HEADERS,
  NAME_HE_HEADERS,
  detectHeaderRow,
  findColumn,
  normalizeRow,
} from "@/lib/menuColumns";

// The shape of the Casa Vina export: a title, an allergen disclaimer, a blank
// spacer, and only then the real header row.
const CASA_VINA = [
  ["CASA VINA — תפריט מלא", "", "", ""],
  ['המנות המוצעות עשויות להכיל אלרגנים מסוגים שונים | המחירים בש"ח', "", "", ""],
  ["", "", "", ""],
  ["קטגוריה", "שם המנה", "תיאור", "מחיר (₪)"],
  ["בוקר", "שקשוקה", "רוטב עגבניות ביתי", "74"],
];

describe("detectHeaderRow", () => {
  it("skips a title and disclaimer to find the real header row", () => {
    expect(detectHeaderRow(CASA_VINA)).toBe(3);
  });

  it("still finds a header row that is the very first row", () => {
    expect(detectHeaderRow([["קטגוריה", "שם המנה"], ["בוקר", "שקשוקה"]])).toBe(0);
  });

  it("falls back to the first non-empty row when no header is recognisable", () => {
    // Lets the caller report the more specific column-mapping error instead.
    expect(detectHeaderRow([["", ""], ["ערך", "אחר"]])).toBe(1);
  });

  it("returns -1 for an entirely empty sheet", () => {
    expect(detectHeaderRow([["", ""], ["", ""]])).toBe(-1);
  });
});

describe("column mapping on the detected row", () => {
  const headers = normalizeRow(CASA_VINA[detectHeaderRow(CASA_VINA)]);

  it("resolves both required columns", () => {
    expect(findColumn(headers, CATEGORY_HEADERS)).toBe(0);
    expect(findColumn(headers, NAME_HE_HEADERS)).toBe(1);
  });

  it("resolves price despite the currency suffix", () => {
    expect(findColumn(headers, ["מחיר (₪)", "מחיר", "price"])).toBe(3);
  });

  it("reports -1 for a column the sheet does not have", () => {
    expect(findColumn(headers, ["טבעוני", "vegan"])).toBe(-1);
  });

  it("does not mistake the title row for headers", () => {
    const titleRow = normalizeRow(CASA_VINA[0]);
    expect(findColumn(titleRow, CATEGORY_HEADERS)).toBe(-1);
    expect(findColumn(titleRow, NAME_HE_HEADERS)).toBe(-1);
  });
});
