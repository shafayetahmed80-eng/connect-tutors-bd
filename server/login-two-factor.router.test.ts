import { beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getTutorGuardianLoginOtpSettings: vi.fn(),
  setTutorGuardianLoginOtpEnabled: vi.fn(),
  setTutorGuardianLoginOtpDays: vi.fn(),
  resetTutorGuardianLoginTrust: vi.fn(),
  getAdminControl: vi.fn(),
  getAdminTwoFactorSettings: vi.fn(),
  getAccountChangeContextByUserId: vi.fn(),
  getGuardianProfileByUserId: vi.fn(),
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

import { ENV } from "./_core/env";
import { __resetAuthRateLimitsForTests, appRouter } from "./routers";

const base = {
  email: "person@example.com", name: "Rina Akter", passwordHash: "x", loginMethod: "password",
  accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guardian = { ...base, id: 7, openId: "guardian:7", role: "guardian" as const };
const owner = { ...base, id: 1, openId: ENV.ownerOpenId, role: "admin" as const };

/** A caller that records the cookies set, and sends back a given Cookie header - the round trip a browser does. */
function createCaller(user: TrpcContext["user"] = guardian, cookieHeader = "") {
  const setCookies: Record<string, { value: string; options: Record<string, unknown> }> = {};
  const res = {
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => { setCookies[name] = { value, options }; }),
    clearCookie: vi.fn(),
  };
  const req = { protocol: "https", headers: { host: "connecttutor.example", cookie: cookieHeader } };
  return { caller: appRouter.createCaller({ user, req, res } as unknown as TrpcContext), setCookies, res };
}

function cookieHeaderFor(setCookies: Record<string, { value: string }>) {
  return Object.entries(setCookies).map(([name, { value }]) => `${name}=${value}`).join("; ");
}

function switchedOn(rememberDays = 30, epoch = 0) {
  dbMocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: true, rememberDays, epoch });
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  dbMocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: false, rememberDays: 30 });
  // Admins here are "not enrolled"; id 1 is the real Owner, whose enrolled row the dev database holds.
  dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
  dbMocks.getAccountChangeContextByUserId.mockResolvedValue({ role: "guardian", currentMobile: "+8801711111111" });
  dbMocks.getGuardianProfileByUserId.mockResolvedValue({ id: 1, userId: 7 });
  dbMocks.getPhoneCodeSendState.mockResolvedValue({ lastSentAt: null, sentLastHour: 0 });
  dbMocks.createPhoneVerificationCode.mockResolvedValue({ id: 601 });
});

describe("the sign-in SMS code gate", () => {
  it("gates nothing while the Owner's switch is off", async () => {
    await expect(createCaller().caller.guardianProfile.me()).resolves.toMatchObject({ userId: 7 });
    await expect(createCaller().caller.auth.loginTwoFactorStatus()).resolves.toMatchObject({ required: false, cleared: true });
  });

  it("refuses a Guardian's private endpoints until this browser has cleared the code, once the switch is on", async () => {
    switchedOn();
    await expect(createCaller().caller.guardianProfile.me()).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("10004") });
    expect(dbMocks.getGuardianProfileByUserId).not.toHaveBeenCalled();
  });

  it("never gates an Admin, whose own second factor is separate", async () => {
    switchedOn();
    await expect(createCaller(owner).caller.auth.me()).resolves.toBeTruthy();
  });

  it("reports the masked number and that the code is still owed", async () => {
    switchedOn();
    await expect(createCaller().caller.auth.loginTwoFactorStatus()).resolves.toEqual({
      required: true, cleared: false, maskedPhone: "+880171••••111", rememberDays: 30,
    });
  });
});

describe("clearing the sign-in SMS code", () => {
  it("texts the number on the account, never one the caller supplies", async () => {
    switchedOn();
    const result = await createCaller().caller.auth.sendLoginTwoFactorCode();
    expect(result).toMatchObject({ success: true, resendAfterSeconds: 60, maskedPhone: "+880171••••111" });
    expect(dbMocks.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801711111111", purpose: "login_two_factor" }));
  });

  it("refuses an account with no mobile on file", async () => {
    switchedOn();
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue({ role: "guardian", currentMobile: null });
    await expect(createCaller().caller.auth.sendLoginTwoFactorCode()).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("sets a proof cookie lasting the Owner's chosen days once the right code comes back, and the gate then opens", async () => {
    switchedOn(14);
    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "ok", id: 601 });
    const { caller, setCookies } = createCaller();
    await expect(caller.auth.verifyLoginTwoFactorCode({ code: "4821" })).resolves.toEqual({ success: true, rememberDays: 14 });

    const proof = setCookies["connect-login-2fa"];
    expect(proof.options).toMatchObject({ httpOnly: true, maxAge: 14 * 24 * 60 * 60 * 1000 });
    const cleared = createCaller(guardian, cookieHeaderFor(setCookies)).caller;
    await expect(cleared.guardianProfile.me()).resolves.toMatchObject({ userId: 7 });
    await expect(cleared.auth.loginTwoFactorStatus()).resolves.toMatchObject({ required: true, cleared: true });
  });

  it("does not trust the proof of another account", async () => {
    switchedOn();
    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "ok", id: 601 });
    const first = createCaller();
    await first.caller.auth.verifyLoginTwoFactorCode({ code: "4821" });

    const someoneElse = createCaller({ ...guardian, id: 8, openId: "guardian:8" }, cookieHeaderFor(first.setCookies)).caller;
    await expect(someoneElse.guardianProfile.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("sets no cookie for a wrong code", async () => {
    switchedOn();
    dbMocks.checkPhoneVerificationCode.mockResolvedValueOnce({ status: "wrong", attemptsLeft: 2 });
    const { caller, setCookies } = createCaller();
    await expect(caller.auth.verifyLoginTwoFactorCode({ code: "0000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(setCookies["connect-login-2fa"]).toBeUndefined();
  });

  it("slows down a run of wrong codes", async () => {
    switchedOn();
    dbMocks.checkPhoneVerificationCode.mockResolvedValue({ status: "wrong", attemptsLeft: 1 });
    const { caller } = createCaller();
    for (let attempt = 0; attempt < 8; attempt += 1) {
      await expect(caller.auth.verifyLoginTwoFactorCode({ code: "0000" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    await expect(caller.auth.verifyLoginTwoFactorCode({ code: "0000" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });

  it("drops this browser's proof when the person signs out", async () => {
    switchedOn();
    const { caller, res } = createCaller();
    await caller.auth.logout();
    expect(res.clearCookie).toHaveBeenCalledWith("connect-login-2fa", expect.anything());
  });
});

describe("the Owner resetting every trusted browser", () => {
  it("ends the proof every browser already holds, and a code given afterwards is trusted again", async () => {
    switchedOn(30, 0);
    dbMocks.checkPhoneVerificationCode.mockResolvedValue({ status: "ok", id: 601 });
    const first = createCaller();
    await first.caller.auth.verifyLoginTwoFactorCode({ code: "4821" });
    const trusted = createCaller(guardian, cookieHeaderFor(first.setCookies)).caller;
    await expect(trusted.guardianProfile.me()).resolves.toMatchObject({ userId: 7 });

    switchedOn(30, 1);
    await expect(trusted.guardianProfile.me()).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("10004") });
    await expect(trusted.auth.loginTwoFactorStatus()).resolves.toMatchObject({ required: true, cleared: false });

    const again = createCaller();
    await again.caller.auth.verifyLoginTwoFactorCode({ code: "4821" });
    const retrusted = createCaller(guardian, cookieHeaderFor(again.setCookies)).caller;
    await expect(retrusted.guardianProfile.me()).resolves.toMatchObject({ userId: 7 });
  });

  it("also ends the proof the upload routes would have accepted", async () => {
    switchedOn(30, 0);
    dbMocks.checkPhoneVerificationCode.mockResolvedValue({ status: "ok", id: 601 });
    const first = createCaller();
    await first.caller.auth.verifyLoginTwoFactorCode({ code: "4821" });
    const { loginTwoFactorCleared } = await import("./login-two-factor");
    const req = { headers: { cookie: cookieHeaderFor(first.setCookies) } };

    await expect(loginTwoFactorCleared(req, guardian.id)).resolves.toBe(true);
    switchedOn(30, 1);
    await expect(loginTwoFactorCleared(req, guardian.id)).resolves.toBe(false);
  });

  it("is the Project Owner's alone", async () => {
    dbMocks.resetTutorGuardianLoginTrust.mockResolvedValue({ epoch: 1 });
    await expect(createCaller(owner).caller.adminControl.resetTutorGuardianLoginTrust()).resolves.toEqual({ epoch: 1 });

    const otherAdmin = createCaller({ ...owner, id: 2, openId: "password:admin:other" }).caller;
    await expect(otherAdmin.adminControl.resetTutorGuardianLoginTrust()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller().caller.adminControl.resetTutorGuardianLoginTrust()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.resetTutorGuardianLoginTrust).toHaveBeenCalledTimes(1);
  });
});

describe("the Owner's switches", () => {
  it("lets only the Project Owner turn the code on and set the days", async () => {
    dbMocks.setTutorGuardianLoginOtpEnabled.mockResolvedValue({ enabled: true });
    dbMocks.setTutorGuardianLoginOtpDays.mockResolvedValue({ rememberDays: 45 });
    const ownerCaller = createCaller(owner).caller;
    await expect(ownerCaller.adminControl.setTutorGuardianLoginOtpEnabled({ enabled: true })).resolves.toEqual({ enabled: true });
    await expect(ownerCaller.adminControl.setTutorGuardianLoginOtpDays({ days: 45 })).resolves.toEqual({ rememberDays: 45 });

    const otherAdmin = createCaller({ ...owner, id: 2, openId: "password:admin:other" }).caller;
    await expect(otherAdmin.adminControl.setTutorGuardianLoginOtpEnabled({ enabled: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller().caller.adminControl.setTutorGuardianLoginOtpDays({ days: 45 })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("refuses a day count outside 1 to 90", async () => {
    const ownerCaller = createCaller(owner).caller;
    await expect(ownerCaller.adminControl.setTutorGuardianLoginOtpDays({ days: 0 })).rejects.toThrow();
    await expect(ownerCaller.adminControl.setTutorGuardianLoginOtpDays({ days: 91 })).rejects.toThrow();
    expect(dbMocks.setTutorGuardianLoginOtpDays).not.toHaveBeenCalled();
  });
});
