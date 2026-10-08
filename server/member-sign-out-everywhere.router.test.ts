import { beforeEach, describe, expect, it, vi } from "vitest";
import { COOKIE_NAME, ONE_YEAR_MS } from "../shared/const";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getTutorGuardianLoginOtpSettings: vi.fn(),
  endAllSessionsFor: vi.fn(),
  revokeOtherTutorPortalSessions: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { sdk } from "./_core/sdk";
import { appRouter, __resetAuthRateLimitsForTests } from "./routers";
import { TUTOR_PORTAL_SESSION_HEADER, hashTutorPortalToken } from "./tutor-portal-session";

const base = {
  email: "person@example.com", name: "Rina Akter", passwordHash: "x", loginMethod: "password",
  accountStatus: "active" as const, createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(), sessionsValidFrom: null,
};
const guardian = { ...base, id: 7, openId: "guardian:7", role: "guardian" as const };
const tutor = { ...base, id: 8, openId: "tutor:8", role: "tutor" as const };
const admin = { ...base, id: 9, openId: "admin:9", role: "admin" as const };

function caller(user: TrpcContext["user"], headers: Record<string, string> = {}) {
  const cookies: Array<{ name: string; value: string; options: Record<string, unknown> }> = [];
  const res = {
    cookie: vi.fn((name: string, value: string, options: Record<string, unknown>) => { cookies.push({ name, value, options }); }),
    clearCookie: vi.fn(),
  };
  const req = { protocol: "https", headers: { host: "connecttutors.example", ...headers } };
  return { caller: appRouter.createCaller({ user, req, res } as unknown as TrpcContext), cookies };
}

beforeEach(() => {
  vi.clearAllMocks();
  __resetAuthRateLimitsForTests();
  vi.spyOn(sdk, "createSessionToken").mockResolvedValue("fresh-session");
  dbMocks.getTutorGuardianLoginOtpSettings.mockResolvedValue({ enabled: false, rememberDays: 30, epoch: 0 });
  dbMocks.endAllSessionsFor.mockResolvedValue({ ended: true, validFrom: new Date() });
});

describe("a Guardian or Tutor signing out everywhere", () => {
  it("ends a Guardian's other sessions and hands this browser a fresh one", async () => {
    const { caller: asGuardian, cookies } = caller(guardian);

    await expect(asGuardian.account.signOutEverywhere()).resolves.toEqual({ success: true });

    expect(dbMocks.endAllSessionsFor).toHaveBeenCalledWith(guardian.id);
    expect(dbMocks.revokeOtherTutorPortalSessions).not.toHaveBeenCalled();
    expect(cookies).toEqual([expect.objectContaining({ name: COOKIE_NAME, value: "fresh-session", options: expect.objectContaining({ maxAge: ONE_YEAR_MS }) })]);
  });

  it("ends a Tutor's other portal tabs too, but not the tab being used", async () => {
    const { caller: asTutor, cookies } = caller(tutor, { [TUTOR_PORTAL_SESSION_HEADER]: "this-tab-token" });

    await asTutor.account.signOutEverywhere();

    expect(dbMocks.endAllSessionsFor).toHaveBeenCalledWith(tutor.id);
    expect(dbMocks.revokeOtherTutorPortalSessions).toHaveBeenCalledWith(expect.objectContaining({ userId: tutor.id, exceptTokenHash: hashTutorPortalToken("this-tab-token") }));
    expect(cookies.map(cookie => cookie.name)).toEqual([COOKIE_NAME]);
  });

  it("ends every Tutor portal tab if this request names none", async () => {
    await caller(tutor).caller.account.signOutEverywhere();

    expect(dbMocks.revokeOtherTutorPortalSessions).toHaveBeenCalledWith(expect.objectContaining({ userId: tutor.id, exceptTokenHash: undefined }));
  });

  it("is not for an Admin, who has their own that also keeps the remembered second factor", async () => {
    await expect(caller(admin).caller.account.signOutEverywhere()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.endAllSessionsFor).not.toHaveBeenCalled();
  });

  it("needs someone signed in", async () => {
    await expect(caller(null).caller.account.signOutEverywhere()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.endAllSessionsFor).not.toHaveBeenCalled();
  });
});
