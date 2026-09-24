import { beforeEach, describe, expect, it, vi } from "vitest";

const guardianIntakeDbMocks = vi.hoisted(() => ({
  createOrResumeGuardianPhoneIntake: vi.fn(),
  getPhoneCodeSendState: vi.fn(),
  createPhoneVerificationCode: vi.fn(),
  deletePhoneVerificationCode: vi.fn(),
  checkPhoneVerificationCode: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    ...guardianIntakeDbMocks,
    recordAuthEvent: vi.fn(async () => ({ id: 0 })),
  };
});

import { appRouter, __resetAuthRateLimitsForTests } from "./routers";

type CookieCall = {
  name: string;
  value: string;
  options: Record<string, unknown>;
};

function createPublicCaller() {
  const cookies: CookieCall[] = [];
  const caller = appRouter.createCaller({
    user: null,
    req: { protocol: "https", headers: {} },
    res: {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie() {},
    },
  } as any);

  return { caller, cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake.mockResolvedValue({ id: 41 });
  guardianIntakeDbMocks.getPhoneCodeSendState.mockResolvedValue({ lastSentAt: null, sentLastHour: 0 });
  guardianIntakeDbMocks.createPhoneVerificationCode.mockResolvedValue({ id: 7 });
  guardianIntakeDbMocks.checkPhoneVerificationCode.mockResolvedValue({ status: "ok", id: 7 });
});

describe("guardianIntake.capturePhone", () => {
  it("sends a 4-digit SMS code to the canonical number and takes nothing in yet", async () => {
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.capturePhone({ phone: "01516-131411" })).resolves.toMatchObject({ success: true, resendAfterSeconds: 60 });

    expect(guardianIntakeDbMocks.createPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({
      phone: "+8801516131411",
      purpose: "guardian_intake",
      codeHash: expect.stringMatching(/^[a-f0-9]{64}$/),
    }));
    // No SMS key in tests, so the dev log carries the message in BulkSMSBD's wording.
    expect(console.info).toHaveBeenCalledWith(expect.stringMatching(/^\[sms-dev\] to 8801516131411: Your Connect Tutors OTP is \d{4}$/));
    expect(guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake).not.toHaveBeenCalled();
    expect(cookies).toHaveLength(0);
  });

  it("asks for a minute's wait before another code", async () => {
    guardianIntakeDbMocks.getPhoneCodeSendState.mockResolvedValue({ lastSentAt: new Date(Date.now() - 20_000), sentLastHour: 1 });
    const { caller } = createPublicCaller();

    await expect(caller.guardianIntake.capturePhone({ phone: "01516131411" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
    expect(guardianIntakeDbMocks.createPhoneVerificationCode).not.toHaveBeenCalled();
  });

  it("stops at five codes an hour for one number", async () => {
    guardianIntakeDbMocks.getPhoneCodeSendState.mockResolvedValue({ lastSentAt: new Date(Date.now() - 10 * 60_000), sentLastHour: 5 });
    const { caller } = createPublicCaller();

    await expect(caller.guardianIntake.capturePhone({ phone: "01516131411" })).rejects.toMatchObject({ code: "TOO_MANY_REQUESTS" });
  });
});

describe("guardianIntake.verifyPhone", () => {
  it("takes the number in only after the right code, and emits only a signed httpOnly handoff", async () => {
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.verifyPhone({ phone: "01516-131411", code: "4821" })).resolves.toEqual({ success: true });

    expect(guardianIntakeDbMocks.checkPhoneVerificationCode).toHaveBeenCalledWith(expect.objectContaining({ phone: "+8801516131411", purpose: "guardian_intake", consume: true }));
    expect(guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake).toHaveBeenCalledWith(expect.objectContaining({
      phone: "+8801516131411",
      handoffTokenHash: expect.any(String),
      handoffExpiresAt: expect.any(Date),
      phoneVerifiedAt: expect.any(Date),
    }));
    expect(cookies).toHaveLength(1);
    expect(cookies[0]).toMatchObject({
      name: "guardian-intake-handoff",
      options: {
        httpOnly: true,
        secure: true,
        sameSite: "none",
        path: "/",
      },
    });
    expect(cookies[0]?.value).not.toContain("+8801516131411");
  });

  it("refuses a wrong code with the tries left, and sets no cookie", async () => {
    guardianIntakeDbMocks.checkPhoneVerificationCode.mockResolvedValue({ status: "wrong", attemptsLeft: 3 });
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.verifyPhone({ phone: "01516131411", code: "0000" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: "কোডটি সঠিক নয়। আর 3 বার চেষ্টা করা যাবে।",
    });
    expect(guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake).not.toHaveBeenCalled();
    expect(cookies).toHaveLength(0);
  });

  it("maps private persistence failures to safe recovery guidance without setting a handoff cookie", async () => {
    guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake.mockRejectedValueOnce(
      new Error("Duplicate key +8801516131411 in guardian_phone_intakes"),
    );
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.verifyPhone({ phone: "01516131411", code: "4821" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "আমরা এখন আপনার নম্বরটি সংরক্ষণ করতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।",
    });
    expect(cookies).toHaveLength(0);
  });
});
