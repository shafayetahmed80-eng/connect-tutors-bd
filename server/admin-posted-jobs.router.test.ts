import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAdminPostedJobsPage: vi.fn(), getAdminJobFilterOptions: vi.fn() }));

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
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenCalledWith({ query: "", stage: "all", page: 1, pageSize: 20, postedBy: "all" });

    await createCaller().admin.listPostedJobs({ query: "  Banasree  ", stage: "live", page: 3, pageSize: 20 });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenLastCalledWith({ query: "Banasree", stage: "live", page: 3, pageSize: 20, postedBy: "all" });

    // Admin Posted Jobs asks for the same page narrowed to Admin posts.
    await createCaller().admin.listPostedJobs({ stage: "live", postedBy: "admin" });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenLastCalledWith({ query: "", stage: "live", page: 1, pageSize: 20, postedBy: "admin" });

    // Applied Tutors asks for several stages at once.
    await createCaller().admin.listPostedJobs({ stages: ["live", "appointed", "confirmed"] });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenLastCalledWith({ query: "", stage: "all", page: 1, pageSize: 20, postedBy: "all", stages: ["live", "appointed", "confirmed"] });
  });

  it("refuses an unknown stage, a silly page size, and a non-admin caller", async () => {
    await expect(createCaller().admin.listPostedJobs({ stage: "archived" as never })).rejects.toThrow();
    await expect(createCaller().admin.listPostedJobs({ postedBy: "guardian" as never })).rejects.toThrow();
    await expect(createCaller().admin.listPostedJobs({ stages: ["archived" as never] })).rejects.toThrow();
    await expect(createCaller().admin.listPostedJobs({ stages: [] })).rejects.toThrow();
    await expect(createCaller().admin.listPostedJobs({ pageSize: 500 })).rejects.toThrow();
    expect(dbMocks.listAdminPostedJobsPage).not.toHaveBeenCalled();

    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.listPostedJobs({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.listPostedJobs filters", () => {
  it("passes the Admin's filters through as the server will enforce them", async () => {
    dbMocks.listAdminPostedJobsPage.mockResolvedValue({ items: [], counts: {}, total: 0, page: 1, pageSize: 20, totalPages: 1 });
    const from = new Date("2026-10-01T00:00:00.000Z");

    await createCaller().admin.listPostedJobs({
      stage: "live",
      filters: { postedFrom: from, salaryFrom: 5000, salaryTo: 9000, tuitionTypes: ["home"], daysPerWeek: [3], waitingRequest: "confirm", applicants: "few" },
    });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenCalledWith(expect.objectContaining({
      stage: "live",
      filters: { postedFrom: from, salaryFrom: 5000, salaryTo: 9000, tuitionTypes: ["home"], daysPerWeek: [3], waitingRequest: "confirm", applicants: "few" },
    }));
  });

  it("no longer carries the retired Ending Within 3 Days choice through to the server", async () => {
    dbMocks.listAdminPostedJobsPage.mockResolvedValue({ items: [], counts: {}, total: 0, page: 1, pageSize: 20, totalPages: 1 });
    await createCaller().admin.listPostedJobs({ stage: "live", filters: { applicants: "few", expiringSoon: true } as never });
    expect(dbMocks.listAdminPostedJobsPage).toHaveBeenCalledWith(expect.objectContaining({ filters: { applicants: "few" } }));
  });

  it("refuses a range the wrong way round, an unknown choice, and more than the panel can hold", async () => {
    const ask = (filters: Record<string, unknown>) => createCaller().admin.listPostedJobs({ stage: "live", filters: filters as never });
    await expect(ask({ salaryFrom: 9000, salaryTo: 5000 })).rejects.toThrow();
    await expect(ask({ postedFrom: new Date("2026-10-09"), postedTo: new Date("2026-10-01") })).rejects.toThrow();
    await expect(ask({ tuitionTypes: ["hybrid"] })).rejects.toThrow();
    await expect(ask({ waitingRequest: "approve" })).rejects.toThrow();
    await expect(ask({ locationIds: Array.from({ length: 11 }, (_, index) => `area-${index}`) })).rejects.toThrow();
    await expect(ask({ subjects: Array.from({ length: 13 }, (_, index) => `subject-${index}`) })).rejects.toThrow();
    await expect(ask({ salaryFrom: -1 })).rejects.toThrow();
    expect(dbMocks.listAdminPostedJobsPage).not.toHaveBeenCalled();
  });
});

describe("admin.jobFilterOptions", () => {
  it("reads the options for the whole board or for Admin posts alone, for an Admin only", async () => {
    dbMocks.getAdminJobFilterOptions.mockResolvedValue({ tuitionTypes: [], daysPerWeek: [], cities: [], locationsByCity: {}, classesByCategory: {}, subjectsByClass: {} });

    await createCaller().admin.jobFilterOptions({});
    expect(dbMocks.getAdminJobFilterOptions).toHaveBeenLastCalledWith({ postedBy: "all" });
    await createCaller().admin.jobFilterOptions({ postedBy: "admin" });
    expect(dbMocks.getAdminJobFilterOptions).toHaveBeenLastCalledWith({ postedBy: "admin" });

    await expect(createCaller().admin.jobFilterOptions({ postedBy: "guardian" as never })).rejects.toThrow();
    await expect(createCaller({ ...adminUser, role: "guardian" as const }).admin.jobFilterOptions({})).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
