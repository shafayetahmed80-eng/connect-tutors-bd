import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listGuardianAppliedTutors: vi.fn(),
  getTutorProfileForGuardian: vi.fn(),
  setGuardianApplicantShortlist: vi.fn(),
  requestGuardianAppointment: vi.fn(),
  withdrawGuardianAppointmentRequest: vi.fn(),
}));

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

describe("tutorRequests.appliedTutorProfile", () => {
  it("opens the profile as the signed-in Guardian, through the tuition named", async () => {
    dbMocks.getTutorProfileForGuardian.mockResolvedValue({ profile: { tutorId: "tutor-175" }, catalogLabels: {}, fieldConfig: [] });

    await createCaller().tutorRequests.appliedTutorProfile({ requestId: 13, tutorId: "tutor-175", guardianUserId: 1 } as never);

    expect(dbMocks.getTutorProfileForGuardian).toHaveBeenCalledWith({ guardianUserId: 77, requestId: 13, tutorId: "tutor-175" });
  });

  it("is a 404 for a Tutor who did not apply to one of their tuitions", async () => {
    dbMocks.getTutorProfileForGuardian.mockResolvedValue(undefined);
    await expect(createCaller().tutorRequests.appliedTutorProfile({ requestId: 13, tutorId: "tutor-404" })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is closed to anyone who is not a Guardian", async () => {
    await expect(createCaller(null).tutorRequests.appliedTutorProfile({ requestId: 13, tutorId: "tutor-175" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const role of ["tutor", "admin"] as const) {
      await expect(createCaller({ ...guardianUser, role }).tutorRequests.appliedTutorProfile({ requestId: 13, tutorId: "tutor-175" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(dbMocks.getTutorProfileForGuardian).not.toHaveBeenCalled();
  });
});

describe("a Guardian's actions on an applicant", () => {
  const applicant = { requestId: 13, tutorId: "tutor-175" };

  it("shortlists as the signed-in Guardian", async () => {
    dbMocks.setGuardianApplicantShortlist.mockResolvedValue({ shortlisted: true });

    await expect(createCaller().tutorRequests.shortlistApplicant({ ...applicant, shortlisted: true, guardianUserId: 1 } as never))
      .resolves.toEqual({ shortlisted: true });
    expect(dbMocks.setGuardianApplicantShortlist).toHaveBeenCalledWith({ guardianUserId: 77, requestId: 13, tutorId: "tutor-175", shortlisted: true });
  });

  it("asks for and withdraws an appointment as the signed-in Guardian", async () => {
    dbMocks.requestGuardianAppointment.mockResolvedValue({ outcome: "requested" });
    dbMocks.withdrawGuardianAppointmentRequest.mockResolvedValue({ outcome: "withdrawn" });

    await expect(createCaller().tutorRequests.requestAppointment(applicant)).resolves.toEqual({ requested: true });
    await expect(createCaller().tutorRequests.withdrawAppointmentRequest(applicant)).resolves.toEqual({ withdrawn: true });
    expect(dbMocks.requestGuardianAppointment).toHaveBeenCalledWith({ guardianUserId: 77, ...applicant });
    expect(dbMocks.withdrawGuardianAppointmentRequest).toHaveBeenCalledWith({ guardianUserId: 77, ...applicant });
  });

  it("is a 404 for an applicant the Guardian cannot reach", async () => {
    dbMocks.setGuardianApplicantShortlist.mockResolvedValue(undefined);
    dbMocks.requestGuardianAppointment.mockResolvedValue({ outcome: "not_found" });
    dbMocks.withdrawGuardianAppointmentRequest.mockResolvedValue({ outcome: "not_found" });

    await expect(createCaller().tutorRequests.shortlistApplicant({ ...applicant, shortlisted: true })).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createCaller().tutorRequests.requestAppointment(applicant)).rejects.toMatchObject({ code: "NOT_FOUND" });
    await expect(createCaller().tutorRequests.withdrawAppointmentRequest(applicant)).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("says why a second request on the same tuition is refused", async () => {
    dbMocks.requestGuardianAppointment.mockResolvedValue({ outcome: "refused", reason: "another_requested" });
    await expect(createCaller().tutorRequests.requestAppointment({ requestId: 13, tutorId: "tutor-404" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("another Tutor") });
  });

  it("refuses to withdraw when nothing is waiting", async () => {
    dbMocks.withdrawGuardianAppointmentRequest.mockResolvedValue({ outcome: "refused" });
    await expect(createCaller().tutorRequests.withdrawAppointmentRequest(applicant)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("is closed to anyone who is not a Guardian", async () => {
    for (const user of [null, { ...guardianUser, role: "tutor" as const }, { ...guardianUser, role: "admin" as const }]) {
      const caller = createCaller(user);
      await expect(caller.tutorRequests.shortlistApplicant({ ...applicant, shortlisted: true })).rejects.toBeTruthy();
      await expect(caller.tutorRequests.requestAppointment(applicant)).rejects.toBeTruthy();
      await expect(caller.tutorRequests.withdrawAppointmentRequest(applicant)).rejects.toBeTruthy();
    }
    expect(dbMocks.setGuardianApplicantShortlist).not.toHaveBeenCalled();
    expect(dbMocks.requestGuardianAppointment).not.toHaveBeenCalled();
    expect(dbMocks.withdrawGuardianAppointmentRequest).not.toHaveBeenCalled();
  });
});
