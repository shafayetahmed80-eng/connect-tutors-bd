import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  appointApplicantByAdmin: vi.fn(),
  declineAppointmentRequestByAdmin: vi.fn(),
  reviewTutorJobInterestByAdmin: vi.fn(),
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

describe("an Admin appointing an applicant", () => {
  it("approves a Guardian's request as the signed-in Admin, and needs one to be waiting", async () => {
    dbMocks.appointApplicantByAdmin.mockResolvedValue({ outcome: "appointed", requestId: 13, tutorId: "tutor-175" });

    await expect(createCaller().admin.approveAppointmentRequest({ interestId: 91 })).resolves.toEqual({ appointed: true });
    expect(dbMocks.appointApplicantByAdmin).toHaveBeenCalledWith({ adminUserId: 42, interestId: 91, requireGuardianRequest: true });
  });

  it("says why an approval is refused", async () => {
    dbMocks.appointApplicantByAdmin.mockResolvedValue({ outcome: "refused", reason: "not_live" });
    await expect(createCaller().admin.approveAppointmentRequest({ interestId: 91 }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Live") });

    dbMocks.appointApplicantByAdmin.mockResolvedValue({ outcome: "not_found" });
    await expect(createCaller().admin.approveAppointmentRequest({ interestId: 91 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("declines as the signed-in Admin, and refuses when nothing is waiting", async () => {
    dbMocks.declineAppointmentRequestByAdmin.mockResolvedValue({ outcome: "declined" });
    await expect(createCaller().admin.declineAppointmentRequest({ interestId: 91 })).resolves.toEqual({ declined: true });
    expect(dbMocks.declineAppointmentRequestByAdmin).toHaveBeenCalledWith({ adminUserId: 42, interestId: 91 });

    dbMocks.declineAppointmentRequestByAdmin.mockResolvedValue({ outcome: "refused" });
    await expect(createCaller().admin.declineAppointmentRequest({ interestId: 91 })).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("gives Mark matched the Admin's id, so it can take the same appointment path", async () => {
    dbMocks.reviewTutorJobInterestByAdmin.mockResolvedValue({ interestId: 12, status: "matched" });
    await createCaller().admin.reviewTutorJobInterest({ interestId: 12, status: "matched" });
    expect(dbMocks.reviewTutorJobInterestByAdmin).toHaveBeenCalledWith({ interestId: 12, status: "matched", adminUserId: 42 });
  });

  it("turns a refused Mark matched into a reason", async () => {
    dbMocks.reviewTutorJobInterestByAdmin.mockRejectedValue(new Error("TUTOR_INTEREST_APPOINTMENT_NOT_LIVE"));
    await expect(createCaller().admin.reviewTutorJobInterest({ interestId: 12, status: "matched" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("Live") });
  });

  it("is closed to anyone who is not an Admin", async () => {
    for (const user of [null, { ...admin, role: "guardian" as const, openId: "guardian-1" }, { ...admin, role: "user" as const, openId: "user-1" }]) {
      await expect(createCaller(user).admin.approveAppointmentRequest({ interestId: 91 })).rejects.toBeTruthy();
      await expect(createCaller(user).admin.declineAppointmentRequest({ interestId: 91 })).rejects.toBeTruthy();
    }
    expect(dbMocks.appointApplicantByAdmin).not.toHaveBeenCalled();
    expect(dbMocks.declineAppointmentRequestByAdmin).not.toHaveBeenCalled();
  });
});
