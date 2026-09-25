import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { passwordResetLinks, users } from "../drizzle/schema";
import { createPasswordResetLink, findActivePasswordAccountByPhone, getDb, getPasswordResetLink, hashPassword, setPasswordAfterPhoneReset, verifyPassword } from "./db";

// One throwaway Tutor on a reserved number, removed with its links afterwards - nothing else is touched.
const phone = "+8801999999903";
let userId = 0;

beforeEach(async () => {
  const database = (await getDb())!;
  const openId = `test:phone-reset:${randomBytes(6).toString("hex")}`;
  await database.insert(users).values({ openId, name: "Phone Reset Test", role: "tutor", loginMethod: "password", loginPhone: phone, passwordHash: await hashPassword("old-password-123") });
  userId = (await database.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1))[0]!.id;
});

afterEach(async () => {
  const database = await getDb();
  if (!database || !userId) return;
  await database.delete(passwordResetLinks).where(eq(passwordResetLinks.userId, userId));
  await database.delete(users).where(eq(users.id, userId));
  userId = 0;
});

describe("SMS-code password reset, against the real database", () => {
  it("finds the active account on the number, for that account type only", async () => {
    await expect(findActivePasswordAccountByPhone("tutor", phone)).resolves.toEqual({ id: userId });
    await expect(findActivePasswordAccountByPhone("guardian", phone)).resolves.toBeNull();
  });

  it("does not find a suspended account", async () => {
    await (await getDb())!.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, userId));
    await expect(findActivePasswordAccountByPhone("tutor", phone)).resolves.toBeNull();
  });

  it("sets the new password and closes an Admin reset link still open", async () => {
    const linkHash = randomBytes(32).toString("hex");
    await createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: linkHash, expiresAt: new Date(Date.now() + 60 * 60 * 1000) });

    await setPasswordAfterPhoneReset({ userId, passwordHash: await hashPassword("new-password-456") });

    const stored = (await (await getDb())!.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)))[0]!.passwordHash!;
    expect(await verifyPassword("new-password-456", stored)).toBe(true);
    await expect(getPasswordResetLink(linkHash)).resolves.toEqual({ status: "invalid" });
  });
});
