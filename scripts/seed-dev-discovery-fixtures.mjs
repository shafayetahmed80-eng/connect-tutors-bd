// Seeds the minimum public-discovery data the server discovery tests expect:
// a `country` location and a couple of approved, verified tutors. Idempotent.
//
//   DATABASE_URL=... node scripts/seed-dev-discovery-fixtures.mjs
//
// Intended for local / CI databases that only have the base catalog loaded.

import fs from "node:fs";
import mysql from "mysql2/promise";

const url = process.env.DATABASE_URL ?? fs.readFileSync(".env", "utf8").match(/DATABASE_URL=(.*)/)?.[1]?.trim();
if (!url) throw new Error("DATABASE_URL is required.");

const c = await mysql.createConnection(url);
try {
  await c.query(
    `INSERT INTO locations (id, label, type, country, parentId, enabled)
     VALUES ('bd', 'Bangladesh', 'country', 'Bangladesh', NULL, 1)
     ON DUPLICATE KEY UPDATE label = VALUES(label), type = VALUES(type), country = VALUES(country), enabled = VALUES(enabled)`,
  );

  const [[city]] = await c.query("SELECT id FROM locations WHERE type = 'city' ORDER BY id LIMIT 1");
  if (!city) throw new Error("No city location found — load the location catalog first (0010_bangladesh_location_hierarchy.sql).");

  const tutors = [
    { id: "dev-tutor-amina", name: "Amina Rahman", gender: "female", subjects: ["Mathematics", "Physics"], levels: ["Class 9-10", "SSC"], languages: ["Bangla", "English"] },
    { id: "dev-tutor-rakib", name: "Rakib Hasan", gender: "male", subjects: ["Chemistry", "Biology"], levels: ["HSC"], languages: ["Bangla", "English"] },
  ];
  for (const t of tutors) {
    await c.query(
      `INSERT INTO tutors (id, name, gender, locationId, verified, profileStatus, subjects, levels, languages, mode, headline, institution, education, experience, fee, about)
       VALUES (?, ?, ?, ?, 1, 'approved', ?, ?, ?, 'both', 'Experienced tutor', 'University of Dhaka', 'BSc', 4, 6500, 'Clear explanations and regular progress checks.')
       ON DUPLICATE KEY UPDATE verified = 1, profileStatus = 'approved', subjects = VALUES(subjects), levels = VALUES(levels), locationId = VALUES(locationId)`,
      [t.id, t.name, t.gender, city.id, JSON.stringify(t.subjects), JSON.stringify(t.levels), JSON.stringify(t.languages)],
    );
  }

  const [[loc]] = await c.query("SELECT COUNT(*) n FROM locations WHERE type = 'country'");
  const [[tut]] = await c.query("SELECT COUNT(*) n FROM tutors WHERE profileStatus = 'approved' AND verified = 1");
  console.log(`Discovery fixtures ready — country locations: ${loc.n}, approved+verified tutors: ${tut.n}.`);
} finally {
  await c.end();
}
