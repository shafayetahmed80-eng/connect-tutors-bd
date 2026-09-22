import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listMatchingCandidatesForRequest: vi.fn(),
  ensureTutorJobInterestForRequest: vi.fn(),
  reviewTutorJobInterestByAdmin: vi.fn(),
}));

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

describe("admin.listMatchingCandidates", () => {
  it("passes the tuition and the filter set through, ranked best match first", async () => {
    dbMocks.listMatchingCandidatesForRequest.mockResolvedValue({
      job: { id: 13, classCourse: "Class 8", guardianPhone: "+8801674936203" },
      appliedTotal: 3,
      items: [{ id: "tutor-902", name: "Rima Akter", matchScore: 8 }, { id: "tutor-175", name: "Tania Sultana", matchScore: 5 }],
      total: 2, page: 1, pageSize: 20, totalPages: 1,
    });

    const page = await createCaller().admin.listMatchingCandidates({ requestId: 13, query: "" });

    expect(dbMocks.listMatchingCandidatesForRequest).toHaveBeenCalledWith(
      expect.objectContaining({ requestId: 13, page: 1, pageSize: 20 }),
    );
    expect(page.items.map(item => item.id)).toEqual(["tutor-902", "tutor-175"]);
  });

  it("accepts the 20/50/100 page sizes and refuses anything else", async () => {
    dbMocks.listMatchingCandidatesForRequest.mockResolvedValue({ job: {}, appliedTotal: 0, items: [], total: 0, page: 1, pageSize: 50, totalPages: 1 });
    await expect(createCaller().admin.listMatchingCandidates({ requestId: 13, pageSize: 50 })).resolves.toMatchObject({ pageSize: 50 });
    await expect(createCaller().admin.listMatchingCandidates({ requestId: 13, pageSize: 30 } as never)).rejects.toBeTruthy();
  });

  it("is a 404 for a tuition that does not exist", async () => {
    dbMocks.listMatchingCandidatesForRequest.mockResolvedValue(undefined);
    await expect(createCaller().admin.listMatchingCandidates({ requestId: 9999 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.listMatchingCandidates({ requestId: 13 })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      createCaller({ ...adminUser, role: "user", openId: "someone-else" }).admin.listMatchingCandidates({ requestId: 13 }),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.matchTutorToRequest", () => {
  it("creates the application first, then runs the same transition Applied Tutors uses", async () => {
    dbMocks.ensureTutorJobInterestForRequest.mockResolvedValue({ interestId: 501 });
    dbMocks.reviewTutorJobInterestByAdmin.mockResolvedValue({ interestId: 501, status: "shortlisted" });

    const result = await createCaller().admin.matchTutorToRequest({ requestId: 13, tutorId: "tutor-902", status: "shortlisted" });

    expect(dbMocks.ensureTutorJobInterestForRequest).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-902" });
    expect(dbMocks.reviewTutorJobInterestByAdmin).toHaveBeenCalledWith({ interestId: 501, status: "shortlisted", adminUserId: 42 });
    expect(result).toEqual({ interestId: 501, status: "shortlisted" });
  });

  it("surfaces a closed or expired tuition as a conflict, the same wording a Tutor applying themselves would see", async () => {
    dbMocks.ensureTutorJobInterestForRequest.mockRejectedValue(new Error("TUTOR_INTEREST_JOB_UNAVAILABLE"));
    await expect(createCaller().admin.matchTutorToRequest({ requestId: 13, tutorId: "tutor-902", status: "shortlisted" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.matchTutorToRequest({ requestId: 13, tutorId: "tutor-902", status: "shortlisted" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
