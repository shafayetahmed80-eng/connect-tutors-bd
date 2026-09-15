import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAdminConfirmedJobsPage: vi.fn(), setConfirmedJobPaymentStatus: vi.fn() }));

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

describe("admin.listConfirmedJobs", () => {
  it("defaults to the first page and passes a trimmed search through", async () => {
    dbMocks.listAdminConfirmedJobsPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });

    await createCaller().admin.listConfirmedJobs({});
    expect(dbMocks.listAdminConfirmedJobsPage).toHaveBeenCalledWith({ query: "", page: 1, pageSize: 20 });

    await createCaller().admin.listConfirmedJobs({ query: "  777 ", page: 3 });
    expect(dbMocks.listAdminConfirmedJobsPage).toHaveBeenLastCalledWith({ query: "777", page: 3, pageSize: 20 });
  });

  it("is an Admin's to read", async () => {
    await expect(createCaller({ ...adminUser, role: "guardian" as const }).admin.listConfirmedJobs({}))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listAdminConfirmedJobsPage).not.toHaveBeenCalled();
  });
});

describe("admin.setJobPaymentStatus", () => {
  it("records the change against the Admin who made it", async () => {
    dbMocks.setConfirmedJobPaymentStatus.mockResolvedValue({ outcome: "updated", paymentStatus: "half_paid" });

    await expect(createCaller().admin.setJobPaymentStatus({ requestId: 21, paymentStatus: "half_paid" }))
      .resolves.toEqual({ outcome: "updated", paymentStatus: "half_paid" });
    expect(dbMocks.setConfirmedJobPaymentStatus).toHaveBeenCalledWith({ adminUserId: 42, requestId: 21, paymentStatus: "half_paid" });
  });

  it("takes only the four payment states", async () => {
    await expect(createCaller().admin.setJobPaymentStatus({ requestId: 21, paymentStatus: "refunded" as never })).rejects.toThrow();
    expect(dbMocks.setConfirmedJobPaymentStatus).not.toHaveBeenCalled();
  });

  it("is a 404 for a tuition that is not Confirmed", async () => {
    dbMocks.setConfirmedJobPaymentStatus.mockResolvedValue({ outcome: "not_found" });
    await expect(createCaller().admin.setJobPaymentStatus({ requestId: 13, paymentStatus: "full_paid" }))
      .rejects.toMatchObject({ code: "NOT_FOUND", message: "This confirmed tuition is unavailable." });
  });

  it("is an Admin's to change", async () => {
    await expect(createCaller({ ...adminUser, role: "tutor" as const }).admin.setJobPaymentStatus({ requestId: 21, paymentStatus: "full_paid" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
