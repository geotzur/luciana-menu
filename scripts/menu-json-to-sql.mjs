/**
 * Turns a backup snapshot into a restore script.
 *
 *   node scripts/menu-json-to-sql.mjs backups/menu-latest.json > restore.sql
 *
 * Original ids are preserved so dishes keep their categories. The output runs
 * in a transaction and aborts if a menu is already present, so it cannot
 * duplicate one by accident.
 */
import { readFile } from "node:fs/promises";

const file = process.argv[2];
if (!file) {
  console.error("usage: node scripts/menu-json-to-sql.mjs <snapshot.json>");
  process.exit(1);
}
const { cats, dishes, taken_at, source } = JSON.parse(await readFile(file, "utf8"));

const q = (v) => {
  if (v === null || v === undefined) return "null";
  if (typeof v === "boolean") return v ? "true" : "false";
  if (typeof v === "number") return String(v);
  return `'${String(v).replace(/'/g, "''")}'`;
};

const DISH_COLS = [
  "id", "category_id", "name_he", "name_en", "description_he", "description_en",
  "price", "price_text", "available_until", "image_url", "is_available", "is_vegan",
  "is_vegetarian", "is_gluten_free", "is_spicy", "is_new", "chef_note", "chef_note_en",
  "display_order",
];

const out = [];
out.push(`-- Casa Vina menu restore`);
out.push(`-- Snapshot taken ${taken_at ?? "unknown"}${source ? ` from ${source}` : ""}.`);
out.push(`-- Apply supabase/migrations/ first. Run before any Excel import, which`);
out.push(`-- deletes every category and dish.\n`);
out.push("begin;\n");
out.push(`do $$
begin
  if (select count(*) from public.categories) > 0
     or (select count(*) from public.dishes) > 0 then
    raise exception 'categories/dishes are not empty — clear them first or restore into a fresh project';
  end if;
end $$;\n`);

out.push(`-- Categories (${cats.length})`);
for (const c of cats) {
  out.push(
    `insert into public.categories (id, name_he, name_en, display_order) values ` +
    `(${q(c.id)}, ${q(c.name_he)}, ${q(c.name_en ?? "")}, ${q(c.display_order)});`
  );
}
out.push(`\n-- Dishes (${dishes.length})`);
for (const d of dishes) {
  out.push(
    `insert into public.dishes (${DISH_COLS.join(", ")}) values ` +
    `(${DISH_COLS.map((c) => q(d[c])).join(", ")});`
  );
}
out.push("\ncommit;");

const withPhotos = dishes.filter((d) => (d.image_url || "").trim()).length;
out.push(`
-- ${withPhotos} dishes carry a photo URL pointing at the project this snapshot
-- came from. After re-uploading the images in backups/dish-images/ to the new
-- project's dish-images bucket under the same file names:
--
--   update public.dishes
--   set image_url = replace(image_url, '<old-project-ref>', '<new-project-ref>')
--   where image_url like '%<old-project-ref>%';`);

console.log(out.join("\n"));
