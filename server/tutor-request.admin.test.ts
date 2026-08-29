import { beforeEach, describe, expect, it, vi } from "vitest";

const requestDbMocks = vi.hoisted(() => ({
  assignTutorToRequest: vi.fn(),
  listTutorAssignedRequests: vi.fn(),
  listTutorRequestMatchingPage: vi.fn(),
  listTutors: vi.fn(),
  updateTutorRequestStatus: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    assignTutorToRequest: requestDbMocks.assignTutorToRequest,
    listTutorAssignedRequests: requestDbMocks.listTutorAssignedRequests,
    listTutorRequestMatchingPage: requestDbMocks.listTutorRequestMatchingPage,
    listTutors: requestDbMocks.listTutors,
    updateTutorRequestStatus: requestDbMocks.updateTutorRequestStatus,
  };
});

import { appRouter } from "./routers";

const baseContext = {
  req: { protocol: "https", headers: { host: "connecttutor.example" } } as any,
  res: { cookie: () => undefined, clearCookie: () => undefined } as any,
};

function adminCaller() {
  return appRouter.createCaller({
    ...baseContext,
    user: { id: 901, openId: "admin-901", role: "admin" } as any,
  });
}

function guardianCaller() {
  return appRouter.createCaller({
    ...baseContext,
    user: { id: 902, openId: "guardian-902", role: "guardian" } as any,
  });
}

describe("Admin Tutor Request matching lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

  it("returns the pending-contact-consent state when an Admin matches an approved Tutor", async () => {
    requestDbMocks.assignTutorToRequest.mockResolvedValueOnce({ assigned: true });

    await expect(adminCaller().admin.assignTutorRequest({ requestId: 18, tutorId: "T-1503" }))
      .resolves.toEqual({ assigned: true, contactConsent: "pending" });
    expect(requestDbMocks.assignTutorToRequest).toHaveBeenCalledWith({ requestId: 18, tutorId: "T-1503" });
  });

  it("provides a paginated, server-backed matching queue only to Admins", async () => {
    const page = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 };
    requestDbMocks.listTutorRequestMatchingPage.mockResolvedValueOnce(page);

    await expect(adminCaller().admin.listMatchingRequests({
      query: "Mathematics",
      status: "reviewing",
      subject: "Mathematics",
      budgetMaximum: 12000,
    })).resolves.toEqual(page);
    expect(requestDbMocks.listTutorRequestMatchingPage).toHaveBeenCalledWith(expect.objectContaining({
      query: "Mathematics",
      status: "reviewing",
      subject: "Mathematics",
      budgetMaximum: 12000,
      page: 1,
      pageSize: 20,
    }));
    await expect(guardianCaller().admin.listMatchingRequests({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("limits status controls to the explicit Admin workflow and never treats matching as a free-form status edit", async () => {
    requestDbMocks.updateTutorRequestStatus.mockResolvedValueOnce({ updated: true, status: "reviewing" });

    await expect(adminCaller().admin.updateTutorRequestStatus({ requestId: 18, status: "reviewing" }))
      .resolves.toEqual({ updated: true, status: "reviewing" });
    expect(requestDbMocks.updateTutorRequestStatus).toHaveBeenCalledWith({ requestId: 18, status: "reviewing" });
    await expect(adminCaller().admin.updateTutorRequestStatus({ requestId: 18, status: "matched" as any }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(adminCaller().admin.updateTutorRequestStatus({ requestId: 18, status: "closed" as any }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("returns safe approved-Tutor candidates only through the protected Admin workspace", async () => {
    const candidates = [{ id: "T-1503", name: "Tutor One", subjects: ["Mathematics"] }];
    requestDbMocks.listTutors.mockResolvedValueOnce(candidates);

    await expect(adminCaller().admin.listMatchingTutors()).resolves.toEqual(candidates);
    expect(requestDbMocks.listTutors).toHaveBeenCalledTimes(1);
  });
});
