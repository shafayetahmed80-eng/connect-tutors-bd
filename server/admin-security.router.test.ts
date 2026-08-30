import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const securityDbMocks = vi.hoisted(() => ({
  acceptAdminInvitation: vi.fn(),
  getActiveAdminInvitationByTokenHash: vi.fn(),
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
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
  return { caller };
}

beforeEach(() => {
  vi.clearAllMocks();
  securityDbMocks.logAdminAuditEvent.mockResolvedValue({ id: 1 });
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

  it("lets an invited signed-in account accept its email-bound invitation before it is promoted", async () => {
    const invitedUser = { ...adminUser, id: 71, role: "guardian" as const, email: "invitee@example.com", openId: "password:guardian:invitee@example.com" };
    securityDbMocks.getActiveAdminInvitationByTokenHash.mockResolvedValue({ id: 8, email: "invitee@example.com", status: "pending", expiresAt: new Date(Date.now() + 60_000), createdByUserId: adminUser.id });
    securityDbMocks.acceptAdminInvitation.mockResolvedValue({ accepted: true, acceptedAt: new Date() });
    const { caller } = createCaller(invitedUser);

    await expect(caller.admin.acceptInvitation({ token: "a".repeat(64) })).resolves.toEqual({ accepted: true });
    expect(securityDbMocks.acceptAdminInvitation).toHaveBeenCalledWith({ invitationId: 8, userId: 71, email: "invitee@example.com" });
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
