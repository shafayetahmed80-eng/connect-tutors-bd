import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ listAdminTutorDirectoryPage: vi.fn(), listTutorJobInterestsForTutor: vi.fn(), notifyTutorDirectory: vi.fn(), getAdminTutorFilterOptions: vi.fn() }));

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

describe("admin.listTutorDirectory", () => {
  it("passes both tab rows through, each defaulting to all", async () => {
    dbMocks.listAdminTutorDirectoryPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1, counts: {} });

    await createCaller().admin.listTutorDirectory({});
    expect(dbMocks.listAdminTutorDirectoryPage).toHaveBeenCalledWith(expect.objectContaining({ profileStatus: "all", jobStage: "all", page: 1 }));

    await createCaller().admin.listTutorDirectory({ profileStatus: "approved", jobStage: "confirmed" });
    expect(dbMocks.listAdminTutorDirectoryPage).toHaveBeenLastCalledWith(expect.objectContaining({ profileStatus: "approved", jobStage: "confirmed" }));
  });

  it("passes the Tutor Profiles panel through, and leaves it out when it is not asked for", async () => {
    dbMocks.listAdminTutorDirectoryPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1, counts: {} });
    const joinedFrom = new Date("2026-08-01T00:00:00.000Z");

    await createCaller().admin.listTutorDirectory({ gender: "female", cityId: "dhaka", locationIds: ["adabor"], subjects: ["Physics"], experienceFrom: 3, ratingFrom: 4.5, joinedFrom });
    expect(dbMocks.listAdminTutorDirectoryPage).toHaveBeenLastCalledWith(expect.objectContaining({ gender: "female", cityId: "dhaka", locationIds: ["adabor"], subjects: ["Physics"], experienceFrom: 3, ratingFrom: 4.5, joinedFrom }));

    await createCaller().admin.listTutorDirectory({});
    const [asked] = dbMocks.listAdminTutorDirectoryPage.mock.calls.at(-1)!;
    for (const key of ["gender", "cityId", "locationIds", "subjects", "experienceFrom", "ratingFrom", "joinedFrom"]) expect(asked).not.toHaveProperty(key);
  });

  it("refuses a choice the panel could not have made, and more areas or subjects than it can hold", async () => {
    const ask = (input: Record<string, unknown>) => createCaller().admin.listTutorDirectory(input as never);
    await expect(ask({ gender: "other" })).rejects.toThrow();
    await expect(ask({ ratingFrom: 6 })).rejects.toThrow();
    await expect(ask({ experienceFrom: -1 })).rejects.toThrow();
    await expect(ask({ experienceFrom: 2.5 })).rejects.toThrow();
    await expect(ask({ locationIds: Array.from({ length: 11 }, (_, index) => `area-${index}`) })).rejects.toThrow();
    await expect(ask({ subjects: Array.from({ length: 13 }, (_, index) => `subject-${index}`) })).rejects.toThrow();
    expect(dbMocks.listAdminTutorDirectoryPage).not.toHaveBeenCalled();
  });

  it("refuses a job stage the Status tab does not have", async () => {
    await expect(createCaller().admin.listTutorDirectory({ jobStage: "hired" as never })).rejects.toThrow();
    expect(dbMocks.listAdminTutorDirectoryPage).not.toHaveBeenCalled();
  });
});

describe("admin.notifyTutorDirectory", () => {
  it("sends the trimmed title and message with the directory's own filters, not paging", async () => {
    dbMocks.notifyTutorDirectory.mockResolvedValue({ sent: 7 });

    const result = await createCaller().admin.notifyTutorDirectory({
      profileStatus: "approved", jobStage: "confirmed", title: "  Platform maintenance  ", message: "  We are pausing new applications tonight.  ",
    });

    expect(result).toEqual({ sent: 7 });
    expect(dbMocks.notifyTutorDirectory).toHaveBeenCalledWith({
      filters: expect.objectContaining({ profileStatus: "approved", jobStage: "confirmed" }),
      tutorIds: undefined,
      title: "Platform maintenance",
      message: "We are pausing new applications tonight.",
      adminUserId: 42,
    });
    const [{ filters: filtersArg }] = dbMocks.notifyTutorDirectory.mock.calls[0];
    expect(filtersArg).not.toHaveProperty("page");
    expect(filtersArg).not.toHaveProperty("pageSize");
  });

  it("sends with the Tutor Profiles panel as well, so the list and the notice reach the same Tutors", async () => {
    dbMocks.notifyTutorDirectory.mockResolvedValue({ sent: 3 });

    await createCaller().admin.notifyTutorDirectory({ gender: "male", experienceFrom: 2, subjects: ["Physics"], title: "Hi", message: "Hello." });
    expect(dbMocks.notifyTutorDirectory).toHaveBeenCalledWith(expect.objectContaining({
      filters: expect.objectContaining({ gender: "male", experienceFrom: 2, subjects: ["Physics"] }),
    }));
  });

  it("sends to a hand-picked set of Tutors instead, when given", async () => {
    dbMocks.notifyTutorDirectory.mockResolvedValue({ sent: 2 });

    const result = await createCaller().admin.notifyTutorDirectory({
      tutorIds: ["tutor-175", "tutor-182"], title: "Platform maintenance", message: "Paused tonight.",
    });

    expect(result).toEqual({ sent: 2 });
    expect(dbMocks.notifyTutorDirectory).toHaveBeenCalledWith(expect.objectContaining({ tutorIds: ["tutor-175", "tutor-182"] }));
  });

  it("refuses an empty title or message rather than broadcasting a blank notice", async () => {
    await expect(createCaller().admin.notifyTutorDirectory({ title: "", message: "Something" })).rejects.toThrow();
    await expect(createCaller().admin.notifyTutorDirectory({ title: "Something", message: "" })).rejects.toThrow();
    expect(dbMocks.notifyTutorDirectory).not.toHaveBeenCalled();
  });

  it("is an Admin's to send", async () => {
    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.notifyTutorDirectory({ title: "Hi", message: "Hi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.notifyTutorDirectory).not.toHaveBeenCalled();
  });
});

describe("admin.tutorFilterOptions", () => {
  it("reads the options of the panel for an Admin, and only an Admin", async () => {
    dbMocks.getAdminTutorFilterOptions.mockResolvedValue({ cities: [], locationsByCity: {}, subjects: ["Physics"] });
    await expect(createCaller().admin.tutorFilterOptions()).resolves.toEqual({ cities: [], locationsByCity: {}, subjects: ["Physics"] });

    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.tutorFilterOptions()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.listTutorApplications", () => {
  it("reads one Tutor's applications with the Tutor's own list", async () => {
    dbMocks.listTutorJobInterestsForTutor.mockResolvedValue([{ interestId: 1, status: "interested", requestId: 13 }]);

    await expect(createCaller().admin.listTutorApplications({ tutorId: " tutor-175 " })).resolves.toEqual([{ interestId: 1, status: "interested", requestId: 13 }]);
    expect(dbMocks.listTutorJobInterestsForTutor).toHaveBeenCalledWith("tutor-175");
  });

  it("is an Admin's to read, and needs a Tutor", async () => {
    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.listTutorApplications({ tutorId: "tutor-175" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(createCaller().admin.listTutorApplications({ tutorId: "" })).rejects.toThrow();
    expect(dbMocks.listTutorJobInterestsForTutor).not.toHaveBeenCalled();
  });
});
