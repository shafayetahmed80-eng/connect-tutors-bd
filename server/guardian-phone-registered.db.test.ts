import { randomBytes } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { users } from "../drizzle/schema";
import { getDb, isGuardianPhoneRegistered } from "./db";

// Throwaway accounts, removed again - never anything else.
const tag = randomBytes(3).toString("hex");
const guardianPhone = `+88017${Math.floor(10000000 + Math.random() * 89999999)}`;
const tutorOnlyPhone = `+88018${Math.floor(10000000 + Math.random() * 89999999)}`;
const madeIds: number[] = [];

async function makeUser(key: string, role: "guardian" | "tutor", loginPhone: string) {
  const database = (await getDb())!;
  const [insert] = await database.insert(users).values({ openId: `test:phone-registered:${tag}:${key}`, name: `PR ${key}`, role, loginPhone, loginMethod: "password" });
  madeIds.push(Number(insert.insertId));
}

afterAll(async () => {
  const database = (await getDb())!;
  if (madeIds.length) await database.delete(users).where(inArray(users.id, madeIds));
});

describe("whether a number already has a Guardian account, against the real database", () => {
  it("is true for a number a Guardian signs in with", async () => {
    await makeUser("guardian", "guardian", guardianPhone);
    expect(await isGuardianPhoneRegistered(guardianPhone)).toBe(true);
  });

  it("is false for a number only a Tutor uses - the two roles keep their own numbers", async () => {
    await makeUser("tutor", "tutor", tutorOnlyPhone);
    expect(await isGuardianPhoneRegistered(tutorOnlyPhone)).toBe(false);
  });

  it("is false for a number nobody has", async () => {
    expect(await isGuardianPhoneRegistered("+8801999999999")).toBe(false);
  });
});
