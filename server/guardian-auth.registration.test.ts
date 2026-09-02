import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const guardianAuthDbMocks = vi.hoisted(() => ({
  registerGuardianFromIntake: vi.fn(),
  getGuardianProfileByUserId: vi.fn(),
  verifyGuardianPassword: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    registerGuardianFromIntake: guardianAuthDbMocks.registerGuardianFromIntake,
    getGuardianProfileByUserId: guardianAuthDbMocks.getGuardianProfileByUserId,
    verifyGuardianPassword: guardianAuthDbMocks.verifyGuardianPassword,
    recordAuthEvent: vi.fn(async () => ({ id: 0 })),
  };
});

import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { createGuardianIntakeHandoff } from "./guardian-intake-handoff";
import { GuardianRegistrationError, GUARDIAN_TERMS_VERSION } from "./guardian-registration.validation";
import { appRouter, __resetAuthRateLimitsForTests } from "./routers";

type CookieCall = { name: string; value: string; options: Record<string, unknown> };
type ClearCookieCall = { name: string; options: Record<string, unknown> };

const guardianUser = {
  id: 77,
  openId: "password:guardian:rahima@example.com",
  email: "rahima@example.com",
  name: "Rahima Begum",
  passwordHash: "scrypt$private",
  loginMethod: "password",
  role: "guardian" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const registrationInput = {
  name: "Rahima Begum",
  gender: "female" as const,
  email: "Rahima@Example.com",
  password: "strong-pass-123",
  confirmPassword: "strong-pass-123",
  cityLocationId: "dhaka-city",
  locationId: "uttara-sector-7",
  termsAccepted: true as const,
};

function createPublicCaller(input?: { handoffCookie?: string; user?: TrpcContext["user"] }) {
  const cookies: CookieCall[] = [];
  const clearedCookies: ClearCookieCall[] = [];
  const caller = appRouter.createCaller({
    user: input?.user ?? null,
    req: {
      protocol: "https",
      headers: input?.handoffCookie ? { cookie: `guardian-intake-handoff=${input.handoffCookie}` } : {},
    },
    res: {
      cookie(name: string, value: string, options: Record<string, unknown>) {
        cookies.push({ name, value, options });
      },
      clearCookie(name: string, options: Record<string, unknown>) {
        clearedCookies.push({ name, options });
      },
    },
  } as unknown as TrpcContext);
  return { caller, cookies, clearedCookies };
}

function createValidHandoffCookie() {
  return createGuardianIntakeHandoff({
    secret: ENV.cookieSecret,
    ttlMs: 20 * 60 * 1000,
  }).cookieValue;
}

beforeEach(() => __resetAuthRateLimitsForTests());
afterEach(() => vi.restoreAllMocks());

describe("guardianAuth.register", () => {
  it("uses a valid server-managed handoff to create a Guardian session without returning password or intake data", async () => {
    guardianAuthDbMocks.registerGuardianFromIntake.mockResolvedValue({ created: true, user: guardianUser });
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("guardian-session-token");
    const { caller, cookies, clearedCookies } = createPublicCaller({ handoffCookie: createValidHandoffCookie() });

    const result = await caller.guardianAuth.register(registrationInput);

    expect(guardianAuthDbMocks.registerGuardianFromIntake).toHaveBeenCalledWith(expect.objectContaining({
      name: "Rahima Begum",
      email: "Rahima@Example.com",
      cityLocationId: "dhaka-city",
      locationId: "uttara-sector-7",
      password: "strong-pass-123",
      termsVersion: GUARDIAN_TERMS_VERSION,
      handoffTokenHash: expect.any(String),
    }));
    expect(guardianAuthDbMocks.registerGuardianFromIntake.mock.calls[0]?.[0]).not.toHaveProperty("confirmPassword");
    expect(result).toEqual({
      success: true,
      next: "request-details",
      user: {
        id: 77,
        name: "Rahima Begum",
        email: "rahima@example.com",
        role: "guardian",
        accountStatus: "active",
      },
    });
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result).not.toHaveProperty("handoffTokenHash");
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: "guardian-session-token" });
    // The cookie carries a year-long token; without maxAge the browser would
    // still drop it on exit and every panel would ask for a password again.
    expect(cookies[0]?.options).toMatchObject({ maxAge: ONE_YEAR_MS });
    expect(clearedCookies[0]).toMatchObject({ name: "guardian-intake-handoff", options: { httpOnly: true, path: "/" } });
  });

  it("rejects absent or invalid handoffs before any private persistence or session write", async () => {
    const { caller, cookies } = createPublicCaller();

    await expect(caller.guardianAuth.register(registrationInput)).rejects.toMatchObject({ code: "UNAUTHORIZED" });

    expect(guardianAuthDbMocks.registerGuardianFromIntake).not.toHaveBeenCalled();
    expect(cookies).toHaveLength(0);
  });

  it("requires explicit consent before registering", async () => {
    const { caller } = createPublicCaller({ handoffCookie: createValidHandoffCookie() });

    await expect(caller.guardianAuth.register({ ...registrationInput, termsAccepted: false })).rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(guardianAuthDbMocks.registerGuardianFromIntake).not.toHaveBeenCalled();
  });

  it("maps duplicate recovery to a generic safe error and does not start a session", async () => {
    guardianAuthDbMocks.registerGuardianFromIntake.mockRejectedValue(new GuardianRegistrationError("duplicate"));
    const { caller, cookies } = createPublicCaller({ handoffCookie: createValidHandoffCookie() });

    await expect(caller.guardianAuth.register(registrationInput)).rejects.toMatchObject({
      code: "CONFLICT",
      message: "এই তথ্য দিয়ে নিবন্ধন সম্পন্ন করা যাচ্ছে না। অনুগ্রহ করে সাইন ইন করুন অথবা অন্য তথ্য দিয়ে চেষ্টা করুন।",
    });

    expect(cookies).toHaveLength(0);
  });

  it("denies Tutor access to the Guardian-only private profile endpoint", async () => {
    const { caller } = createPublicCaller({
      user: { ...guardianUser, role: "tutor" },
    });

    await expect(caller.guardianProfile.me()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
