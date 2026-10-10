import { beforeEach, describe, expect, it, vi } from "vitest";

const requestDbMocks = vi.hoisted(() => ({
  listTutorAssignedRequests: vi.fn(),
  updateTutorRequestStatus: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    listTutorAssignedRequests: requestDbMocks.listTutorAssignedRequests,
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

describe("Admin Tutor Request matching lifecycle", () => {
  beforeEach(() => vi.clearAllMocks());

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
});
