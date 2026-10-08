import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { tutorPortalSessions, users } from "../drizzle/schema";
import { createTutorPortalSession, getDb, renewTutorPortalSession, revokeOtherTutorPortalSessions } from "./db";

const created: number[] = [];

async function newTutorUser() {
  const database = (await getDb())!;
  const result = await database.insert(users).values({ openId: `test-member-${randomBytes(6).toString("hex")}`, name: "Portal Test", role: "tutor", loginMethod: "password" });
  const userId = Number(result[0].insertId);
  created.push(userId);
  return userId;
}

const open = async (userId: number, tokenHash: string) =>
  createTutorPortalSession({ userId, tokenHash, expiresAt: new Date(Date.now() + 60_000) });

const stillOpen = (userId: number, tokenHash: string) =>
  renewTutorPortalSession({ userId, tokenHash, now: new Date(), nextExpiry: new Date(Date.now() + 60_000) });

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  for (const userId of created) {
    await database.delete(tutorPortalSessions).where(eq(tutorPortalSessions.userId, userId));
    await database.delete(users).where(eq(users.id, userId));
  }
});

describe("signing a Tutor out everywhere", () => {
  it("ends every other portal tab and leaves the one in use", async () => {
    const userId = await newTutorUser();
    const mine = `test-hash-${randomBytes(8).toString("hex")}`;
    const other = `test-hash-${randomBytes(8).toString("hex")}`;
    const another = `test-hash-${randomBytes(8).toString("hex")}`;
    await open(userId, mine);
    await open(userId, other);
    await open(userId, another);

    await revokeOtherTutorPortalSessions({ userId, exceptTokenHash: mine, now: new Date() });

    await expect(stillOpen(userId, mine)).resolves.toBe(true);
    await expect(stillOpen(userId, other)).resolves.toBe(false);
    await expect(stillOpen(userId, another)).resolves.toBe(false);
  });

  it("ends them all when no tab is named, and never touches another Tutor's tabs", async () => {
    const userId = await newTutorUser();
    const someoneElse = await newTutorUser();
    const mine = `test-hash-${randomBytes(8).toString("hex")}`;
    const theirs = `test-hash-${randomBytes(8).toString("hex")}`;
    await open(userId, mine);
    await open(someoneElse, theirs);

    await revokeOtherTutorPortalSessions({ userId, now: new Date() });

    await expect(stillOpen(userId, mine)).resolves.toBe(false);
    await expect(stillOpen(someoneElse, theirs)).resolves.toBe(true);
  });
});
