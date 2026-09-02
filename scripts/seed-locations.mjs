import fs from "node:fs";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { deactivateUnlistedLocations, seedLocationCatalog } from "../server/location-catalog.seed.ts";

// Falls back to `.env` like the other database scripts, so this works straight
// after `npm run db:migrate` instead of failing on a variable the migration
// step never needed spelled out.
const databaseUrl = process.env.DATABASE_URL
  ?? fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the location catalog.");
}

const connection = await createConnection(databaseUrl);
const db = drizzle(connection);

try {
  const summary = await seedLocationCatalog(db);
  console.log("Bangladesh location catalog seed completed:");
  console.table(summary);

  const hidden = await deactivateUnlistedLocations(db);
  if (hidden.length > 0) {
    // Switched off, never deleted: a Guardian profile or a published job may
    // still name one, and a hidden place keeps those selections valid.
    console.log(`\n${hidden.length} superseded place(s) were switched off so they stop appearing beside their replacements:`);
    for (const row of hidden.slice(0, 10)) console.log(`  ${row.id.padEnd(34)} ${row.label}`);
    if (hidden.length > 10) console.log(`  ... and ${hidden.length - 10} more`);
  }
} finally {
  await connection.end();
}
