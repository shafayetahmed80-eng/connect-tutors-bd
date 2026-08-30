import { beforeEach, describe, expect, it, vi } from "vitest";

const guardianIntakeDbMocks = vi.hoisted(() => ({
  createOrResumeGuardianPhoneIntake: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    createOrResumeGuardianPhoneIntake: guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake,
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

describe("guardianIntake.capturePhone", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetAuthRateLimitsForTests();
    guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake.mockResolvedValue({ id: 41 });
  });

  it("captures a canonical phone privately and emits only a signed httpOnly handoff", async () => {
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.capturePhone({ phone: "01516-131411" })).resolves.toEqual({ success: true });

    expect(guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake).toHaveBeenCalledWith(expect.objectContaining({
      phone: "+8801516131411",
      handoffTokenHash: expect.any(String),
      handoffExpiresAt: expect.any(Date),
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

  it("maps private persistence failures to safe recovery guidance without setting a handoff cookie", async () => {
    guardianIntakeDbMocks.createOrResumeGuardianPhoneIntake.mockRejectedValueOnce(
      new Error("Duplicate key +8801516131411 in guardian_phone_intakes"),
    );
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianIntake.capturePhone({ phone: "01516131411" })).rejects.toMatchObject({
      code: "INTERNAL_SERVER_ERROR",
      message: "আমরা এখন আপনার নম্বরটি সংরক্ষণ করতে পারছি না। অনুগ্রহ করে আবার চেষ্টা করুন।",
    });
    expect(cookies).toHaveLength(0);
  });
});
