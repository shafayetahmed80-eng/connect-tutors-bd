import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, describe, expect, it } from "vitest";
import { adminCredentials, adminLoginAuditLogs, users } from "../drizzle/schema";
import { sdk } from "./_core/sdk";
import { changeOwnPasswordByUserId, createAdminAccount, endAllSessionsFor, findActiveAdminByLoginId, getDb, getLastAdminSignIns, getUserByOpenId, listAdminUsers, logAdminAuditEvent, getAdminProfileByUserId, provisionAdminPasswordCredential } from "./db";

const suffix = () => randomBytes(4).toString("hex");
const created: number[] = [];

async function newAdmin() {
  const loginId = `test-sess-${suffix()}`;
  const password = "first-password-1";
  const result = await createAdminAccount({ loginId, password, name: "Session Test" });
  if (!result.created) throw new Error("test Admin was not created");
  created.push(result.userId);
  const user = (await getDb().then(database => database!.select().from(users).where(eq(users.id, result.userId)).limit(1)))[0]!;
  return { userId: result.userId, loginId, password, openId: user.openId };
}

function requestWith(token: string) {
  return { headers: { cookie: `app_session_id=${token}` } } as never;
}

async function signedIn(openId: string) {
  return sdk.authenticateRequest(requestWith(await sdk.createSessionToken(openId, { name: "Session Test", expiresInMs: 60_000 }))).then(() => true, () => false);
}

const nextSecond = () => new Promise(resolve => setTimeout(resolve, 1100));

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  for (const userId of created) {
    await database.delete(adminLoginAuditLogs).where(eq(adminLoginAuditLogs.userId, userId));
    await database.delete(adminCredentials).where(eq(adminCredentials.userId, userId));
    await database.delete(users).where(eq(users.id, userId));
  }
});

describe("ending an Admin's sessions", () => {
  it("lets a new session in, signs earlier ones out, and lets a later one in again", async () => {
    const admin = await newAdmin();
    const before = await sdk.createSessionToken(admin.openId, { name: "Session Test", expiresInMs: 60_000 });
    await expect(sdk.authenticateRequest(requestWith(before))).resolves.toMatchObject({ id: admin.userId });

    await nextSecond();
    await endAllSessionsFor(admin.userId);

    await expect(sdk.authenticateRequest(requestWith(before))).rejects.toThrow();
    await expect(signedIn(admin.openId)).resolves.toBe(true);
  });

  it("signs out a session made before the feature existed (a token with no issue time)", async () => {
    const admin = await newAdmin();
    await endAllSessionsFor(admin.userId);
    const { SignJWT } = await import("jose");
    const { ENV } = await import("./_core/env");
    const legacy = await new SignJWT({ openId: admin.openId, appId: ENV.appId, name: "Session Test" })
      .setProtectedHeader({ alg: "HS256", typ: "JWT" })
      .setExpirationTime(Math.floor(Date.now() / 1000) + 600)
      .sign(new TextEncoder().encode(ENV.cookieSecret));

    await expect(sdk.authenticateRequest(requestWith(legacy))).rejects.toThrow();
  });

  it("is what a new password does to every Admin session signed before it", async () => {
    const admin = await newAdmin();
    const before = await sdk.createSessionToken(admin.openId, { name: "Session Test", expiresInMs: 60_000 });
    await nextSecond();

    await expect(changeOwnPasswordByUserId({ userId: admin.userId, role: "admin", currentPassword: admin.password, newPassword: "second-password-2" })).resolves.toBe("changed");

    await expect(sdk.authenticateRequest(requestWith(before))).rejects.toThrow();
    await expect(signedIn(admin.openId)).resolves.toBe(true);
  });

  it("is what the Owner resetting the credentials does to that Admin's sessions", async () => {
    const admin = await newAdmin();
    const before = await sdk.createSessionToken(admin.openId, { name: "Session Test", expiresInMs: 60_000 });
    await nextSecond();

    await provisionAdminPasswordCredential({ userId: admin.userId, loginId: admin.loginId, password: "owner-set-it-3", requirePasswordChange: true });

    await expect(sdk.authenticateRequest(requestWith(before))).rejects.toThrow();
  });

  it("leaves other Admins alone", async () => {
    const one = await newAdmin();
    const two = await newAdmin();
    const twoBefore = await sdk.createSessionToken(two.openId, { name: "Session Test", expiresInMs: 60_000 });
    await nextSecond();

    await endAllSessionsFor(one.userId);

    await expect(sdk.authenticateRequest(requestWith(twoBefore))).resolves.toMatchObject({ id: two.userId });
    expect((await getUserByOpenId(one.openId))?.sessionsValidFrom).toBeInstanceOf(Date);
    expect((await getUserByOpenId(two.openId))?.sessionsValidFrom).toBeNull();
  });
});

describe("finding an Admin by sign-in id", () => {
  it("finds an active Admin whatever the case, and nobody else", async () => {
    const admin = await newAdmin();
    await expect(findActiveAdminByLoginId(admin.loginId.toUpperCase())).resolves.toMatchObject({ id: admin.userId });
    await expect(findActiveAdminByLoginId(`nobody-${suffix()}`)).resolves.toBeUndefined();
    await expect(findActiveAdminByLoginId("x")).resolves.toBeUndefined();
  });
});

describe("when an Admin last signed in", () => {
  it("is the newest password sign-in, with its address, and ignores the workspace re-confirming a session", async () => {
    const admin = await newAdmin();
    await logAdminAuditEvent({ userId: admin.userId, event: "login_success", metadata: { ipAddress: "198.51.100.1", reason: "password-login" } });
    await logAdminAuditEvent({ userId: admin.userId, event: "login_success", metadata: { ipAddress: "198.51.100.2", reason: "password-login-new-device" } });
    await logAdminAuditEvent({ userId: admin.userId, event: "login_success", metadata: { ipAddress: "198.51.100.3", reason: "admin-session-established" } });
    await logAdminAuditEvent({ userId: admin.userId, event: "login_failure", metadata: { ipAddress: "198.51.100.4", reason: "invalid-password-credentials" } });

    const last = (await getLastAdminSignIns([admin.userId])).get(admin.userId);
    expect(last).toMatchObject({ ip: "198.51.100.2" });
    expect(last?.at).toBeInstanceOf(Date);
  });

  it("is absent for an Admin who has never signed in, and one Admin's sign-in is not another's", async () => {
    const quiet = await newAdmin();
    const busy = await newAdmin();
    await logAdminAuditEvent({ userId: busy.userId, event: "login_success", metadata: { ipAddress: "203.0.113.5", reason: "password-login" } });

    const found = await getLastAdminSignIns([quiet.userId, busy.userId]);
    expect(found.has(quiet.userId)).toBe(false);
    expect(found.get(busy.userId)).toMatchObject({ ip: "203.0.113.5" });
    expect((await getLastAdminSignIns([])).size).toBe(0);
  });

  it("still gives a time when the details of the row cannot be read", async () => {
    const admin = await newAdmin();
    const database = (await getDb())!;
    await database.insert(adminLoginAuditLogs).values({ userId: admin.userId, event: "login_success", metadata: '{"reason":"password-login","ipAddress":' });

    expect((await getLastAdminSignIns([admin.userId])).get(admin.userId)).toMatchObject({ ip: null });
  });

  it("travels with the Admin list and the Admin's own profile", async () => {
    const admin = await newAdmin();
    await logAdminAuditEvent({ userId: admin.userId, event: "login_success", metadata: { ipAddress: "192.0.2.77", reason: "password-login" } });

    const listed = (await listAdminUsers()).find(row => row.id === admin.userId);
    expect(listed?.lastSignIn).toMatchObject({ ip: "192.0.2.77" });
    expect((await getAdminProfileByUserId(admin.userId))?.lastSignIn).toMatchObject({ ip: "192.0.2.77" });

    const fresh = await newAdmin();
    expect((await listAdminUsers()).find(row => row.id === fresh.userId)?.lastSignIn).toBeNull();
  });
});
