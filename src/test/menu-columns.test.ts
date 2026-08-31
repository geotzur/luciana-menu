import { describe, it, expect } from "vitest";
import {
  CATEGORY_HEADERS,
  NAME_HE_HEADERS,
  detectHeaderRow,
  findColumn,
  formatPriceOptions,
  normalizeRow,
  parsePrice,
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

describe("price parsing", () => {
  it("reads a plain price", () => {
    expect(parsePrice("74")).toBe(74);
    expect(parsePrice("26.5")).toBe(26.5);
  });

  it("takes the first option as the numeric price", () => {
    expect(parsePrice("12 // 10")).toBe(12);
    expect(parsePrice("79 יחיד // 149 זוג")).toBe(79);
  });

  it("falls back to 0 for an unusable cell", () => {
    expect(parsePrice("")).toBe(0);
    expect(parsePrice("לפי משקל")).toBe(0);
  });
});

describe("formatPriceOptions", () => {
  it("returns empty for a single price, so the numeric column is used", () => {
    expect(formatPriceOptions("74")).toBe("");
    expect(formatPriceOptions("")).toBe("");
  });

  it("renders both options for a dish sold in two sizes", () => {
    // Espresso / double and cappuccino small / large: both prices must reach
    // the customer, not just the first.
    expect(formatPriceOptions("12 // 10")).toBe("₪12 / ₪10");
    expect(formatPriceOptions("16 // 14")).toBe("₪16 / ₪14");
  });

  it("keeps descriptive words and only prefixes the numbers", () => {
    expect(formatPriceOptions("79 יחיד // 149 זוג")).toBe("₪79 יחיד / ₪149 זוג");
  });

  it("accepts a single slash or pipe as the separator", () => {
    expect(formatPriceOptions("12 / 10")).toBe("₪12 / ₪10");
    expect(formatPriceOptions("12 | 10")).toBe("₪12 / ₪10");
  });
});
