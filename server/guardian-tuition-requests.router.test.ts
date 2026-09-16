import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createGuardianTuitionRequest: vi.fn(),
  withdrawGuardianTuitionRequest: vi.fn(),
  approveGuardianTuitionRequestByAdmin: vi.fn(),
  declineGuardianTuitionRequestByAdmin: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const context = {
  req: { protocol: "https", headers: { host: "x.example" } },
  res: { cookie() {}, clearCookie() {} },
};

function caller(user: { id: number; role: "guardian" | "admin" | "tutor" } | null) {
  return appRouter.createCaller({ ...context, user: user ? { openId: `${user.role}-${user.id}`, ...user } : null } as unknown as TrpcContext);
}

const guardian = caller({ id: 77, role: "guardian" });
const admin = caller({ id: 901, role: "admin" });

afterEach(() => vi.clearAllMocks());

describe("tutorRequests.requestTuitionChange", () => {
  it("asks as the signed-in Guardian, never as anyone named in the input", async () => {
    dbMocks.createGuardianTuitionRequest.mockResolvedValue({ outcome: "requested", id: 5 });

    await expect(guardian.tutorRequests.requestTuitionChange({ requestId: 13, type: "remove_tutor", tutorId: "tutor-175", reason: "The demo class did not suit us", guardianUserId: 1 } as never))
      .resolves.toEqual({ requested: true });

    expect(dbMocks.createGuardianTuitionRequest).toHaveBeenCalledWith({
      requestId: 13, type: "remove_tutor", tutorId: "tutor-175", reason: "The demo class did not suit us", guardianUserId: 77,
    });
  });

  it("explains a refusal as a conflict, in the Guardian's words", async () => {
    dbMocks.createGuardianTuitionRequest.mockResolvedValue({ outcome: "refused", reason: "request_waiting" });
    await expect(guardian.tutorRequests.requestTuitionChange({ requestId: 13, type: "cancel_tuition", reason: "Moving city" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "You already have a request waiting on this tuition. Withdraw it first." });
  });

  it("is a 404 for a tuition that is not theirs", async () => {
    dbMocks.createGuardianTuitionRequest.mockResolvedValue({ outcome: "not_found" });
    await expect(guardian.tutorRequests.requestTuitionChange({ requestId: 13, type: "confirm", tutorId: "tutor-175" }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("refuses an unknown request, or a reason past the cap, before reaching the database", async () => {
    await expect(guardian.tutorRequests.requestTuitionChange({ requestId: 13, type: "reassign" as never }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(guardian.tutorRequests.requestTuitionChange({ requestId: 13, type: "cancel_tuition", reason: "x".repeat(281) }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createGuardianTuitionRequest).not.toHaveBeenCalled();
  });

  it("is closed to anyone who is not a Guardian", async () => {
    await expect(caller(null).tutorRequests.requestTuitionChange({ requestId: 13, type: "confirm", tutorId: "tutor-175" }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
    for (const role of ["tutor", "admin"] as const) {
      await expect(caller({ id: 77, role }).tutorRequests.requestTuitionChange({ requestId: 13, type: "confirm", tutorId: "tutor-175" }), role)
        .rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(dbMocks.createGuardianTuitionRequest).not.toHaveBeenCalled();
  });
});

describe("tutorRequests.withdrawTuitionChange", () => {
  it("takes back the Guardian's own waiting request", async () => {
    dbMocks.withdrawGuardianTuitionRequest.mockResolvedValue({ outcome: "withdrawn" });
    await expect(guardian.tutorRequests.withdrawTuitionChange({ requestId: 13 })).resolves.toEqual({ withdrawn: true });
    expect(dbMocks.withdrawGuardianTuitionRequest).toHaveBeenCalledWith({ requestId: 13, guardianUserId: 77 });
  });

  it("says so when there is nothing waiting", async () => {
    dbMocks.withdrawGuardianTuitionRequest.mockResolvedValue({ outcome: "refused" });
    await expect(guardian.tutorRequests.withdrawTuitionChange({ requestId: 13 }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "There is no request waiting to be withdrawn." });
  });
});

describe("admin.approveGuardianTuitionRequest", () => {
  it("approves as the signed-in Admin", async () => {
    dbMocks.approveGuardianTuitionRequestByAdmin.mockResolvedValue({ outcome: "approved" });
    await expect(admin.admin.approveGuardianTuitionRequest({ guardianRequestId: 5 })).resolves.toEqual({ approved: true });
    expect(dbMocks.approveGuardianTuitionRequestByAdmin).toHaveBeenCalledWith({ adminUserId: 901, guardianRequestId: 5 });
  });

  it("tells the Admin when the tuition moved on before the approval, and when it was already decided", async () => {
    dbMocks.approveGuardianTuitionRequestByAdmin.mockResolvedValueOnce({ outcome: "refused", reason: "moved_on" });
    await expect(admin.admin.approveGuardianTuitionRequest({ guardianRequestId: 5 }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("moved on") });
    dbMocks.approveGuardianTuitionRequestByAdmin.mockResolvedValueOnce({ outcome: "refused", reason: "not_waiting" });
    await expect(admin.admin.approveGuardianTuitionRequest({ guardianRequestId: 5 }))
      .rejects.toMatchObject({ code: "CONFLICT", message: expect.stringContaining("already been decided") });
  });

  it("is closed to anyone who is not an Admin", async () => {
    for (const role of ["guardian", "tutor"] as const) {
      await expect(caller({ id: 77, role }).admin.approveGuardianTuitionRequest({ guardianRequestId: 5 }), role)
        .rejects.toMatchObject({ code: "FORBIDDEN" });
    }
    expect(dbMocks.approveGuardianTuitionRequestByAdmin).not.toHaveBeenCalled();
  });
});

describe("admin.declineGuardianTuitionRequest", () => {
  it("declines as the signed-in Admin", async () => {
    dbMocks.declineGuardianTuitionRequestByAdmin.mockResolvedValue({ outcome: "declined" });
    await expect(admin.admin.declineGuardianTuitionRequest({ guardianRequestId: 5 })).resolves.toEqual({ declined: true });
    expect(dbMocks.declineGuardianTuitionRequestByAdmin).toHaveBeenCalledWith({ adminUserId: 901, guardianRequestId: 5 });
  });

  it("is a 404 for a request that is not there, and a conflict for one already decided", async () => {
    dbMocks.declineGuardianTuitionRequestByAdmin.mockResolvedValueOnce({ outcome: "not_found" });
    await expect(admin.admin.declineGuardianTuitionRequest({ guardianRequestId: 5 })).rejects.toMatchObject({ code: "NOT_FOUND" });
    dbMocks.declineGuardianTuitionRequestByAdmin.mockResolvedValueOnce({ outcome: "refused" });
    await expect(admin.admin.declineGuardianTuitionRequest({ guardianRequestId: 5 })).rejects.toMatchObject({ code: "CONFLICT" });
  });
});
