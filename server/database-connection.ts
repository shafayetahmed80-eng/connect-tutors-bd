import { drizzle } from "drizzle-orm/mysql2";
import { createPool, type Pool } from "mysql2";

/**
 * The zone every connection to the database speaks: UTC.
 *
 * The app writes a Date as UTC clock text and reads stored times back as UTC.
 * That is only right if the database also reads and writes text in UTC. The
 * live host's server keeps Asia/Dhaka time, so left alone each connection spoke
 * Dhaka: what the app wrote came back unchanged (the two mistakes cancelled),
 * but every time the DATABASE filled in itself (createdAt, updatedAt defaults)
 * came back six hours ahead, and a raw NOW() in SQL did the same.
 *
 * Fixed here, once, for every connection the pool opens. A stored TIMESTAMP is
 * then the real moment whoever wrote it.
 */
export const DATABASE_SESSION_TIME_ZONE = "+00:00";

export function createDatabasePool(url: string): Pool {
  const pool = createPool({ uri: url });
  // A new connection is announced just before it is handed out, and commands on
  // one connection run in the order they were queued, so this runs first.
  pool.on("connection", connection => {
    connection.query(`SET time_zone = '${DATABASE_SESSION_TIME_ZONE}'`, error => {
      if (error) console.error("[Database] Could not set the connection time zone to UTC:", error.message);
    });
  });
  return pool;
}

export function createDatabase(url: string) {
  return drizzle(createDatabasePool(url));
}
