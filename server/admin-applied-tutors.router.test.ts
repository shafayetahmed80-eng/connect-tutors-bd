import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAppliedTutorsForRequest: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const adminUser = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = adminUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("admin.listAppliedTutors", () => {
  it("passes the tuition and the filter set through, and hands back both halves of the page", async () => {
    dbMocks.listAppliedTutorsForRequest.mockResolvedValue({
      job: { id: 13, classCourse: "Class 8", guardianPhone: "+8801674936203" },
      appliedTotal: 26,
      items: [{ id: "tutor-175", name: "Tania Sultana" }],
      total: 1, page: 1, pageSize: 20, totalPages: 1,
    });

    const page = await createCaller().admin.listAppliedTutors({ requestId: 13, query: "Tania" });

    expect(dbMocks.listAppliedTutorsForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 13, query: "Tania", page: 1, pageSize: 20 }),
    );
    // The header count is the whole applicant list; `total` is the filtered page.
    expect(page.appliedTotal).toBe(26);
    expect(page.total).toBe(1);
    expect(page.job.guardianPhone).toBe("+8801674936203");
  });

  it("is a 404 for a tuition that does not exist", async () => {
    dbMocks.listAppliedTutorsForRequest.mockResolvedValue(undefined);
    await expect(createCaller().admin.listAppliedTutors({ requestId: 9999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.listAppliedTutors({ requestId: 13 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      createCaller({ ...adminUser, role: "user", openId: "someone-else" }).admin.listAppliedTutors({ requestId: 13 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
