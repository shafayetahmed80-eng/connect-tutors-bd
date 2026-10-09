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
  countGuardianRequestActions: vi.fn(),
  setAdminTwoFactorSmsPhone: vi.fn(),
  clearAdminTwoFactorSmsPhone: vi.fn(),
  getPhoneCodeSendState: vi.fn(),
  createPhoneVerificationCode: vi.fn(),
  checkPhoneVerificationCode: vi.fn(),
  deletePhoneVerificationCode: vi.fn(),
  recordAuthEvent: vi.fn(async () => ({ id: 0 })),
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

/** An Admin who has already cleared the authenticator challenge, the way the backup-phone endpoints require. */
async function verifiedCaller() {
  dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
  const { caller, setCookies } = createCaller();
  await caller.admin.verifyTwoFactorChallenge({ code: createAdminTotp(SECRET, ADMIN_TOTP_ISSUER, "owner").generate() });
  return createCaller(ownerUser, cookieHeaderFor(setCookies)).caller;
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
  dbMocks.getPhoneCodeSendState.mockResolvedValue({ lastSentAt: null, sentLastHour: 0 });
  dbMocks.createPhoneVerificationCode.mockResolvedValue({ id: 501 });
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
    dbMocks.countGuardianRequestActions.mockResolvedValue({ shortlist: 0, appoint: 0, confirm: 0, cancel: 0 });
    await expect(nextRequest.admin.guardianRequestCounts()).resolves.toMatchObject({ appoint: 0 });
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
    await expect(afterLogout.admin.guardianRequestCounts()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("adding a backup SMS number", () => {
  it("needs an already-cleared authenticator challenge, not just the password", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller } = createCaller(); // no proof cookie on this one

    await expect(caller.admin.startTwoFactorSmsSetup({ phone: "+8801711111111" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.createPhoneVerificationCode).not.toHaveBeenCalled();
  });

  it("texts a code to the number and stores it only once that exact number answers", async () => {
    const caller = await verifiedCaller();

    await expect(caller.admin.startTwoFactorSmsSetup({ phone: "+8801711111111" })).resolves.toMatchObject({ success: true });
    expect(dbMocks.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801711111111", purpose: "admin_two_factor" }));

    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "ok", id: 501 });
    await expect(caller.admin.confirmTwoFactorSmsSetup({ phone: "+8801711111111", code: "4821" })).resolves.toMatchObject({ maskedPhone: "+880171••••111" });
    expect(dbMocks.setAdminTwoFactorSmsPhone).toHaveBeenCalledWith(ownerUser.id, "+8801711111111");
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "two_factor_success", metadata: expect.objectContaining({ reason: "sms-backup-added" }) }));
  });

  it("will not store a number that answered with the wrong code", async () => {
    const caller = await verifiedCaller();
    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "wrong", attemptsLeft: 2 });

    await expect(caller.admin.confirmTwoFactorSmsSetup({ phone: "+8801711111111", code: "0000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.setAdminTwoFactorSmsPhone).not.toHaveBeenCalled();
  });

  it("can be removed", async () => {
    dbMocks.clearAdminTwoFactorSmsPhone.mockResolvedValue({ updated: true });
    const caller = await verifiedCaller();

    await expect(caller.admin.removeTwoFactorSmsBackup()).resolves.toEqual({ success: true });
    expect(dbMocks.clearAdminTwoFactorSmsPhone).toHaveBeenCalledWith(ownerUser.id);
  });
});

describe("the SMS backup as a sign-in challenge", () => {
  function encryptedSettingsWithSms(userId: number) {
    return { ...encryptedSettings(userId), smsPhone: "+8801711111111", smsPhoneVerifiedAt: new Date() };
  }

  it("tells the status check about the backup number, masked", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettingsWithSms(ownerUser.id));
    const { caller } = createCaller();

    await expect(caller.admin.twoFactorStatus()).resolves.toMatchObject({ smsBackup: { maskedPhone: "+880171••••111" } });
  });

  it("refuses to text a code to an account with no backup number on file", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettings(ownerUser.id));
    const { caller } = createCaller();

    await expect(caller.admin.sendTwoFactorChallengeSms()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("texts the stored number and, on the right code, clears the challenge", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettingsWithSms(ownerUser.id));
    const { caller, setCookies } = createCaller();

    await expect(caller.admin.sendTwoFactorChallengeSms()).resolves.toMatchObject({ success: true, maskedPhone: "+880171••••111" });
    expect(dbMocks.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801711111111", purpose: "admin_two_factor" }));

    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "ok", id: 501 });
    await expect(caller.admin.verifyTwoFactorChallengeSms({ code: "4821" })).resolves.toEqual({ success: true });
    expect(dbMocks.recordAdminTwoFactorVerification).toHaveBeenCalledWith(ownerUser.id);
    expect(setCookies["connect-admin-2fa"]).toBeTruthy();
  });

  it("rejects a wrong code without clearing the challenge", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue(encryptedSettingsWithSms(ownerUser.id));
    const { caller } = createCaller();
    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "wrong", attemptsLeft: 2 });

    await expect(caller.admin.verifyTwoFactorChallengeSms({ code: "0000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.recordAdminTwoFactorVerification).not.toHaveBeenCalled();
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ event: "two_factor_failure", metadata: expect.objectContaining({ reason: "sms" }) }));
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
