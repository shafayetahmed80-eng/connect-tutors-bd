import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAdminTwoFactorSettings: vi.fn(),
  getAdminLoginId: vi.fn(),
  saveAdminTwoFactorSettings: vi.fn(),
  replaceAdminRecoveryCodes: vi.fn(),
  recordAdminTwoFactorVerification: vi.fn(),
  consumeAdminRecoveryCode: vi.fn(),
  resetAdminTwoFactor: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  listTutorRequestMatchingPage: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { createAdminTotp, encryptAdminSecret, hashRecoveryCode } from "./admin-security";
import { ENV } from "./_core/env";
import { appRouter, __resetAuthRateLimitsForTests } from "./routers";

const ADMIN_TOTP_ISSUER = "Connect Tutors Admin";
const SECRET = "JBSWY3DPEHPK3PXP";

const ownerUser = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Project Owner",
  passwordHash: "x", loginMethod: "password", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const otherAdmin = { ...ownerUser, id: 73, openId: "password:admin:other", email: "admin@example.com" };

/** A caller whose `res.cookie` calls are captured, and whose `req` carries a given Cookie header - the round trip a real browser does. */
function createCaller(user: TrpcContext["user"] = ownerUser, cookieHeader = "") {
  const setCookies: Record<string, string> = {};
  const res = {
    cookie: vi.fn((name: string, value: string) => { setCookies[name] = value; }),
    clearCookie: vi.fn((name: string) => { setCookies[name] = ""; }),
  };
  const req = { protocol: "https", headers: { host: "connecttutor.example", cookie: cookieHeader } };
  const caller = appRouter.createCaller({ user, req, res } as unknown as TrpcContext);
  return { caller, setCookies };
}

function cookieHeaderFor(setCookies: Record<string, string>) {
  return Object.entries(setCookies).map(([name, value]) => `${name}=${value}`).join("; ");
}

function encryptedSettings(userId: number) {
  return { userId, secretCiphertext: encryptAdminSecret(SECRET, ENV.cookieSecret), enabledAt: new Date(), lastVerifiedAt: null };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
  // `clearAllMocks` clears calls, not a mock's configured resolved value, so
  // every test starts "not enrolled" unless it says otherwise itself - a stale
  // enrolled settings row from an earlier test must never leak into the next.
  dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
  dbMocks.getAdminLoginId.mockResolvedValue("owner");
  dbMocks.logAdminAuditEvent.mockResolvedValue({ id: 1 });
});

describe("setting up two-factor authentication", () => {
  it("hands back a secret, an otpauth URL and a QR code to scan", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
    const { caller } = createCaller();

    const result = await caller.admin.startTwoFactorSetup();
    expect(result.secret).toMatch(/^[A-Z2-7]+$/);
    expect(result.otpauthUrl).toContain("otpauth://totp/");
    expect(result.qrDataUrl).toMatch(/^data:image\/png;base64,/);
  });

  it("refuses to start over once an account is already enrolled", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller } = createCaller();

    await expect(caller.admin.startTwoFactorSetup()).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("turns two-factor on with the right code, hands back 10 recovery codes once, and clears this browser's challenge", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
    const { caller, setCookies } = createCaller();
    const secret = (await caller.admin.startTwoFactorSetup()).secret;
    const code = createAdminTotp(secret, ADMIN_TOTP_ISSUER, "owner").generate();

    const result = await caller.admin.confirmTwoFactorSetup({ secret, code });
    expect(result.recoveryCodes).toHaveLength(10);
    expect(new Set(result.recoveryCodes).size).toBe(10);
    expect(dbMocks.saveAdminTwoFactorSettings).toHaveBeenCalledWith(ownerUser.id, expect.not.stringContaining(secret));
    expect(dbMocks.replaceAdminRecoveryCodes).toHaveBeenCalledWith(ownerUser.id, expect.arrayContaining([expect.any(String)]));
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "two_factor_success", userId: ownerUser.id }));
    expect(setCookies["connect-admin-2fa"]).toBeTruthy();
  });

  it("rejects a code that does not match the secret just issued", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
    const { caller } = createCaller();
    const secret = (await caller.admin.startTwoFactorSetup()).secret;

    await expect(caller.admin.confirmTwoFactorSetup({ secret, code: "000000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.saveAdminTwoFactorSettings).not.toHaveBeenCalled();
  });

  it("refuses to confirm a second enrollment for an account that already has one", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller } = createCaller();

    await expect(caller.admin.confirmTwoFactorSetup({ secret: SECRET, code: "123456" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("the sign-in challenge for an already-enrolled Admin", () => {
  it("accepts the current authenticator code and sets this browser's proof cookie", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller, setCookies } = createCaller();
    const code = createAdminTotp(SECRET, ADMIN_TOTP_ISSUER, "owner").generate();

    await expect(caller.admin.verifyTwoFactorChallenge({ code })).resolves.toEqual({ success: true });
    expect(dbMocks.recordAdminTwoFactorVerification).toHaveBeenCalledWith(ownerUser.id);
    expect(setCookies["connect-admin-2fa"]).toBeTruthy();
  });

  it("rejects a wrong code and locks the account out after repeated tries", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller } = createCaller();

    for (let attempt = 0; attempt < 8; attempt += 1) {
      await expect(caller.admin.verifyTwoFactorChallenge({ code: "000000" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    }
    await expect(caller.admin.verifyTwoFactorChallenge({ code: "000000" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(dbMocks.recordAdminTwoFactorVerification).not.toHaveBeenCalled();
  });

  it("will not run the challenge for an account that was never enrolled", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
    const { caller } = createCaller();

    await expect(caller.admin.verifyTwoFactorChallenge({ code: "123456" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("lets a lost-phone Admin in with one of their recovery codes, and only once each", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller, setCookies } = createCaller();

    dbMocks.consumeAdminRecoveryCode.mockResolvedValueOnce({ consumed: true });
    await expect(caller.admin.verifyTwoFactorRecoveryCode({ code: "ABCD-EFGH-1234" })).resolves.toEqual({ success: true });
    expect(dbMocks.consumeAdminRecoveryCode).toHaveBeenCalledWith(ownerUser.id, hashRecoveryCode("ABCD-EFGH-1234", ENV.cookieSecret));
    expect(setCookies["connect-admin-2fa"]).toBeTruthy();
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "recovery_code_used" }));

    dbMocks.consumeAdminRecoveryCode.mockResolvedValueOnce({ consumed: false });
    await expect(caller.admin.verifyTwoFactorRecoveryCode({ code: "ABCD-EFGH-1234" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("clears the challenge for other Admin endpoints the moment the cookie it just set is sent back", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller, setCookies } = createCaller();
    const code = createAdminTotp(SECRET, ADMIN_TOTP_ISSUER, "owner").generate();
    await caller.admin.verifyTwoFactorChallenge({ code });

    const { caller: nextRequest } = createCaller(ownerUser, cookieHeaderFor(setCookies));
    dbMocks.listTutorRequestMatchingPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    await expect(nextRequest.admin.listMatchingRequests({})).resolves.toMatchObject({ total: 0 });
  });
});

describe("signing out", () => {
  it("drops this browser's second-factor trust, so signing back in needs the challenge again", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller, setCookies } = createCaller();
    const code = createAdminTotp(SECRET, ADMIN_TOTP_ISSUER, "owner").generate();
    await caller.admin.verifyTwoFactorChallenge({ code });
    expect(setCookies["connect-admin-2fa"]).toBeTruthy();

    await caller.auth.logout();
    expect(setCookies["connect-admin-2fa"]).toBe("");

    const { caller: afterLogout } = createCaller(ownerUser, cookieHeaderFor(setCookies));
    await expect(afterLogout.admin.listMatchingRequests({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("the Owner clearing a locked-out Admin's two-factor enrollment", () => {
  it("resets the target account and leaves an audit trail", async () => {
    dbMocks.resetAdminTwoFactor.mockResolvedValue({ reset: true });
    const { caller } = createCaller(ownerUser);

    await expect(caller.admin.resetTwoFactorForAdmin({ userId: otherAdmin.id })).resolves.toEqual({ reset: true });
    expect(dbMocks.resetAdminTwoFactor).toHaveBeenCalledWith(otherAdmin.id);
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "two_factor_reset", userId: otherAdmin.id }));
  });

  it("is the Owner's alone", async () => {
    const { caller } = createCaller(otherAdmin);
    await expect(caller.admin.resetTwoFactorForAdmin({ userId: ownerUser.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.resetAdminTwoFactor).not.toHaveBeenCalled();
  });
});
