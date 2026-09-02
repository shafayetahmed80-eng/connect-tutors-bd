import fs from "node:fs";
import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { seedTutorProfileCatalog } from "../server/tutor-profile-catalog.seed.ts";

// Falls back to `.env` like the other database scripts, so `npm run
// db:seed:tutor-profile-catalog` works straight after `npm run db:migrate`
// instead of failing on a variable the migration step never needed spelled out.
const databaseUrl = process.env.DATABASE_URL
  ?? fs.readFileSync(".env", "utf8").match(/^DATABASE_URL=(.*)$/m)?.[1]?.trim().replace(/^"|"$/g, "");
if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to seed the Tutor Profile catalog.");
}

const connection = await createConnection(databaseUrl);
const db = drizzle(connection);

try {
  const summary = await seedTutorProfileCatalog(db);
  console.log("TP-03 Tutor Profile catalog seed completed:");
  console.table(summary);
} finally {
  await connection.end();
}
