import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterEach, describe, expect, it } from "vitest";
import { adminCredentials, users } from "../drizzle/schema";
import { changeOwnPasswordByUserId, createAdminAccount, getAdminPasswordChangeRequired, getDb, provisionAdminPasswordCredential, verifyAdminPassword } from "./db";

// Every Admin made here is removed again, and nothing else is touched.
const madeUserIds: number[] = [];
const suffix = () => randomBytes(4).toString("hex");

async function makeAdmin(password = "first-password-1") {
  const loginId = `test-admin-${suffix()}`;
  const result = await createAdminAccount({ loginId, password, name: "Created Admin", email: `${loginId}@example.test` });
  if (!result.created) throw new Error(`could not create: ${result.reason}`);
  madeUserIds.push(result.userId);
  return { userId: result.userId, loginId, password };
}

afterEach(async () => {
  const database = await getDb();
  if (!database) return;
  for (const userId of madeUserIds.splice(0)) {
    await database.delete(adminCredentials).where(eq(adminCredentials.userId, userId));
    await database.delete(users).where(eq(users.id, userId));
  }
});

describe("an Admin created by the Owner, against the real database", () => {
  it("can sign in with the Owner's password and is held to changing it", async () => {
    const admin = await makeAdmin();
    await expect(verifyAdminPassword({ userId: admin.loginId, password: admin.password })).resolves.toMatchObject({ id: admin.userId, role: "admin" });
    await expect(getAdminPasswordChangeRequired(admin.userId)).resolves.toBe(true);
  });

  it("is released once they choose their own password, which then replaces the first", async () => {
    const admin = await makeAdmin();
    await expect(changeOwnPasswordByUserId({ userId: admin.userId, role: "admin", currentPassword: "wrong-guess-123", newPassword: "my-own-password-2" })).resolves.toBe("invalid-current-password");
    await expect(getAdminPasswordChangeRequired(admin.userId)).resolves.toBe(true);

    await expect(changeOwnPasswordByUserId({ userId: admin.userId, role: "admin", currentPassword: admin.password, newPassword: "my-own-password-2" })).resolves.toBe("changed");
    await expect(getAdminPasswordChangeRequired(admin.userId)).resolves.toBe(false);
    await expect(verifyAdminPassword({ userId: admin.loginId, password: admin.password })).resolves.toBeUndefined();
    await expect(verifyAdminPassword({ userId: admin.loginId, password: "my-own-password-2" })).resolves.toMatchObject({ id: admin.userId });
  });

  it("is held again when the Owner resets their password, but not when an Admin resets their own", async () => {
    const admin = await makeAdmin();
    await changeOwnPasswordByUserId({ userId: admin.userId, role: "admin", currentPassword: admin.password, newPassword: "my-own-password-2" });

    await provisionAdminPasswordCredential({ userId: admin.userId, loginId: admin.loginId, password: "owner-chose-this-3", requirePasswordChange: true });
    await expect(getAdminPasswordChangeRequired(admin.userId)).resolves.toBe(true);

    await provisionAdminPasswordCredential({ userId: admin.userId, loginId: admin.loginId, password: "owner-own-pass-4" });
    await expect(getAdminPasswordChangeRequired(admin.userId)).resolves.toBe(false);
  });

  it("refuses a User ID or an email that is already taken, and a User ID that cannot be one", async () => {
    const admin = await makeAdmin();
    await expect(createAdminAccount({ loginId: admin.loginId.toUpperCase(), password: "another-pass-5" })).resolves.toEqual({ created: false, reason: "LOGIN_ID_IN_USE" });
    await expect(createAdminAccount({ loginId: `test-admin-${suffix()}`, password: "another-pass-5", email: `${admin.loginId}@example.test` })).resolves.toEqual({ created: false, reason: "EMAIL_IN_USE" });
    await expect(createAdminAccount({ loginId: "1bad id", password: "another-pass-5" })).resolves.toEqual({ created: false, reason: "INVALID_LOGIN_ID" });
  });

  it("leaves an Admin who was never given a first password unheld", async () => {
    await expect(getAdminPasswordChangeRequired(999_999_999)).resolves.toBe(false);
  });
});
