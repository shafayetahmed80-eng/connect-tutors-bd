import { beforeEach, describe, expect, it, vi } from "vitest";
import { ADMIN_SESSION_TTL_MS, ADMIN_TWO_FACTOR_COOKIE_NAME, COOKIE_NAME, ADMIN_TWO_FACTOR_SESSION_TTL_MS } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAdminTwoFactorSettings: vi.fn(),
  getAdminPasswordChangeRequired: vi.fn(),
  endAllSessionsFor: vi.fn(),
  getUserById: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  changeOwnPasswordByUserId: vi.fn(),
  provisionAdminPasswordCredential: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { createAdminTwoFactorSessionProof } from "./admin-security";
import { ENV } from "./_core/env";
import { sdk } from "./_core/sdk";
import { appRouter, __resetAuthRateLimitsForTests } from "./routers";

const ownerUser = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Project Owner",
  passwordHash: "x", loginMethod: "password", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionsValidFrom: null,
};
const otherAdmin = { ...ownerUser, id: 73, openId: "password:admin:other", email: "admin@example.com", name: "Other Admin" };

function caller(user: typeof ownerUser, cookieHeader = "") {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const res = {
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => { cookies.push({ name, value, options }); }),
    clearCookie: vi.fn(),
  };
  const req = { protocol: "https", headers: { host: "connecttutors.example", cookie: cookieHeader } };
  return { caller: appRouter.createCaller({ user, req, res } as unknown as TrpcContext), cookies };
}

const secondFactorCookie = (userId: number) =>
  `${ADMIN_TWO_FACTOR_COOKIE_NAME}=${createAdminTwoFactorSessionProof(userId, ENV.cookieSecret, Date.now() + ADMIN_TWO_FACTOR_SESSION_TTL_MS)}`;

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
  vi.spyOn(sdk, "createSessionToken").mockResolvedValue("fresh-session");
  dbMocks.getAdminTwoFactorSettings.mockResolvedValue(undefined);
  dbMocks.getAdminPasswordChangeRequired.mockResolvedValue(false);
  dbMocks.endAllSessionsFor.mockResolvedValue({ ended: true, validFrom: new Date() });
  dbMocks.logAdminAuditEvent.mockResolvedValue({ id: 1 });
});

describe("an Admin signing themselves out everywhere", () => {
  it("ends their sessions, records it, and hands this browser a fresh 30-day session", async () => {
    const { caller: admin, cookies } = caller(otherAdmin);

    await expect(admin.admin.signOutEverywhere()).resolves.toEqual({ success: true });

    expect(dbMocks.endAllSessionsFor).toHaveBeenCalledWith(otherAdmin.id);
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: otherAdmin.id, event: "sessions_ended" }));
    expect(cookies).toEqual([expect.objectContaining({ name: COOKIE_NAME, value: "fresh-session", options: expect.objectContaining({ maxAge: ADMIN_SESSION_TTL_MS }) })]);
  });

  it("keeps the second factor this browser had already cleared, so it is not asked again at once", async () => {
    dbMocks.getAdminTwoFactorSettings.mockResolvedValue({ userId: otherAdmin.id });
    const { caller: admin, cookies } = caller(otherAdmin, secondFactorCookie(otherAdmin.id));

    await admin.admin.signOutEverywhere();

    expect(cookies.map(cookie => cookie.name)).toEqual([COOKIE_NAME, ADMIN_TWO_FACTOR_COOKIE_NAME]);
  });

  it("does not hand out a second-factor proof to a browser that never had one", async () => {
    const { caller: admin, cookies } = caller(otherAdmin);

    await admin.admin.signOutEverywhere();

    expect(cookies.map(cookie => cookie.name)).not.toContain(ADMIN_TWO_FACTOR_COOKIE_NAME);
  });

  it("refuses someone who is not an Admin", async () => {
    const guardian = { ...otherAdmin, role: "guardian" as const };
    await expect(caller(guardian).caller.admin.signOutEverywhere()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.endAllSessionsFor).not.toHaveBeenCalled();
  });
});

describe("the Owner signing another Admin out everywhere", () => {
  it("ends that Admin's sessions and leaves the Owner's own browser alone", async () => {
    dbMocks.getUserById.mockResolvedValue(otherAdmin);
    const { caller: owner, cookies } = caller(ownerUser);

    await owner.admin.signOutAdminEverywhere({ userId: otherAdmin.id });

    expect(dbMocks.endAllSessionsFor).toHaveBeenCalledWith(otherAdmin.id);
    expect(dbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: otherAdmin.id, event: "sessions_ended" }));
    expect(cookies).toEqual([]);
  });

  it("keeps the Owner's own browser signed in when the Owner picks themselves", async () => {
    dbMocks.getUserById.mockResolvedValue(ownerUser);
    const { caller: owner, cookies } = caller(ownerUser);

    await owner.admin.signOutAdminEverywhere({ userId: ownerUser.id });

    expect(cookies.map(cookie => cookie.name)).toEqual([COOKIE_NAME]);
  });

  it("will not sign out an account that is not an Admin", async () => {
    dbMocks.getUserById.mockResolvedValue({ ...otherAdmin, role: "tutor" });
    await expect(caller(ownerUser).caller.admin.signOutAdminEverywhere({ userId: 99 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    expect(dbMocks.endAllSessionsFor).not.toHaveBeenCalled();
  });

  it("is for the Owner only", async () => {
    await expect(caller(otherAdmin).caller.admin.signOutAdminEverywhere({ userId: ownerUser.id })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.endAllSessionsFor).not.toHaveBeenCalled();
  });
});

describe("a new Admin password", () => {
  it("signs this browser straight back in, because every other session is ended by it", async () => {
    dbMocks.changeOwnPasswordByUserId.mockResolvedValue("changed");
    const { caller: admin, cookies } = caller(otherAdmin);

    await admin.account.changePassword({ currentPassword: "old-password-1", newPassword: "new-password-2", confirmNewPassword: "new-password-2" });

    expect(cookies).toEqual([expect.objectContaining({ name: COOKIE_NAME, options: expect.objectContaining({ maxAge: ADMIN_SESSION_TTL_MS }) })]);
  });

  it("gives a wrong current password no new session", async () => {
    dbMocks.changeOwnPasswordByUserId.mockResolvedValue("invalid-current-password");
    const { caller: admin, cookies } = caller(otherAdmin);

    await expect(admin.account.changePassword({ currentPassword: "wrong-pass-1", newPassword: "new-password-2", confirmNewPassword: "new-password-2" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(cookies).toEqual([]);
  });
});

describe("the Owner resetting credentials", () => {
  it("signs the Owner's own browser back in when it is their own credentials, and nobody's when it is another Admin's", async () => {
    dbMocks.provisionAdminPasswordCredential.mockResolvedValue({ updated: true, action: "reset" });
    const own = caller(ownerUser);
    await own.caller.admin.provisionPasswordCredential({ userId: ownerUser.id, loginId: "owner", password: "brand-new-pass-1", confirmPassword: "brand-new-pass-1" });
    expect(own.cookies.map(cookie => cookie.name)).toEqual([COOKIE_NAME]);

    const other = caller(ownerUser);
    await other.caller.admin.provisionPasswordCredential({ userId: otherAdmin.id, loginId: "other", password: "brand-new-pass-1", confirmPassword: "brand-new-pass-1" });
    expect(other.cookies).toEqual([]);
  });
});
