import { drizzle } from "drizzle-orm/mysql2";
import { createConnection } from "mysql2/promise";
import { seedTutorProfileCatalog } from "../server/tutor-profile-catalog.seed.ts";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL is required to seed the Tutor Profile catalog.");
}

const connection = await createConnection(process.env.DATABASE_URL);
const db = drizzle(connection);

try {
  const summary = await seedTutorProfileCatalog(db);
  console.log("TP-03 Tutor Profile catalog seed completed:");
  console.table(summary);
} finally {
  await connection.end();
}
