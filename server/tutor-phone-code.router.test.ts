import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { getZodFieldErrorsFromCause } from "./_core/trpc";
import * as db from "./db";
import { __resetAuthRateLimitsForTests, appRouter } from "./routers";

function caller() {
  return appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: { "x-forwarded-for": "203.0.113.40" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const registration = {
  name: "Karim Uddin", email: "karim@example.com", password: "strong-pass-1", confirmPassword: "strong-pass-1",
  phone: "+8801712345678", gender: "male" as const, cityId: "dhaka", locationId: "mirpur", termsAccepted: true, phoneCode: "1234",
};

beforeEach(() => {
  __resetAuthRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(db, "recordAuthEvent").mockResolvedValue({ id: 0 });
  vi.spyOn(db, "getPhoneCodeSendState").mockResolvedValue({ lastSentAt: null, sentLastHour: 0 });
  vi.spyOn(db, "createPhoneVerificationCode").mockResolvedValue({ id: 3 });
});
afterEach(() => vi.restoreAllMocks());

describe("auth.sendTutorPhoneCode", () => {
  it("sends a code for a new number", async () => {
    vi.spyOn(db, "isTutorPhoneRegistered").mockResolvedValue(false);
    await expect(caller().auth.sendTutorPhoneCode({ phone: "+8801712345678" })).resolves.toMatchObject({ success: true, resendAfterSeconds: 60 });
    expect(db.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801712345678", purpose: "tutor_registration" }));
  });

  it("names an already-registered number before paying for an SMS", async () => {
    vi.spyOn(db, "isTutorPhoneRegistered").mockResolvedValue(true);
    await expect(caller().auth.sendTutorPhoneCode({ phone: "+8801712345678" })).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringMatching(/already registered to a Tutor account/) });
    expect(db.createPhoneVerificationCode).not.toHaveBeenCalled();
  });

  it("frees the code again when the SMS provider refuses it", async () => {
    vi.spyOn(db, "isTutorPhoneRegistered").mockResolvedValue(false);
    const sms = await import("./sms");
    vi.spyOn(sms, "sendSms").mockResolvedValue({ sent: false, providerCode: 1007, reason: "SMS balance is used up" });
    const drop = vi.spyOn(db, "deletePhoneVerificationCode").mockResolvedValue(undefined);
    vi.spyOn(console, "error").mockImplementation(() => {});

    await expect(caller().auth.sendTutorPhoneCode({ phone: "+8801712345678" })).rejects.toMatchObject({ code: "INTERNAL_SERVER_ERROR" });
    expect(drop).toHaveBeenCalledWith(3);
  });
});

describe("auth.registerTutor with the SMS code", () => {
  it("refuses a wrong code as a phoneCode field error and creates nothing", async () => {
    vi.spyOn(db, "checkPhoneVerificationCode").mockResolvedValue({ status: "wrong", attemptsLeft: 4 });
    const create = vi.spyOn(db, "registerPasswordTutor");

    const failure = await caller().auth.registerTutor(registration).catch((error: unknown) => error);
    expect(failure).toMatchObject({ code: "BAD_REQUEST", message: "That code is not right. 4 tries left." });
    expect(getZodFieldErrorsFromCause((failure as { cause?: unknown }).cause)).toEqual({ phoneCode: ["That code is not right. 4 tries left."] });
    expect(create).not.toHaveBeenCalled();
  });

  it("checks without spending, so a clashing email leaves the code usable", async () => {
    const check = vi.spyOn(db, "checkPhoneVerificationCode").mockResolvedValue({ status: "ok", id: 9 });
    vi.spyOn(db, "registerPasswordTutor").mockResolvedValue({ created: false, reason: "email" } as Awaited<ReturnType<typeof db.registerPasswordTutor>>);
    const consume = vi.spyOn(db, "consumePhoneVerificationCode").mockResolvedValue(undefined);

    await expect(caller().auth.registerTutor(registration)).rejects.toMatchObject({ code: "CONFLICT" });
    expect(check).toHaveBeenCalledWith(expect.objectContaining({ consume: false, purpose: "tutor_registration", phone: "+8801712345678" }));
    expect(consume).not.toHaveBeenCalled();
  });

  it("rejects a code that is not 4 digits before any lookup", async () => {
    const check = vi.spyOn(db, "checkPhoneVerificationCode");
    await expect(caller().auth.registerTutor({ ...registration, phoneCode: "12345" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(check).not.toHaveBeenCalled();
  });
});
