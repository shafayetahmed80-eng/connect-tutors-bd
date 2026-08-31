// Merges duplicate rows in the `locations` catalog.
//
//   node scripts/cleanup-duplicate-locations.mjs            # dry run — prints the plan, changes nothing
//   node scripts/cleanup-duplicate-locations.mjs --apply    # execute inside one transaction
//
// A duplicate group is a set of rows that a person would see as the same option:
//   - same (parentId, normalized label) — whether or not the `type` matches.
// One row per group is kept as canonical (most FK references, then more
// authoritative type Thana > Upazila > Sub-division > Area, then shortest id,
// then lowest id). Every reference to a non-canonical id is repointed to the
// canonical id, then the non-canonical row is deleted. Idempotent.

import fs from "node:fs";
import mysql from "mysql2/promise";

const APPLY = process.argv.includes("--apply");
const url = process.env.DATABASE_URL ?? fs.readFileSync(".env", "utf8").match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL is required.");

const TYPE_RANK = { country: 0, city: 1, division: 2, district: 3, thana: 4, upazila: 5, subdivision: 6, area: 7 };

/** [table, column] pairs that hold a `locations.id`. `parentId` (self-ref) handled last. */
const REFS = [
  ["guardian_profiles", "cityLocationId"],
  ["guardian_profiles", "locationId"],
  ["tutors", "locationId"],
  ["tutor_teaching_areas", "locationId"],
  ["tutor_requests", "tuitionCityLocationId"],
  ["tutor_requests", "tuitionLocationId"],
  ["tutor_jobs", "cityLocationId"],
  ["tutor_jobs", "locationId"],
];

const c = await mysql.createConnection({ uri: url, multipleStatements: false });

async function refCount(id) {
  let total = 0;
  for (const [table, column] of [...REFS, ["locations", "parentId"]]) {
    const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${table}\` WHERE \`${column}\` = ?`, [id]);
    total += n;
  }
  return total;
}

try {
  const [rows] = await c.query("SELECT id, label, type, parentId, enabled FROM locations");

  const groups = new Map();
  for (const row of rows) {
    const key = `${row.parentId ?? "∅"}::${row.label.normalize("NFKC").trim().toLocaleLowerCase()}`;
    (groups.get(key) ?? groups.set(key, []).get(key)).push(row);
  }

  const dupGroups = [...groups.values()].filter(g => g.length > 1);
  if (dupGroups.length === 0) {
    console.log("No duplicate location groups found. Nothing to do.");
    process.exit(0);
  }

  const refCache = new Map();
  const getRefs = async id => {
    if (!refCache.has(id)) refCache.set(id, await refCount(id));
    return refCache.get(id);
  };

  const plan = [];
  for (const group of dupGroups) {
    const scored = [];
    for (const row of group) scored.push({ row, refs: await getRefs(row.id) });
    scored.sort((a, b) =>
      b.refs - a.refs ||
      (TYPE_RANK[a.row.type] ?? 99) - (TYPE_RANK[b.row.type] ?? 99) ||
      a.row.id.length - b.row.id.length ||
      a.row.id.localeCompare(b.row.id),
    );
    const canonical = scored[0];
    const dupes = scored.slice(1);
    const enable = group.some(r => r.enabled === 1) ? 1 : canonical.row.enabled;
    plan.push({ canonical, dupes, enable, label: canonical.row.label, parentId: canonical.row.parentId ?? "∅" });
  }

  console.log(`${APPLY ? "APPLYING" : "DRY RUN"} — ${plan.length} duplicate groups, ${plan.reduce((n, p) => n + p.dupes.length, 0)} rows to remove.\n`);
  for (const p of plan) {
    console.log(`"${p.label}" @ ${p.parentId}`);
    console.log(`   keep  ${p.canonical.row.id}  [${p.canonical.row.type}] refs=${p.canonical.refs}`);
    for (const d of p.dupes) console.log(`   merge ${d.row.id}  [${d.row.type}] refs=${d.refs}`);
  }

  if (!APPLY) {
    console.log("\nRe-run with --apply to execute.");
    process.exit(0);
  }

  await c.beginTransaction();
  let repointed = 0;
  let deleted = 0;
  for (const p of plan) {
    const keepId = p.canonical.row.id;
    for (const d of p.dupes) {
      for (const [table, column] of REFS) {
        const [res] = await c.query(`UPDATE IGNORE \`${table}\` SET \`${column}\` = ? WHERE \`${column}\` = ?`, [keepId, d.row.id]);
        repointed += res.affectedRows;
      }
      // Any rows that could not move because (canonical) already existed on a composite key.
      await c.query("DELETE FROM tutor_teaching_areas WHERE locationId = ?", [d.row.id]);
      const [childRes] = await c.query("UPDATE locations SET parentId = ? WHERE parentId = ?", [keepId, d.row.id]);
      repointed += childRes.affectedRows;
      const [delRes] = await c.query("DELETE FROM locations WHERE id = ?", [d.row.id]);
      deleted += delRes.affectedRows;
    }
    await c.query("UPDATE locations SET enabled = ? WHERE id = ?", [p.enable, keepId]);
  }
  await c.commit();
  console.log(`\nDone. Repointed ${repointed} references, deleted ${deleted} duplicate location rows.`);
} catch (error) {
  if (APPLY) await c.rollback().catch(() => {});
  throw error;
} finally {
  await c.end();
}
