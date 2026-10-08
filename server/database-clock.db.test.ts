import { randomBytes } from "node:crypto";
import { eq, sql } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { getDb } from "./db";

// One throwaway account, removed again by id - never anything else.
const openId = `test:database-clock:${randomBytes(4).toString("hex")}`;
let madeId: number | null = null;

afterAll(async () => {
  const database = (await getDb())!;
  if (madeId !== null) await database.delete(users).where(eq(users.id, madeId));
});

const SECOND = 1000;

/** Whatever zone the database server itself keeps, the app must see the real moment. */
describe("the app's view of the database clock, against the real database", () => {
  it("speaks UTC on every connection", async () => {
    const database = (await getDb())!;

    const [rows] = await database.execute(sql`select @@session.time_zone as zone`);

    expect((rows as unknown as Array<{ zone: string }>)[0].zone).toBe("+00:00");
  });

  it("reads back the moment the app wrote, and the moment the database filled in, as now", async () => {
    const database = (await getDb())!;
    const before = Date.now();
    const [inserted] = await database.insert(users).values({ openId, name: "Clock check", role: "guardian", loginMethod: "password", lastSignedIn: new Date(before) });
    madeId = Number(inserted.insertId);

    const [row] = await database.select({ createdAt: users.createdAt, lastSignedIn: users.lastSignedIn }).from(users).where(eq(users.id, madeId));

    // createdAt is the database's own default; lastSignedIn is a Date the app wrote.
    expect(Math.abs(row.createdAt.getTime() - before)).toBeLessThan(60 * SECOND);
    expect(Math.abs(row.lastSignedIn.getTime() - before)).toBeLessThan(2 * SECOND);
  });
});
