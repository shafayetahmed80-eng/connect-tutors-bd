// Read-only diagnostic for duplicate rows in the `locations` catalog.
//
//   DATABASE_URL=... node scripts/diagnose-duplicate-locations.mjs
//
// Reports groups of rows that a person would see as the same option:
//   - exact duplicates: same (parentId, type, normalized label)
//   - cross-type collisions: same (parentId, normalized label), different type
// Plus how many referencing rows each duplicate id carries, so a later merge
// migration knows which id to keep as canonical.

import fs from "node:fs";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL ?? fs.readFileSync(".env", "utf8").match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL is required.");

const NORM = "LOWER(TRIM(label))";

const REFERENCING = [
  ["guardian_profiles", "cityLocationId"],
  ["guardian_profiles", "locationId"],
  ["tutors", "locationId"],
  ["tutor_teaching_areas", "locationId"],
  ["tutor_requests", "tuitionCityLocationId"],
  ["tutor_requests", "tuitionLocationId"],
  ["tutor_jobs", "cityLocationId"],
  ["tutor_jobs", "locationId"],
  ["locations", "parentId"],
];

const c = await mysql.createConnection(url);
try {
  const [exact] = await c.query(
    `SELECT COALESCE(parentId, '∅') parentId, type, ${NORM} AS label, COUNT(*) n,
            GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') ids
       FROM locations
      GROUP BY parentId, type, ${NORM}
     HAVING COUNT(*) > 1
      ORDER BY n DESC, label`,
  );

  const [crossType] = await c.query(
    `SELECT COALESCE(parentId, '∅') parentId, ${NORM} AS label,
            COUNT(DISTINCT type) types, GROUP_CONCAT(DISTINCT type ORDER BY type) typeList,
            GROUP_CONCAT(id ORDER BY id SEPARATOR ', ') ids
       FROM locations
      GROUP BY parentId, ${NORM}
     HAVING COUNT(DISTINCT type) > 1
      ORDER BY label`,
  );

  console.log(`\n=== Exact duplicate groups (same parent + type + label): ${exact.length} ===`);
  for (const row of exact) console.log(`  [${row.type}] "${row.label}" under ${row.parentId} ×${row.n}  → ${row.ids}`);

  console.log(`\n=== Cross-type collisions (same parent + label, different type): ${crossType.length} ===`);
  for (const row of crossType) console.log(`  "${row.label}" under ${row.parentId}  types=${row.typeList}  → ${row.ids}`);

  const dupIds = [
    ...new Set(
      [...exact, ...crossType].flatMap(row => String(row.ids).split(", ").map(s => s.trim())).filter(Boolean),
    ),
  ];

  if (dupIds.length) {
    console.log(`\n=== Reference counts for the ${dupIds.length} ids involved ===`);
    for (const id of dupIds) {
      const counts = [];
      for (const [table, column] of REFERENCING) {
        const [[{ n }]] = await c.query(`SELECT COUNT(*) n FROM \`${table}\` WHERE \`${column}\` = ?`, [id]);
        if (n > 0) counts.push(`${table}.${column}=${n}`);
      }
      console.log(`  ${id}: ${counts.length ? counts.join("  ") : "(no references)"}`);
    }
  }

  const [[{ total }]] = await c.query("SELECT COUNT(*) total FROM locations");
  console.log(`\nlocations rows total: ${total}\n`);
} finally {
  await c.end();
}
