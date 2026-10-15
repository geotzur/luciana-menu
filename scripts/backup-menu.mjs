/**
 * Snapshots the live menu into the repository.
 *
 * Writes backups/menu-latest.json and mirrors every dish photo into
 * backups/dish-images/. Git history provides the versioning, so a bad edit or a
 * deleted project can be recovered from any past commit.
 *
 * Reads with the anon key: `categories` and `dishes` are publicly readable by
 * design, and the dish-images bucket is public, so no privileged credential
 * ever goes near CI.
 *
 *   SUPABASE_URL=... SUPABASE_ANON_KEY=... node scripts/backup-menu.mjs
 */
import { mkdir, readFile, writeFile, readdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";

const URL_BASE = process.env.SUPABASE_URL?.replace(/\/+$/, "");
const KEY = process.env.SUPABASE_ANON_KEY;
if (!URL_BASE || !KEY) {
  console.error("SUPABASE_URL and SUPABASE_ANON_KEY must both be set");
  process.exit(1);
}

const OUT_JSON = "backups/menu-latest.json";
const OUT_IMAGES = "backups/dish-images";

async function fetchTable(table) {
  const res = await fetch(`${URL_BASE}/rest/v1/${table}?select=*`, {
    headers: { apikey: KEY, Authorization: `Bearer ${KEY}` },
  });
  if (!res.ok) throw new Error(`${table}: HTTP ${res.status} ${await res.text()}`);
  return res.json();
}

const [categories, dishes] = await Promise.all([fetchTable("categories"), fetchTable("dishes")]);
console.log(`fetched ${categories.length} categories, ${dishes.length} dishes`);

/*
 * Refuse to overwrite a good snapshot with a materially smaller one. A revoked
 * key, a half-finished import or an empty project would otherwise replace the
 * backup with nothing -- precisely when it is needed most. Set
 * ALLOW_SHRINK=true for a deliberate large deletion.
 */
if (existsSync(OUT_JSON) && process.env.ALLOW_SHRINK !== "true") {
  const prev = JSON.parse(await readFile(OUT_JSON, "utf8"));
  const prevDishes = prev.dishes?.length ?? 0;
  if (dishes.length < prevDishes * 0.9) {
    console.error(
      `refusing to shrink the backup: ${prevDishes} dishes previously, ${dishes.length} now. ` +
      `Re-run with ALLOW_SHRINK=true if this is intentional.`
    );
    process.exit(1);
  }
}

await mkdir("backups", { recursive: true });
await writeFile(
  OUT_JSON,
  JSON.stringify(
    {
      taken_at: new Date().toISOString(),
      source: URL_BASE,
      cats: categories.sort((a, b) => a.display_order - b.display_order),
      dishes: dishes.sort((a, b) => a.display_order - b.display_order),
    },
    null,
    1
  ) + "\n",
  "utf8"
);
console.log(`wrote ${OUT_JSON}`);

// Photos are the part that cannot be reconstructed from anything else.
await mkdir(OUT_IMAGES, { recursive: true });
const have = new Set(existsSync(OUT_IMAGES) ? await readdir(OUT_IMAGES) : []);
let added = 0, failed = 0, foreign = 0;

for (const dish of dishes) {
  const url = (dish.image_url || "").trim();
  if (!url || !url.startsWith("http")) continue;
  // Links into another (e.g. deleted) Supabase project can never be fetched;
  // count them instead of letting them mask whether this project's photos work.
  if (url.includes(".supabase.co/") && !url.startsWith(URL_BASE + "/")) { foreign++; continue; }
  const name = decodeURIComponent(url.split("?")[0].split("/").pop() || "");
  if (!name || have.has(name)) continue;
  try {
    const res = await fetch(url);
    if (!res.ok) { console.warn(`  ${name}: HTTP ${res.status}`); failed++; continue; }
    await writeFile(path.join(OUT_IMAGES, name), Buffer.from(await res.arrayBuffer()));
    have.add(name);
    added++;
  } catch (err) {
    console.warn(`  ${name}: ${err.message}`);
    failed++;
  }
}
console.log(`photos: ${added} new, ${have.size} held in total, ${failed} failed, ${foreign} skipped (other project)`);
if (failed > 0 && added === 0 && have.size === 0) {
  console.error("every photo download failed — not treating this as a usable backup");
  process.exit(1);
}
