import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  reopenAppointedTuitionByAdmin: vi.fn(),
  confirmTutorRequestAppointment: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const admin = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = admin) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("moving an Appointed tuition on", () => {
  it("sends it back to Live as the signed-in Admin", async () => {
    dbMocks.reopenAppointedTuitionByAdmin.mockResolvedValue({ outcome: "reopened", removedTutorId: "tutor-175" });

    await expect(createCaller().admin.reopenAppointedTuition({ requestId: 13 })).resolves.toEqual({ reopened: true });
    expect(dbMocks.reopenAppointedTuitionByAdmin).toHaveBeenCalledWith({ requestId: 13, adminUserId: 42 });
  });

  it("refuses a tuition that is not Appointed, and does not find one that is not there", async () => {
    dbMocks.reopenAppointedTuitionByAdmin.mockResolvedValue({ outcome: "refused" });
    await expect(createCaller().admin.reopenAppointedTuition({ requestId: 13 }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Appointed") });

    dbMocks.reopenAppointedTuitionByAdmin.mockResolvedValue({ outcome: "not_found" });
    await expect(createCaller().admin.reopenAppointedTuition({ requestId: 999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("confirms through the one confirmation the Matching workspace uses too", async () => {
    dbMocks.confirmTutorRequestAppointment.mockResolvedValue({ updated: true, lifecycle: "confirmed" });
    await expect(createCaller().admin.confirmTutorRequestAppointment({ requestId: 13 })).resolves.toEqual({ updated: true, lifecycle: "confirmed" });
    expect(dbMocks.confirmTutorRequestAppointment).toHaveBeenCalledWith({ requestId: 13, adminUserId: 42 });
  });

  it("is closed to anyone who is not an Admin", async () => {
    for (const user of [null, { ...admin, role: "guardian" as const, openId: "guardian-1" }]) {
      await expect(createCaller(user).admin.reopenAppointedTuition({ requestId: 13 })).rejects.toBeTruthy();
    }
    expect(dbMocks.reopenAppointedTuitionByAdmin).not.toHaveBeenCalled();
  });
});
