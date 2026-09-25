import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getZodFieldErrorsFromCause } from "./_core/trpc";
import * as db from "./db";
import { __resetAuthRateLimitsForTests, appRouter } from "./routers";

function caller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: { "x-forwarded-for": "203.0.113.50" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const reset = { role: "guardian" as const, phone: "+8801712345678", code: "4821", password: "fresh-pass-2026", confirmPassword: "fresh-pass-2026" };

beforeEach(() => {
  __resetAuthRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(db, "recordAuthEvent").mockResolvedValue({ id: 0 });
  vi.spyOn(db, "getPhoneCodeSendState").mockResolvedValue({ lastSentAt: null, sentLastHour: 0 });
  vi.spyOn(db, "createPhoneVerificationCode").mockResolvedValue({ id: 5 });
});
afterEach(() => vi.restoreAllMocks());

describe("auth.sendPasswordResetCode", () => {
  it("sends a password_reset code only to a number with an account", async () => {
    vi.spyOn(db, "findActivePasswordAccountByPhone").mockResolvedValue({ id: 31 });

    await expect(caller().auth.sendPasswordResetCode({ role: "tutor", phone: "+8801712345678" })).resolves.toMatchObject({ success: true, resendAfterSeconds: 60 });
    expect(db.findActivePasswordAccountByPhone).toHaveBeenCalledWith("tutor", "+8801712345678");
    expect(db.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801712345678", purpose: "password_reset" }));
  });

  it("answers exactly the same for a number with no account, and sends nothing", async () => {
    vi.spyOn(db, "findActivePasswordAccountByPhone").mockResolvedValueOnce({ id: 31 }).mockResolvedValueOnce(null);
    const withAccount = await caller().auth.sendPasswordResetCode({ role: "guardian", phone: "+8801712345678" });
    vi.mocked(db.createPhoneVerificationCode).mockClear();

    const without = await caller().auth.sendPasswordResetCode({ role: "guardian", phone: "+8801812345678" });
    expect(without).toEqual(withAccount);
    expect(db.createPhoneVerificationCode).not.toHaveBeenCalled();
  });
});

describe("auth.resetPasswordWithCode", () => {
  it("sets a hashed new password for the account on the number", async () => {
    const check = vi.spyOn(db, "checkPhoneVerificationCode").mockResolvedValue({ status: "ok", id: 5 });
    vi.spyOn(db, "findActivePasswordAccountByPhone").mockResolvedValue({ id: 31 });
    const save = vi.spyOn(db, "setPasswordAfterPhoneReset").mockResolvedValue(undefined);

    await expect(caller().auth.resetPasswordWithCode(reset)).resolves.toEqual({ role: "guardian" });
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801712345678", purpose: "password_reset", consume: true }));
    const { userId, passwordHash } = save.mock.calls[0]![0];
    expect(userId).toBe(31);
    expect(passwordHash).not.toContain("fresh-pass-2026");
    expect(await db.verifyPassword("fresh-pass-2026", passwordHash)).toBe(true);
  });

  it("refuses a wrong code under the code box and changes nothing", async () => {
    vi.spyOn(db, "checkPhoneVerificationCode").mockResolvedValue({ status: "wrong", attemptsLeft: 2 });
    const save = vi.spyOn(db, "setPasswordAfterPhoneReset");

    const failure = await caller().auth.resetPasswordWithCode(reset).catch((error: unknown) => error);
    expect(getZodFieldErrorsFromCause((failure as { cause?: unknown }).cause)).toEqual({ phoneCode: ["That code is not right. 2 tries left."] });
    expect(save).not.toHaveBeenCalled();
  });

  it("refuses mismatched passwords before looking at the code", async () => {
    const check = vi.spyOn(db, "checkPhoneVerificationCode");
    await expect(caller().auth.resetPasswordWithCode({ ...reset, confirmPassword: "other-pass-2026" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(check).not.toHaveBeenCalled();
  });
});
