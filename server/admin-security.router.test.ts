import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const securityDbMocks = vi.hoisted(() => ({
  createAdminAccount: vi.fn(),
  getAdminPasswordChangeRequired: vi.fn(),
  getAdminTwoFactorSettings: vi.fn(),
  getGuardianContactForAdmin: vi.fn(),
  getOwnerAdminActivityReport: vi.fn(),
  listAuthEventsPage: vi.fn(),
  listPublishedTutorJobs: vi.fn(),
  listTutorRequestMatchingPage: vi.fn(),
  logAdminAuditEvent: vi.fn(),
  moderateTutorProfile: vi.fn(),
  moderateTutorRequestPublication: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...securityDbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";
import { authEventTypeValues } from "../drizzle/schema";

const adminUser = {
  id: 42,
  openId: ENV.ownerOpenId,
  email: "owner@example.com",
  name: "Project Owner",
  passwordHash: null,
  loginMethod: "oauth",
  role: "admin" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = adminUser) {
  const caller = appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "connecttutor.example" } },
    res: { cookie() {}, clearCookie() {}, setHeader() {} },
  } as unknown as TrpcContext);
  return { caller };
}

beforeEach(() => {
  vi.clearAllMocks();
  securityDbMocks.logAdminAuditEvent.mockResolvedValue({ id: 1 });
  securityDbMocks.getAdminPasswordChangeRequired.mockResolvedValue(false);
});
afterEach(() => vi.restoreAllMocks());

describe("Admin role and Owner authorization", () => {
  it("allows an Admin matching access without 2FA enrollment or a 2FA proof cookie", async () => {
    securityDbMocks.listTutorRequestMatchingPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const { caller } = createCaller();

    await expect(caller.admin.listMatchingRequests({})).resolves.toMatchObject({ total: 0, totalPages: 1 });
    expect(securityDbMocks.listTutorRequestMatchingPage).toHaveBeenCalledOnce();
  });

  it("keeps Admin matching inaccessible to non-Admin accounts", async () => {
    const { caller } = createCaller({ ...adminUser, id: 11, role: "guardian" });

    await expect(caller.admin.listMatchingRequests({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(securityDbMocks.listTutorRequestMatchingPage).not.toHaveBeenCalled();
  });

  it("refuses an enrolled Admin who has not cleared this browser's two-factor challenge", async () => {
    securityDbMocks.getAdminTwoFactorSettings.mockResolvedValue({ userId: adminUser.id, secretCiphertext: "x", enabledAt: new Date(), lastVerifiedAt: new Date() });
    const { caller } = createCaller();

    await expect(caller.admin.listMatchingRequests({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(securityDbMocks.listTutorRequestMatchingPage).not.toHaveBeenCalled();
    // The two-factor lifecycle itself stays reachable so the Admin can clear the challenge.
    securityDbMocks.getAdminTwoFactorSettings.mockResolvedValue({ userId: adminUser.id, secretCiphertext: "x", enabledAt: new Date(), lastVerifiedAt: new Date() });
    await expect(caller.admin.twoFactorStatus()).resolves.toMatchObject({ enrolled: true, verified: false });
  });

  it("lets an Admin moderate Tutor profiles without an interactive two-factor challenge", async () => {
    securityDbMocks.moderateTutorProfile.mockResolvedValue({ updated: true, nextStatus: "approved" });
    const { caller } = createCaller();
    const adminCaller = caller.admin as unknown as {
      moderateTutorProfile: (input: { tutorId: string; nextStatus: "approved" }) => Promise<{ nextStatus: string }>;
    };

    await expect(adminCaller.moderateTutorProfile({ tutorId: "1503", nextStatus: "approved" })).resolves.toMatchObject({ nextStatus: "approved" });
    expect(securityDbMocks.moderateTutorProfile).toHaveBeenCalledWith({ tutorId: "1503", nextStatus: "approved", adminUserId: adminUser.id });
  });

  it("passes an Admin publication decision without a 2FA session to the safe database workflow", async () => {
    securityDbMocks.moderateTutorRequestPublication.mockResolvedValue({ updated: true, eventId: 9, previousState: "reviewing", nextState: "approved" });
    const { caller } = createCaller();
    const adminCaller = caller.admin as unknown as {
      moderateTutorRequestPublication: (input: { requestId: number; action: "approve" }) => Promise<{ nextState: string }>;
    };

    await expect(adminCaller.moderateTutorRequestPublication({ requestId: 23, action: "approve" })).resolves.toMatchObject({ nextState: "approved" });
    expect(securityDbMocks.moderateTutorRequestPublication).toHaveBeenCalledWith({ requestId: 23, action: "approve", adminUserId: adminUser.id });
  });

  it("returns Guardian contact only through the role-protected Admin detail contract", async () => {
    securityDbMocks.getGuardianContactForAdmin.mockResolvedValue({
      requestId: 23,
      name: "Guardian Name",
      email: "guardian@example.com",
      phone: "+8801712345678",
      locationLabel: "Dhaka",
    });
    const { caller } = createCaller();
    const adminCaller = caller.admin as unknown as {
      getGuardianContact: (input: { requestId: number }) => Promise<{ phone: string }>;
    };

    await expect(adminCaller.getGuardianContact({ requestId: 23 })).resolves.toMatchObject({ phone: "+8801712345678" });
    expect(securityDbMocks.getGuardianContactForAdmin).toHaveBeenCalledWith({ requestId: 23, adminUserId: adminUser.id });
  });

  it("returns activity reporting only to the Owner without an interactive two-factor challenge", async () => {
    securityDbMocks.getOwnerAdminActivityReport.mockResolvedValue({ windowDays: 30, totals: { activeAdmins: 2 }, adminSummaries: [], recentEvents: [] });
    const { caller } = createCaller();
    const ownerCaller = caller.admin as unknown as {
      getActivityReport: (input: { windowDays: 7 | 30 | 90 }) => Promise<{ windowDays: number; totals: { activeAdmins: number } }>;
    };

    await expect(ownerCaller.getActivityReport({ windowDays: 30 })).resolves.toMatchObject({ windowDays: 30, totals: { activeAdmins: 2 } });
    expect(securityDbMocks.getOwnerAdminActivityReport).toHaveBeenCalledWith({ windowDays: 30 });
  });

  it("does not expose Admin activity reporting to a non-Owner Admin", async () => {
    const anotherAdmin = { ...adminUser, id: 73, openId: "admin:73", email: "admin@example.com" };
    const { caller } = createCaller(anotherAdmin);
    const adminCaller = caller.admin as unknown as { getActivityReport: (input: { windowDays: 7 | 30 | 90 }) => Promise<unknown> };

    await expect(adminCaller.getActivityReport({ windowDays: 7 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(securityDbMocks.getOwnerAdminActivityReport).not.toHaveBeenCalled();
  });

  it("returns the paginated public auth-events log only to the Owner, forwarding normalized filters", async () => {
    securityDbMocks.listAuthEventsPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const owner = createCaller().caller.admin as unknown as { getAuthEvents: (input: unknown) => Promise<{ total: number }> };

    await expect(owner.getAuthEvents({ event: "login_failure", role: "tutor", ip: " 203.0.113.9 ", page: 2 })).resolves.toMatchObject({ total: 0 });
    expect(securityDbMocks.listAuthEventsPage).toHaveBeenCalledWith({ event: "login_failure", role: "tutor", ip: "203.0.113.9", page: 2, pageSize: 20 });

    securityDbMocks.listAuthEventsPage.mockClear();
    await expect(owner.getAuthEvents({})).resolves.toMatchObject({ total: 0 });
    expect(securityDbMocks.listAuthEventsPage).toHaveBeenCalledWith({ event: "all", role: "all", ip: undefined, page: 1, pageSize: 20 });
  });

  it("accepts every persisted auth-event type as a filter", async () => {
    securityDbMocks.listAuthEventsPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const owner = createCaller().caller.admin as unknown as { getAuthEvents: (input: unknown) => Promise<unknown> };

    for (const event of authEventTypeValues) {
      await expect(owner.getAuthEvents({ event })).resolves.toBeDefined();
    }
  });

  it("does not expose the public auth-events log to a non-Owner Admin", async () => {
    const anotherAdmin = { ...adminUser, id: 74, openId: "admin:74", email: "admin2@example.com" };
    const caller = createCaller(anotherAdmin).caller.admin as unknown as { getAuthEvents: (input: unknown) => Promise<unknown> };

    await expect(caller.getAuthEvents({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(securityDbMocks.listAuthEventsPage).not.toHaveBeenCalled();
  });

  describe("the Owner creating an Admin", () => {
    const input = { loginId: "rahim", name: "Rahim", email: "rahim@example.com", password: "a-strong-pass", confirmPassword: "a-strong-pass" };

    it("makes the account with the Owner's first password and writes it to the audit log", async () => {
      securityDbMocks.createAdminAccount.mockResolvedValue({ created: true, userId: 90, loginId: "rahim" });
      await expect(createCaller().caller.admin.createAdmin(input)).resolves.toEqual({ userId: 90, loginId: "rahim" });
      expect(securityDbMocks.createAdminAccount).toHaveBeenCalledWith({ loginId: "rahim", password: "a-strong-pass", name: "Rahim", email: "rahim@example.com" });
      expect(securityDbMocks.logAdminAuditEvent).toHaveBeenCalledWith(expect.objectContaining({ userId: 90, event: "credential_provisioned", metadata: expect.objectContaining({ provisionedByUserId: adminUser.id }) }));
    });

    it("is for the Owner alone", async () => {
      const anotherAdmin = { ...adminUser, id: 74, openId: "admin:74" };
      await expect(createCaller(anotherAdmin).caller.admin.createAdmin(input)).rejects.toMatchObject({ code: "FORBIDDEN" });
      expect(securityDbMocks.createAdminAccount).not.toHaveBeenCalled();
    });

    it("turns away passwords that do not match", async () => {
      await expect(createCaller().caller.admin.createAdmin({ ...input, confirmPassword: "something-else" })).rejects.toThrow(/do not match/i);
      expect(securityDbMocks.createAdminAccount).not.toHaveBeenCalled();
    });

    it("says plainly when the User ID or the email is already taken", async () => {
      securityDbMocks.createAdminAccount.mockResolvedValueOnce({ created: false, reason: "LOGIN_ID_IN_USE" });
      await expect(createCaller().caller.admin.createAdmin(input)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("User ID") });
      securityDbMocks.createAdminAccount.mockResolvedValueOnce({ created: false, reason: "EMAIL_IN_USE" });
      await expect(createCaller().caller.admin.createAdmin(input)).rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("email") });
    });
  });

  describe("an Admin still on the Owner's temporary password", () => {
    it("is held out of every workspace call until the password is changed", async () => {
      securityDbMocks.getAdminPasswordChangeRequired.mockResolvedValue(true);
      securityDbMocks.listTutorRequestMatchingPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
      await expect(createCaller().caller.admin.listMatchingRequests({})).rejects.toMatchObject({ code: "FORBIDDEN", message: expect.stringContaining("10005") });
      expect(securityDbMocks.listTutorRequestMatchingPage).not.toHaveBeenCalled();
    });

    it("can still ask whether a change is owed, so the page knows to send them to it", async () => {
      securityDbMocks.getAdminPasswordChangeRequired.mockResolvedValue(true);
      await expect(createCaller().caller.admin.getWorkspaceAccess()).resolves.toMatchObject({ passwordChangeRequired: true });
    });
  });

  it("exposes published job cards through the public router without private request fields", async () => {
    securityDbMocks.listPublishedTutorJobs.mockResolvedValue({
      items: [{ publicJobId: "CTB-260821-023", title: "Need English Tutor", locationLabel: "Mirpur 10" }],
      totalCount: 1,
    });
    const { caller } = createCaller(null);

    await expect(caller.jobBoard.list({ page: 1, pageSize: 12 })).resolves.toMatchObject({ totalCount: 1 });
    expect(securityDbMocks.listPublishedTutorJobs).toHaveBeenCalledWith({ page: 1, pageSize: 12 });
  });
});
