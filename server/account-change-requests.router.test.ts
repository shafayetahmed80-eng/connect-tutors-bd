import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAccountChangeContextByUserId: vi.fn(),
  listOwnAccountChangeRequests: vi.fn(),
  isMobileTakenByAnotherAccount: vi.fn(),
  createAccountChangeRequest: vi.fn(),
  withdrawAccountChangeRequest: vi.fn(),
  updateOwnerAdminContact: vi.fn(),
  listAccountChangeRequestsForAdmin: vi.fn(),
  countPendingAccountChangeRequests: vi.fn(),
  decideAccountChangeRequest: vi.fn(),
  verifyOwnPasswordByUserId: vi.fn(),
  listAccountChangeHistoryForUser: vi.fn(),
  getUserRoleById: vi.fn(),
  listGuardianProfilesForAdmin: vi.fn(),
  listGuardianRequestActions: vi.fn(),
  countGuardianRequestActions: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const base = {
  id: 7, openId: "user-7", email: "person@example.com", name: "Rina Akter",
  passwordHash: null, loginMethod: "password", accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guardianUser = { ...base, role: "guardian" as const };
const owner = { ...base, id: 1, role: "admin" as const, openId: ENV.ownerOpenId };
const otherAdmin = { ...base, id: 2, role: "admin" as const, openId: "admin-2" };

function createCaller(user: TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const guardianContext = {
  role: "guardian", isOwner: false, currentName: "Rina Akter", currentMobile: "+8801711111111", waitingTypes: [],
  verification: { status: "unverified", nidFrontUploaded: true, nidBackUploaded: true }, liveTuition: false,
};

afterEach(() => vi.clearAllMocks());

describe("account.changeRequests", () => {
  it("tells the account what it may ask for, what it has now, and its requests so far", async () => {
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue(guardianContext);
    dbMocks.listOwnAccountChangeRequests.mockResolvedValue([{ id: 3, type: "name", status: "pending" }]);

    await expect(createCaller(guardianUser).account.changeRequests()).resolves.toEqual({
      offered: ["name", "mobile", "verification", "close_account"],
      isOwner: false,
      currentName: "Rina Akter",
      currentMobile: "+8801711111111",
      liveTuition: false,
      requests: [{ id: 3, type: "name", status: "pending" }],
    });
  });
});

describe("account.requestChange", () => {
  it("stores a request with the value it replaces", async () => {
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue(guardianContext);
    dbMocks.isMobileTakenByAnotherAccount.mockResolvedValue(false);
    dbMocks.createAccountChangeRequest.mockResolvedValue({ outcome: "requested", id: 9 });

    await expect(createCaller(guardianUser).account.requestChange({ type: "mobile", value: "01822222222" })).resolves.toEqual({ requested: true, id: 9 });
    expect(dbMocks.createAccountChangeRequest).toHaveBeenCalledWith({
      userId: 7, role: "guardian", type: "mobile", currentValue: "+8801711111111", requestedValue: "+8801822222222", reason: null,
    });
  });

  it("refuses with the rule's own words, before anything is stored", async () => {
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue({ ...guardianContext, liveTuition: true });
    await expect(createCaller(guardianUser).account.requestChange({ type: "close_account", reason: "Moving abroad" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("still running") });

    dbMocks.getAccountChangeContextByUserId.mockResolvedValue(guardianContext);
    dbMocks.isMobileTakenByAnotherAccount.mockResolvedValue(true);
    await expect(createCaller(guardianUser).account.requestChange({ type: "mobile", value: "01822222222" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "This mobile number is already used by another account." });
    expect(dbMocks.createAccountChangeRequest).not.toHaveBeenCalled();
  });

  it("gives nothing to the Owner to ask for, and nothing to a signed-out visitor", async () => {
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue({ role: "admin", isOwner: true, currentName: "Owner", currentMobile: null, waitingTypes: [], liveTuition: false });
    await expect(createCaller(owner).account.requestChange({ type: "name", value: "Someone" })).rejects.toMatchObject({ code: "CONFLICT" });
    await expect(createCaller(null).account.requestChange({ type: "name", value: "Someone" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});

describe("account.withdrawChange", () => {
  it("takes a waiting request back, and says so when there is none", async () => {
    dbMocks.withdrawAccountChangeRequest.mockResolvedValueOnce({ withdrawn: true });
    await expect(createCaller(guardianUser).account.withdrawChange({ type: "name" })).resolves.toEqual({ withdrawn: true });
    expect(dbMocks.withdrawAccountChangeRequest).toHaveBeenCalledWith({ userId: 7, type: "name" });

    dbMocks.withdrawAccountChangeRequest.mockResolvedValueOnce({ withdrawn: false });
    await expect(createCaller(guardianUser).account.withdrawChange({ type: "name" })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});

describe("account.updateOwnerContact", () => {
  it("lets the Project Owner change their own name and mobile directly, and nobody else", async () => {
    dbMocks.updateOwnerAdminContact.mockResolvedValue({ updated: true });
    await createCaller(owner).account.updateOwnerContact({ name: " Site Owner ", phone: "01700000000" });
    expect(dbMocks.updateOwnerAdminContact).toHaveBeenCalledWith({ userId: 1, name: "Site Owner", phone: "01700000000" });

    await expect(createCaller({ ...owner, openId: "another-admin" }).account.updateOwnerContact({ name: "Someone" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller(guardianUser).account.updateOwnerContact({ name: "Someone" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("accountChanges (the Admin queue)", () => {
  it("shows another Admin's requests to the Project Owner only", async () => {
    dbMocks.listAccountChangeRequestsForAdmin.mockResolvedValue({ items: [], counts: { pending: 0, approved: 0, declined: 0 } });
    await createCaller(owner).accountChanges.list({ status: "pending" });
    expect(dbMocks.listAccountChangeRequestsForAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ status: "pending", role: "all", type: "all", includeAdminRequests: true }));
    await createCaller(otherAdmin).accountChanges.list({ status: "approved", role: "tutor" });
    expect(dbMocks.listAccountChangeRequestsForAdmin).toHaveBeenLastCalledWith(expect.objectContaining({ status: "approved", role: "tutor", includeAdminRequests: false }));

    dbMocks.countPendingAccountChangeRequests.mockResolvedValue(3);
    await expect(createCaller(otherAdmin).accountChanges.pendingCount()).resolves.toBe(3);
    expect(dbMocks.countPendingAccountChangeRequests).toHaveBeenCalledWith({ includeAdminRequests: false });
  });

  it("is closed to Guardians and Tutors", async () => {
    await expect(createCaller(guardianUser).accountChanges.list({ status: "pending" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller(guardianUser).accountChanges.decide({ requestId: 3, decision: "approve" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.decideAccountChangeRequest).not.toHaveBeenCalled();
  });

  it("decides as the signed-in Admin, and refuses in the rule's own words", async () => {
    dbMocks.decideAccountChangeRequest.mockResolvedValueOnce({ outcome: "decided", status: "declined" });
    await expect(createCaller(otherAdmin).accountChanges.decide({ requestId: 3, decision: "decline", declineReason: " Use your NID name. " }))
      .resolves.toEqual({ status: "declined" });
    expect(dbMocks.decideAccountChangeRequest).toHaveBeenCalledWith({ requestId: 3, decision: "decline", declineReason: "Use your NID name.", adminUserId: 2, isOwner: false });

    dbMocks.decideAccountChangeRequest.mockResolvedValueOnce({ outcome: "refused", reason: "owner_only" });
    await expect(createCaller(otherAdmin).accountChanges.decide({ requestId: 4, decision: "approve" }))
      .rejects.toMatchObject({ code: "FORBIDDEN", message: "Only the Project Owner decides another Admin's request." });

    dbMocks.decideAccountChangeRequest.mockResolvedValueOnce({ outcome: "refused", reason: "mobile_taken" });
    await expect(createCaller(owner).accountChanges.decide({ requestId: 5, decision: "approve" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("used by another account") });
  });
});

describe("one account's request history", () => {
  it("is read by any Admin for a Guardian or Tutor, and only by the Project Owner for another Admin", async () => {
    dbMocks.listAccountChangeHistoryForUser.mockResolvedValue([{ id: 3, type: "name", status: "withdrawn" }]);
    dbMocks.getUserRoleById.mockResolvedValueOnce("guardian");
    await expect(createCaller(otherAdmin).accountChanges.history({ userId: 21 })).resolves.toEqual([{ id: 3, type: "name", status: "withdrawn" }]);

    dbMocks.getUserRoleById.mockResolvedValueOnce("admin");
    await expect(createCaller(otherAdmin).accountChanges.history({ userId: 5 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    dbMocks.getUserRoleById.mockResolvedValueOnce("admin");
    await expect(createCaller(owner).accountChanges.history({ userId: 5 })).resolves.toHaveLength(1);
    expect(dbMocks.listAccountChangeHistoryForUser).toHaveBeenCalledTimes(2);
  });
});

describe("admin.listGuardianProfiles", () => {
  it("passes the search, tab and page through, and is closed to a Guardian", async () => {
    dbMocks.listGuardianProfilesForAdmin.mockResolvedValue({ items: [], counts: { all: 0, unverified: 0, verified: 0, rejected: 0 }, totalPages: 1 });
    await createCaller(otherAdmin).admin.listGuardianProfiles({ query: " Rina ", verification: "verified" });
    expect(dbMocks.listGuardianProfilesForAdmin).toHaveBeenCalledWith({ query: "Rina", verification: "verified", page: 1, pageSize: 20 });
    await expect(createCaller(guardianUser).admin.listGuardianProfiles({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("a delete request", () => {
  it("is sent only with the account's own password, which is never stored", async () => {
    dbMocks.getAccountChangeContextByUserId.mockResolvedValue(guardianContext);
    dbMocks.verifyOwnPasswordByUserId.mockResolvedValueOnce(false);
    await expect(createCaller(guardianUser).account.requestChange({ type: "close_account", reason: "Moving abroad", password: "wrong" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Your password is incorrect." });
    expect(dbMocks.createAccountChangeRequest).not.toHaveBeenCalled();

    dbMocks.verifyOwnPasswordByUserId.mockResolvedValueOnce(true);
    dbMocks.createAccountChangeRequest.mockResolvedValue({ outcome: "requested", id: 12 });
    await createCaller(guardianUser).account.requestChange({ type: "close_account", reason: "Moving abroad", password: "right-one" });
    expect(dbMocks.verifyOwnPasswordByUserId).toHaveBeenLastCalledWith(7, "right-one");
    expect(dbMocks.createAccountChangeRequest).toHaveBeenCalledWith(expect.not.objectContaining({ password: expect.anything() }));
  });
});

describe("Guardian Requests screens", () => {
  it("are read by any Admin, one kind at a time, and closed to everyone else", async () => {
    dbMocks.listGuardianRequestActions.mockResolvedValue({ items: [], counts: { pending: 0, approved: 0, declined: 0 }, totalPages: 1 });
    dbMocks.countGuardianRequestActions.mockResolvedValue({ shortlist: 1, appoint: 2, confirm: 3, cancel: 4 });
    await createCaller(otherAdmin).admin.listGuardianRequestActions({ kind: "cancel", status: "approved" });
    expect(dbMocks.listGuardianRequestActions).toHaveBeenCalledWith({ kind: "cancel", status: "approved", page: 1 });
    await expect(createCaller(otherAdmin).admin.guardianRequestCounts()).resolves.toEqual({ shortlist: 1, appoint: 2, confirm: 3, cancel: 4 });
    await expect(createCaller(guardianUser).admin.guardianRequestCounts()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller(guardianUser).admin.listGuardianRequestActions({ kind: "confirm" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
