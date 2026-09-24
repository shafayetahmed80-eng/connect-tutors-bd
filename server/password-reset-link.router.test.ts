import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import { ENV } from "./_core/env";
import { hashAdminInviteToken } from "./admin-security";
import * as db from "./db";
import { __resetAuthRateLimitsForTests, appRouter } from "./routers";

const admin = {
  id: 7, openId: "password:admin:support", email: null, loginPhone: null, name: "Support Admin", passwordHash: null, loginMethod: "password",
  role: "admin" as const, accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guardian = { ...admin, id: 8, openId: "password:guardian:g@example.com", role: "guardian" as const };

function caller(user: TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "connecttutors.example", "x-forwarded-for": "203.0.113.20" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const token = "a1".repeat(32);

beforeEach(() => {
  __resetAuthRateLimitsForTests();
  vi.spyOn(console, "info").mockImplementation(() => {});
  vi.spyOn(db, "recordAuthEvent").mockResolvedValue({ id: 0 });
});
afterEach(() => vi.restoreAllMocks());

describe("issuing a password reset link", () => {
  it("gives an Admin a one-time link and stores only the token's HMAC", async () => {
    const create = vi.spyOn(db, "createPasswordResetLink").mockResolvedValue({ created: true, role: "tutor", name: "Tutor", identifier: "tutor@example.com" });

    const result = await caller(admin).admin.createPasswordResetLink({ userId: 55 });

    const issued = result.link.match(/^https:\/\/connecttutors\.example\/reset-password\/([a-f0-9]{64})$/)?.[1];
    expect(issued).toBeTruthy();
    expect(result.role).toBe("tutor");
    const stored = create.mock.calls[0]![0];
    expect(stored).toMatchObject({ userId: 55, createdByUserId: admin.id, tokenHash: hashAdminInviteToken(issued!, ENV.cookieSecret) });
    expect(stored.tokenHash).not.toBe(issued);
    expect(stored.expiresAt.getTime() - Date.now()).toBeGreaterThan(23 * 60 * 60 * 1000);
  });

  it("explains a suspended or closed account instead of issuing a useless link", async () => {
    vi.spyOn(db, "createPasswordResetLink").mockResolvedValue({ created: false, reason: "NOT_ACTIVE" });
    await expect(caller(admin).admin.createPasswordResetLink({ userId: 55 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is for Admins only", async () => {
    const create = vi.spyOn(db, "createPasswordResetLink");
    await expect(caller(guardian).admin.createPasswordResetLink({ userId: 55 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(null).admin.createPasswordResetLink({ userId: 55 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(create).not.toHaveBeenCalled();
  });
});

describe("using a password reset link", () => {
  it("tells the page whose link it is only while it is valid", async () => {
    vi.spyOn(db, "getPasswordResetLink").mockResolvedValueOnce({ status: "valid", role: "guardian", name: "Rahim", userId: 9, linkId: 1 }).mockResolvedValueOnce({ status: "expired" });

    await expect(caller(null).auth.checkPasswordResetLink({ token })).resolves.toEqual({ status: "valid", role: "guardian", name: "Rahim" });
    await expect(caller(null).auth.checkPasswordResetLink({ token })).resolves.toEqual({ status: "expired" });
  });

  it("stores a hash of the new password and names the account type", async () => {
    const use = vi.spyOn(db, "usePasswordResetLink").mockResolvedValue({ status: "valid", role: "tutor", name: "T", userId: 9, linkId: 1 });

    await expect(caller(null).auth.resetPasswordWithLink({ token, password: "brand-new-pass", confirmPassword: "brand-new-pass" })).resolves.toEqual({ role: "tutor" });
    const { tokenHash, passwordHash } = use.mock.calls[0]![0];
    expect(tokenHash).toBe(hashAdminInviteToken(token, ENV.cookieSecret));
    expect(passwordHash).not.toContain("brand-new-pass");
    expect(await db.verifyPassword("brand-new-pass", passwordHash)).toBe(true);
  });

  it("says plainly when the link was already used", async () => {
    vi.spyOn(db, "usePasswordResetLink").mockResolvedValue({ status: "used" });
    await expect(caller(null).auth.resetPasswordWithLink({ token, password: "brand-new-pass", confirmPassword: "brand-new-pass" })).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringMatching(/already been used/),
    });
  });

  it("refuses mismatched or short passwords before touching the link", async () => {
    const use = vi.spyOn(db, "usePasswordResetLink");
    await expect(caller(null).auth.resetPasswordWithLink({ token, password: "brand-new-pass", confirmPassword: "different-pass" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(null).auth.resetPasswordWithLink({ token, password: "short", confirmPassword: "short" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(use).not.toHaveBeenCalled();
  });
});
