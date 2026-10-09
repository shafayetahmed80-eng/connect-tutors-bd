import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAdminAppointedJobsPage: vi.fn() }));

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

describe("admin.listAppointedJobs", () => {
  it("defaults to the first page and passes a trimmed search through", async () => {
    dbMocks.listAdminAppointedJobsPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });

    await createCaller().admin.listAppointedJobs({});
    expect(dbMocks.listAdminAppointedJobsPage).toHaveBeenCalledWith({ query: "", page: 1, pageSize: 20 });

    await createCaller().admin.listAppointedJobs({ query: "  Tania  ", page: 2, pageSize: 10 });
    expect(dbMocks.listAdminAppointedJobsPage).toHaveBeenLastCalledWith({ query: "Tania", page: 2, pageSize: 10 });
  });

  it("passes the Admin's filters through, and refuses what the panel could not send", async () => {
    dbMocks.listAdminAppointedJobsPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const filters = { tutorGender: "male" as const, daysInStage: 7, waitingRequest: "confirm" as const, guardian: "Sojib" };

    await createCaller().admin.listAppointedJobs({ filters });
    expect(dbMocks.listAdminAppointedJobsPage).toHaveBeenLastCalledWith({ query: "", page: 1, pageSize: 20, filters });

    await expect(createCaller().admin.listAppointedJobs({ filters: { tutorGender: "any" } as never })).rejects.toThrow();
    await expect(createCaller().admin.listAppointedJobs({ filters: { appointedFrom: new Date("2026-10-09"), appointedTo: new Date("2026-10-01") } })).rejects.toThrow();
  });

  it("refuses a silly page size and anyone who is not an Admin", async () => {
    await expect(createCaller().admin.listAppointedJobs({ pageSize: 500 })).rejects.toThrow();
    expect(dbMocks.listAdminAppointedJobsPage).not.toHaveBeenCalled();

    await expect(createCaller({ ...adminUser, role: "guardian" as const }).admin.listAppointedJobs({}))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
