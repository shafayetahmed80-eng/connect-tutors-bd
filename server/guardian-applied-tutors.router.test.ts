import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listGuardianAppliedTutors: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const guardianUser = {
  id: 77, openId: "guardian-77", email: "rina@example.com", name: "Rina Akter",
  passwordHash: null, loginMethod: "password", role: "guardian" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = guardianUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("tutorRequests.appliedTutors", () => {
  it("reads the tuition as the signed-in Guardian's, never as anyone named in the input", async () => {
    dbMocks.listGuardianAppliedTutors.mockResolvedValue({ job: { id: 13 }, lifecycle: "live", items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });

    await createCaller().tutorRequests.appliedTutors({ requestId: 13, guardianUserId: 1 } as never);

    expect(dbMocks.listGuardianAppliedTutors).toHaveBeenCalledWith({ guardianUserId: 77, requestId: 13, page: 1, pageSize: 20 });
  });

  it("is a 404 for a tuition that is not theirs, not open to applicants, or not there", async () => {
    dbMocks.listGuardianAppliedTutors.mockResolvedValue(undefined);
    await expect(createCaller().tutorRequests.appliedTutors({ requestId: 13 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses a page size past the cap", async () => {
    await expect(createCaller().tutorRequests.appliedTutors({ requestId: 13, pageSize: 500 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.listGuardianAppliedTutors).not.toHaveBeenCalled();
  });

  it("is closed to anyone who is not a Guardian", async () => {
    await expect(createCaller(null).tutorRequests.appliedTutors({ requestId: 13 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const role of ["tutor", "admin"] as const) {
      await expect(createCaller({ ...guardianUser, role }).tutorRequests.appliedTutors({ requestId: 13 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(dbMocks.listGuardianAppliedTutors).not.toHaveBeenCalled();
  });
});
