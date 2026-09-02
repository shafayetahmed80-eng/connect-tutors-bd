import { eq, sql } from "drizzle-orm";
import type { MySql2Database } from "drizzle-orm/mysql2";
import { locations } from "../drizzle/schema";
import source from "./data/bangladesh-locations.json";

/**
 * Seeds the Bangladesh location catalog.
 *
 * This exists because **migrations cannot rebuild this table.** The rows were
 * laid down by `0003` and `0010`, corrected by `0014`, and then de-duplicated
 * by `scripts/cleanup-duplicate-locations.mjs` - a script run by hand, not a
 * migration. Replaying the migrations on an empty database produces neither
 * the right rows nor a usable tree: measured on a scratch database, it gives
 * 724 rows with 13 orphans, duplicate labels, and no country row at all, while
 * `db:migrate` alone gives 162 rows with two cities and no thanas.
 *
 * So the JSON beside this file is the source of truth, exported from the table
 * as it actually stands, and this seed makes any database match it. Run it
 * right after `db:migrate`, like the Tutor Profile catalog seed.
 *
 * Rows arrive parent-first, because `parentId` points at this same table and a
 * child inserted before its parent would have nothing to point at.
 */
export type LocationSeedSummary = {
  inserted: number;
  updated: number;
  ownerOwned: number;
  total: number;
};

type SuppliedLocation = {
  id: string;
  label: string;
  type: string;
  country: string;
  parentId: string | null;
};

const supplied = (source as { locations: SuppliedLocation[] }).locations;

export async function seedLocationCatalog(db: MySql2Database): Promise<LocationSeedSummary> {
  const existing = await db
    .select({ id: locations.id, origin: locations.origin })
    .from(locations);
  const before = new Map(existing.map(row => [row.id, row.origin]));

  let inserted = 0;
  let updated = 0;
  let ownerOwned = 0;

  for (const row of supplied) {
    const origin = before.get(row.id);
    if (origin === "admin") {
      // The Owner has edited this place from the Admin panel. Their label and
      // their hidden/shown choice outrank the shipped catalog, exactly as with
      // every other seeded list.
      ownerOwned += 1;
      continue;
    }
    if (origin === undefined) inserted += 1;
    else updated += 1;

    await db
      .insert(locations)
      .values({
        id: row.id,
        label: row.label,
        type: row.type as typeof locations.$inferInsert.type,
        country: row.country,
        parentId: row.parentId,
        enabled: 1,
        origin: "seed",
      })
      // Guarded the same way the option-catalog seed guards its upserts: a row
      // the Owner has since claimed keeps its own values.
      .onDuplicateKeyUpdate({
        set: {
          label: sql`IF(${locations.origin} = 'seed', VALUES(label), ${locations.label})`,
          type: sql`IF(${locations.origin} = 'seed', VALUES(type), ${locations.type})`,
          country: sql`IF(${locations.origin} = 'seed', VALUES(country), ${locations.country})`,
          parentId: sql`IF(${locations.origin} = 'seed', VALUES(parentId), ${locations.parentId})`,
          enabled: sql`IF(${locations.origin} = 'seed', VALUES(enabled), ${locations.enabled})`,
        },
      });
  }

  const [total] = await db.select({ count: sql<number>`count(*)` }).from(locations);

  return { inserted, updated, ownerOwned, total: Number(total?.count ?? 0) };
}

/**
 * Switches off places the catalog no longer lists - and never deletes one.
 *
 * `0003` laid down 35 rows that the catalog has since replaced with canonical
 * ones; on the real database a hand-run cleanup script removed them, but a
 * fresh deploy gets them back and they show up beside their replacements in
 * the Guardian's picker. Hiding them keeps the picker clean.
 *
 * Deleting is not an option: a Guardian profile or a published job may still
 * name one of these ids, and a hidden location keeps every existing selection
 * valid while dropping out of new forms. The sweep is scoped to `origin =
 * 'seed'`, because a row the Owner added is absent from the shipped plan by
 * definition and an unscoped sweep would switch off exactly their own work -
 * the mistake the Tutor Profile catalog seed had to be fixed for.
 */
export async function deactivateUnlistedLocations(db: MySql2Database) {
  const listed = new Set(supplied.map(row => row.id));
  const rows = await db
    .select({ id: locations.id, label: locations.label, origin: locations.origin, enabled: locations.enabled })
    .from(locations);
  const stale = rows.filter(row => !listed.has(row.id) && row.origin === "seed" && row.enabled === 1);

  for (const row of stale) {
    await db.update(locations).set({ enabled: 0 }).where(eq(locations.id, row.id));
  }
  return stale;
}

export { supplied as suppliedLocations };
