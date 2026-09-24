import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { passwordResetLinks, users } from "../drizzle/schema";
import { createPasswordResetLink, getDb, getPasswordResetLink, hashPassword, usePasswordResetLink, verifyPassword } from "./db";

// One throwaway Guardian per test, removed again with its links - never anything else.
let userId = 0;
const hour = 60 * 60 * 1000;
const tokenHash = () => randomBytes(32).toString("hex");

beforeEach(async () => {
  const database = await getDb();
  if (!database) throw new Error("These tests need the database");
  const openId = `test:reset-link:${randomBytes(6).toString("hex")}`;
  await database.insert(users).values({ openId, name: "Reset Link Test", email: `${openId.replaceAll(":", "-")}@example.test`, role: "guardian", loginMethod: "password", passwordHash: await hashPassword("old-password-123") });
  userId = (await database.select({ id: users.id }).from(users).where(eq(users.openId, openId)).limit(1))[0]!.id;
});

afterEach(async () => {
  const database = await getDb();
  if (!database || !userId) return;
  await database.delete(passwordResetLinks).where(eq(passwordResetLinks.userId, userId));
  await database.delete(users).where(eq(users.id, userId));
  userId = 0;
});

describe("password reset links, against the real database", () => {
  it("sets the new password once, then reads as used", async () => {
    const hash = tokenHash();
    await expect(createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: hash, expiresAt: new Date(Date.now() + hour) })).resolves.toMatchObject({ created: true, role: "guardian" });
    await expect(getPasswordResetLink(hash)).resolves.toMatchObject({ status: "valid", role: "guardian", name: "Reset Link Test" });

    await expect(usePasswordResetLink({ tokenHash: hash, passwordHash: await hashPassword("new-password-456") })).resolves.toMatchObject({ status: "valid" });
    const database = (await getDb())!;
    const stored = (await database.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)))[0]!.passwordHash!;
    expect(await verifyPassword("new-password-456", stored)).toBe(true);
    expect(await verifyPassword("old-password-123", stored)).toBe(false);

    await expect(usePasswordResetLink({ tokenHash: hash, passwordHash: await hashPassword("third-password-789") })).resolves.toEqual({ status: "used" });
    await expect(getPasswordResetLink(hash)).resolves.toEqual({ status: "used" });
  });

  it("revokes the older link when a new one is issued", async () => {
    const older = tokenHash();
    const newer = tokenHash();
    await createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: older, expiresAt: new Date(Date.now() + hour) });
    await createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: newer, expiresAt: new Date(Date.now() + hour) });

    await expect(getPasswordResetLink(older)).resolves.toEqual({ status: "invalid" });
    await expect(getPasswordResetLink(newer)).resolves.toMatchObject({ status: "valid" });
  });

  it("refuses an expired link and leaves the password alone", async () => {
    const hash = tokenHash();
    await createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: hash, expiresAt: new Date(Date.now() - 1000) });

    await expect(usePasswordResetLink({ tokenHash: hash, passwordHash: await hashPassword("new-password-456") })).resolves.toEqual({ status: "expired" });
    const database = (await getDb())!;
    const stored = (await database.select({ passwordHash: users.passwordHash }).from(users).where(eq(users.id, userId)))[0]!.passwordHash!;
    expect(await verifyPassword("old-password-123", stored)).toBe(true);
  });

  it("will not issue a link for a suspended account", async () => {
    const database = (await getDb())!;
    await database.update(users).set({ accountStatus: "suspended" }).where(eq(users.id, userId));

    await expect(createPasswordResetLink({ userId, createdByUserId: userId, tokenHash: tokenHash(), expiresAt: new Date(Date.now() + hour) })).resolves.toEqual({ created: false, reason: "NOT_ACTIVE" });
  });

  it("does not know an unknown token", async () => {
    await expect(getPasswordResetLink(tokenHash())).resolves.toEqual({ status: "invalid" });
  });
});
