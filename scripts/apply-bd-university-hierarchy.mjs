import mysql from "mysql2/promise";
import { drizzle } from "drizzle-orm/mysql2";

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) {
  throw new Error("DATABASE_URL is required to apply the Bangladesh university hierarchy.");
}

const { seedTutorProfileCatalog } = await import("../server/tutor-profile-catalog.seed.ts");
const connection = await mysql.createConnection(databaseUrl);
const database = drizzle(connection);

try {
  const summary = await seedTutorProfileCatalog(database);
  console.log(JSON.stringify(summary, null, 2));
} finally {
  await connection.end();
}
