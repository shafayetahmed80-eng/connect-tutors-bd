import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const interestDbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  listTutorJobInterestsForAdmin: vi.fn(),
  listTutorJobInterestsForTutor: vi.fn(),
  reviewTutorJobInterestByAdmin: vi.fn(),
  submitTutorJobInterest: vi.fn(),
  withdrawTutorJobInterest: vi.fn(),
  renewTutorPortalSession: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...interestDbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const activeTutor = {
  id: 101,
  role: "tutor" as const,
  name: "Amina Rahman",
  openId: "tutor:101",
};

const verifiedAdmin = {
  id: 42,
  role: "admin" as const,
  name: "Project Owner",
  openId: ENV.ownerOpenId,
  email: "owner@example.com",
};

function createCaller(input?: { user?: TrpcContext["user"] }) {
  const user = input?.user ?? activeTutor;
  const headers = {
    host: "connecttutor.example",
    ...(user?.role === "tutor" ? { "x-connect-tutor-portal-session": "test-tutor-portal-proof" } : {}),
  };
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

describe("Tutor Job Board interest procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    interestDbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    interestDbMocks.renewTutorPortalSession.mockResolvedValue(true);
    interestDbMocks.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503", profileStatus: "approved" });
  });

  it("binds an active Tutor's interest to their own private Tutor profile", async () => {
    interestDbMocks.submitTutorJobInterest.mockResolvedValue({ interestId: 12, status: "interested" });

    await expect((createCaller().jobBoard as any).expressInterest({ tutorJobId: 44 })).resolves.toEqual({ interestId: 12, status: "interested" });
    expect(interestDbMocks.getTutorProfileByUserId).toHaveBeenCalledWith(activeTutor.id);
    expect(interestDbMocks.submitTutorJobInterest).toHaveBeenCalledWith({ tutorId: "tutor-1503", tutorJobId: 44 });
  });

  it.each(["draft", "pending", "changes_requested"])('does not let an active Tutor with a %s profile apply before Admin verification', async profileStatus => {
    interestDbMocks.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503", profileStatus });

    await expect((createCaller().jobBoard as any).expressInterest({ tutorJobId: 44 })).rejects.toMatchObject({
      code: "PRECONDITION_FAILED",
      message: "Complete and verify your Tutor profile before applying to Job Board listings.",
    });
    expect(interestDbMocks.submitTutorJobInterest).not.toHaveBeenCalled();
  });

  it("does not let a Guardian submit or withdraw a Tutor Job Board interest", async () => {
    const guardianCaller = createCaller({ user: { id: 202, role: "guardian", name: "Guardian", openId: "guardian:202" } });

    await expect(Promise.resolve().then(() => (guardianCaller.jobBoard as any).expressInterest({ tutorJobId: 44 }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(Promise.resolve().then(() => (guardianCaller.jobBoard as any).withdrawInterest({ interestId: 12 }))).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(interestDbMocks.submitTutorJobInterest).not.toHaveBeenCalled();
    expect(interestDbMocks.withdrawTutorJobInterest).not.toHaveBeenCalled();
  });

  it("lists and withdraws only the authenticated Tutor's own interests", async () => {
    interestDbMocks.listTutorJobInterestsForTutor.mockResolvedValue([{ interestId: 12, status: "interested", publicJobId: "CTB-260821-044" }]);
    interestDbMocks.withdrawTutorJobInterest.mockResolvedValue({ interestId: 12, status: "withdrawn" });
    const caller = createCaller();

    await expect((caller.tutor as any).myJobInterests()).resolves.toHaveLength(1);
    await expect((caller.jobBoard as any).myInterests()).resolves.toHaveLength(1);
    await expect((caller.jobBoard as any).withdrawInterest({ interestId: 12 })).resolves.toEqual({ interestId: 12, status: "withdrawn" });
    expect(interestDbMocks.listTutorJobInterestsForTutor).toHaveBeenCalledTimes(2);
    expect(interestDbMocks.listTutorJobInterestsForTutor).toHaveBeenCalledWith("tutor-1503");
    expect(interestDbMocks.withdrawTutorJobInterest).toHaveBeenCalledWith({ tutorId: "tutor-1503", interestId: 12 });
  });

  it("allows an authenticated Admin to view Tutor interest details without an interactive two-factor proof", async () => {
    interestDbMocks.listTutorJobInterestsForAdmin.mockResolvedValue([]);
    const caller = createCaller({ user: verifiedAdmin });

    await expect((caller.admin as any).listTutorJobInterests({})).resolves.toEqual([]);
    expect(interestDbMocks.listTutorJobInterestsForAdmin).toHaveBeenCalledTimes(1);
  });

  it("passes an authenticated Admin review to the private interest workflow", async () => {
    interestDbMocks.reviewTutorJobInterestByAdmin.mockResolvedValue({ interestId: 12, status: "shortlisted" });
    const caller = createCaller({ user: verifiedAdmin });

    await expect((caller.admin as any).reviewTutorJobInterest({ interestId: 12, status: "shortlisted" })).resolves.toEqual({ interestId: 12, status: "shortlisted" });
    expect(interestDbMocks.reviewTutorJobInterestByAdmin).toHaveBeenCalledWith({ interestId: 12, status: "shortlisted" });
  });

  it("rejects Tutor-controlled or withdrawn review statuses before the Admin workflow runs", async () => {
    const caller = createCaller({ user: verifiedAdmin });

    await expect((caller.admin as any).reviewTutorJobInterest({ interestId: 12, status: "withdrawn" })).rejects.toThrow();
    expect(interestDbMocks.reviewTutorJobInterestByAdmin).not.toHaveBeenCalled();
  });
});
