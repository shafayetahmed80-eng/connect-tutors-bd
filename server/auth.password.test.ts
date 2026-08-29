import { describe, expect, it, vi, afterEach } from "vitest";
import { COOKIE_NAME } from "../shared/const";
import type { TrpcContext } from "./_core/context";
import { appRouter } from "./routers";
import * as db from "./db";
import { sdk } from "./_core/sdk";

const user = {
  id: 44,
  openId: "password:tutor:tutor@example.com",
  email: "tutor@example.com",
  name: "Test Tutor",
  passwordHash: null,
  loginMethod: "password",
  role: "tutor" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const adminUser = {
  id: 46,
  openId: "password:admin:admin",
  email: null,
  name: "Project Owner",
  passwordHash: null,
  loginMethod: "password",
  role: "admin" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createContext(
  cookieCalls: Array<{ name: string; value: string; options: Record<string, unknown> }>,
  authenticatedUser: TrpcContext["user"] = null,
): TrpcContext {
  return {
    user: authenticatedUser,
    req: { protocol: "https", headers: {} } as TrpcContext["req"],
    res: {
      cookie: (name: string, value: string, options: Record<string, unknown>) => cookieCalls.push({ name, value, options }),
    } as TrpcContext["res"],
  };
}

afterEach(() => vi.restoreAllMocks());

describe("Password account identifier normalization", () => {
  it("normalizes accepted email and Bangladesh mobile formats without accepting arbitrary input", () => {
    expect(db.normalizePasswordAccountIdentifier("  GUARDIAN@Example.COM ")).toEqual({
      kind: "email",
      value: "guardian@example.com",
    });
    expect(db.normalizePasswordAccountIdentifier("01712345678")).toEqual({
      kind: "phone",
      value: "+8801712345678",
    });
    expect(db.normalizePasswordAccountIdentifier("not-an-account-identifier")).toBeUndefined();
  });
});

describe("Tutor password authentication", () => {
  it("projects authenticated identity through a browser-safe allow-list", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const rawAuthenticatedUser = {
      ...user,
      loginPhone: "+8801712345678",
      passwordHash: "scrypt$private-password-hash",
    } as NonNullable<TrpcContext["user"]>;

    const authenticated = await appRouter.createCaller(createContext(cookies, rawAuthenticatedUser)).auth.me();
    const unauthenticated = await appRouter.createCaller(createContext(cookies)).auth.me();

    expect(authenticated).toEqual({
      id: user.id,
      name: user.name,
      role: "tutor",
      accountStatus: "active",
    });
    expect(authenticated).not.toHaveProperty("email");
    expect(authenticated).not.toHaveProperty("loginPhone");
    expect(authenticated).not.toHaveProperty("passwordHash");
    expect(authenticated).not.toHaveProperty("openId");
    expect(authenticated).not.toHaveProperty("loginMethod");
    expect(authenticated).not.toHaveProperty("createdAt");
    expect(authenticated).not.toHaveProperty("updatedAt");
    expect(authenticated).not.toHaveProperty("lastSignedIn");
    expect(unauthenticated).toBeNull();
  });

  it("hashes passwords without storing plaintext and verifies only the matching password", async () => {
    const password = "strong-pass-123";
    const encoded = await db.hashPassword(password);
    expect(encoded).toMatch(/^scrypt\$16384\$8\$1\$/);
    expect(encoded).not.toContain(password);
    await expect(db.verifyPassword(password, encoded)).resolves.toBe(true);
    await expect(db.verifyPassword("wrong-pass", encoded)).resolves.toBe(false);
  });

  it("logs in a Tutor and sets the shared app session cookie", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    vi.spyOn(db, "verifyTutorPassword").mockResolvedValue(user);
    vi.spyOn(db, "createTutorPortalSession").mockResolvedValue(undefined);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("signed-password-session");

    const result = await appRouter.createCaller(createContext(cookies)).auth.loginTutor({
      email: "Tutor@Example.com",
      password: "strong-pass-123",
    });

    expect(result.success).toBe(true);
    expect(result.user).not.toHaveProperty("email");
    expect(result.user).not.toHaveProperty("loginPhone");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.tutorPortalToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: "signed-password-session" });
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/" });
    expect(cookies[0]?.options).not.toHaveProperty("maxAge");
  });

  it("rejects invalid Tutor credentials without creating a session", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    vi.spyOn(db, "verifyTutorPassword").mockResolvedValue(undefined);

    await expect(appRouter.createCaller(createContext(cookies)).auth.loginTutor({
      email: "tutor@example.com",
      password: "wrong-pass",
    })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(cookies).toHaveLength(0);
  });

  it("registers a Tutor, allocates identity, and starts a session", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const registerPasswordTutor = vi.spyOn(db, "registerPasswordTutor").mockResolvedValue({
      created: true,
      user,
      registration: { id: 1, tutorNumber: 1503, userId: user.id, registeredAt: new Date() },
    });
    vi.spyOn(db, "createTutorPortalSession").mockResolvedValue(undefined);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("signed-registration-session");

    const registrationInput = {
      name: "Test Tutor",
      email: "tutor@example.com",
      password: "strong-pass-123",
      confirmPassword: "strong-pass-123",
      phone: "+8801712345678",
      gender: "male",
      cityId: "dhaka-city",
      locationId: "dhaka-city",
    } as const;
    const result = await appRouter.createCaller(createContext(cookies)).auth.registerTutor(registrationInput);

    expect(result.success).toBe(true);
    expect(registerPasswordTutor).toHaveBeenCalledWith(registrationInput);
    expect(result.user).toEqual({
      id: user.id,
      name: user.name,
      role: "tutor",
      accountStatus: "active",
    });
    expect(result.user).not.toHaveProperty("email");
    expect(result.user).not.toHaveProperty("loginPhone");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("openId");
    expect(result.user).not.toHaveProperty("loginMethod");
    expect(result.user).not.toHaveProperty("createdAt");
    expect(result.user).not.toHaveProperty("updatedAt");
    expect(result.user).not.toHaveProperty("lastSignedIn");
    expect(result.tutorRegistration?.tutorNumber).toBe(1503);
    expect(result.tutorRegistration?.registeredAt).toBeInstanceOf(Date);
    expect(result.tutorPortalToken).toMatch(/^[A-Za-z0-9_-]{43}$/);
    expect(cookies[0]?.name).toBe(COOKIE_NAME);
  });
});

describe("Guardian and Tutor account authentication", () => {
  it("accepts a Bangladesh mobile identifier only for the selected Guardian role", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const guardian = { ...user, id: 45, email: "guardian@example.com", role: "guardian" as const };
    const accountDb = db as typeof db & {
      verifyPasswordAccount: (input: { identifier: string; password: string; role: "guardian" | "tutor" }) => Promise<typeof guardian | undefined>;
    };
    const verifyPasswordAccount = vi.spyOn(accountDb, "verifyPasswordAccount").mockResolvedValue(guardian);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("signed-guardian-session");

    const result = await appRouter.createCaller(createContext(cookies)).auth.loginAccount({
      role: "guardian",
      identifier: "01712345678",
      password: "strong-pass-123",
    });

    expect(result).toMatchObject({ success: true, user: { id: guardian.id, role: "guardian" } });
    expect(result.user).not.toHaveProperty("email");
    expect(result.user).not.toHaveProperty("loginPhone");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(verifyPasswordAccount).toHaveBeenCalledWith({
      role: "guardian",
      identifier: "01712345678",
      password: "strong-pass-123",
    });
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: "signed-guardian-session" });
  });

  it("returns the same generic failure for invalid credentials or a role mismatch", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const accountDb = db as typeof db & {
      verifyPasswordAccount: (input: { identifier: string; password: string; role: "guardian" | "tutor" }) => Promise<typeof user | undefined>;
    };
    vi.spyOn(accountDb, "verifyPasswordAccount").mockResolvedValue(undefined);

    await expect(appRouter.createCaller(createContext(cookies)).auth.loginAccount({
      role: "tutor",
      identifier: "guardian@example.com",
      password: "strong-pass-123",
    })).rejects.toMatchObject({
      code: "UNAUTHORIZED",
      message: "Email/mobile number or password is not correct.",
    });
    expect(cookies).toHaveLength(0);
  });
});

describe("Admin User ID and password authentication", () => {
  it("accepts only an active Admin credential, creates the shared secure session, and returns a private-field-free identity", async () => {
    const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
    const adminDb = db as typeof db & {
      verifyAdminPassword: (input: { userId: string; password: string }) => Promise<typeof adminUser | undefined>;
    };
    const verifyAdminPassword = vi.spyOn(adminDb, "verifyAdminPassword").mockResolvedValue(adminUser);
    const logAdminAuditEvent = vi.spyOn(db, "logAdminAuditEvent").mockResolvedValue({ id: 18 } as never);
    vi.spyOn(sdk, "createSessionToken").mockResolvedValue("signed-admin-session");

    const result = await appRouter.createCaller(createContext(cookies)).auth.loginAdmin({
      userId: " Admin ",
      password: "strong-pass-123",
    });

    expect(result).toEqual({
      success: true,
      user: { id: adminUser.id, name: adminUser.name, role: "admin", accountStatus: "active" },
    });
    expect(verifyAdminPassword).toHaveBeenCalledWith({ userId: "Admin", password: "strong-pass-123" });
    expect(result.user).not.toHaveProperty("email");
    expect(result.user).not.toHaveProperty("passwordHash");
    expect(result.user).not.toHaveProperty("openId");
    expect(cookies[0]).toMatchObject({ name: COOKIE_NAME, value: "signed-admin-session" });
    expect(cookies[0]?.options).toMatchObject({ httpOnly: true, secure: true, sameSite: "none", path: "/" });
    expect(logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
      userId: adminUser.id,
      event: "login_success",
      metadata: expect.objectContaining({ reason: "password-login" }),
    }));
  });

  it("returns one generic failure and creates no session for an unknown User ID, wrong password, inactive account, or non-Admin account", async () => {
    const cases = ["unknown-user", "wrong-password", "inactive-account", "role-mismatch"];

    for (const scenario of cases) {
      const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
      const adminDb = db as typeof db & {
        verifyAdminPassword: (input: { userId: string; password: string }) => Promise<typeof adminUser | undefined>;
      };
      vi.spyOn(adminDb, "verifyAdminPassword").mockResolvedValue(undefined);
      const logAdminAuditEvent = vi.spyOn(db, "logAdminAuditEvent").mockResolvedValue({ id: 19 } as never);

      await expect(appRouter.createCaller(createContext(cookies)).auth.loginAdmin({
        userId: `Admin-${scenario}`,
        password: "wrong-pass",
      })).rejects.toMatchObject({
        code: "UNAUTHORIZED",
        message: "User ID or password is not correct.",
      });
      expect(cookies).toHaveLength(0);
      expect(logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({
        event: "login_failure",
        metadata: expect.objectContaining({ reason: "invalid-password-credentials" }),
      }));
      vi.restoreAllMocks();
    }
  });
});
