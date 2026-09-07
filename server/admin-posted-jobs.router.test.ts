import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAdminPostedJobsPage: vi.fn() }));

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

describe("admin.listPostedJobs", () => {
  it("defaults to the first page of every stage and passes the filters through", async () => {
    dbMocks.listAdminPostedJobsPage.mockResolvedValue({ items: [], counts: {}, total: 0, page: 1, pageSize: 12, totalPages: 1 });

    await createCaller().admin.listPostedJobs({});
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenCalledWith({ query: "", stage: "all", page: 1, pageSize: 12 });

    await createCaller().admin.listPostedJobs({ query: "  Banasree  ", stage: "live", page: 3, pageSize: 20 });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenLastCalledWith({ query: "Banasree", stage: "live", page: 3, pageSize: 20 });
  });

  it("refuses an unknown stage, a silly page size, and a non-admin caller", async () => {
    await expect(createCaller().admin.listPostedJobs({ stage: "archived" as never })).rejects.toThrow();
    await expect(createCaller().admin.listPostedJobs({ pageSize: 500 })).rejects.toThrow();
    expect(dbMocks.listAdminPostedJobsPage).not.toHaveBeenCalled();

    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.listPostedJobs({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
