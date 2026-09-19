import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getAccountChangeContextByUserId: vi.fn(),
  listOwnAccountChangeRequests: vi.fn(),
  isMobileTakenByAnotherAccount: vi.fn(),
  createAccountChangeRequest: vi.fn(),
  withdrawAccountChangeRequest: vi.fn(),
  updateOwnerAdminContact: vi.fn(),
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
