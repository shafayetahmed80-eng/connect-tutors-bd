import type { TrpcContext } from "./_core/context";
import { beforeEach, describe, expect, it, vi } from "vitest";

const dbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  getTutorChargeOverview: vi.fn(),
  reportTuitionPayment: vi.fn(),
  setTuitionChargeKind: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const activeTutor = { id: 101, role: "tutor" as const, name: "Amina Rahman", openId: "tutor:101" };
const admin = { id: 42, role: "admin" as const, name: "Project Owner", openId: ENV.ownerOpenId, email: "owner@example.com" };

function createCaller(user: TrpcContext["user"] = activeTutor) {
  const headers = {
    host: "connecttutor.example",
    ...(user?.role === "tutor" ? { "x-connect-tutor-portal-session": "test-tutor-portal-proof" } : {}),
  };
  return appRouter.createCaller({ user, req: { protocol: "https", headers }, res: { cookie() {}, clearCookie() {} } } as unknown as TrpcContext);
}

const report = { requestId: 21, amount: 3000, method: "nagad" as const, reference: " 9A8B7C ", paidOn: "2026-09-14", note: null };

describe("a Tutor's own payments", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    dbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    dbMocks.renewTutorPortalSession.mockResolvedValue(true);
    dbMocks.getTutorProfileByUserId.mockResolvedValue({ tutorId: "tutor-1503", profileStatus: "approved" });
  });

  it("reads only the authenticated Tutor's own tuitions", async () => {
    dbMocks.getTutorChargeOverview.mockResolvedValue([{ id: 21 }]);

    await expect(createCaller().tutorPayments.mine()).resolves.toEqual([{ id: 21 }]);
    expect(dbMocks.getTutorChargeOverview).toHaveBeenCalledWith("tutor-1503");
  });

  it("reports a payment as the Tutor who is signed in, whoever the request names", async () => {
    dbMocks.reportTuitionPayment.mockResolvedValue({ outcome: "reported" });

    await expect(createCaller().tutorPayments.report(report)).resolves.toEqual({ outcome: "reported" });
    expect(dbMocks.reportTuitionPayment).toHaveBeenCalledWith({ tutorId: "tutor-1503", userId: 101, ...report, reference: "9A8B7C" });
  });

  it("refuses an amount that is not a positive whole number of taka, an unknown method or a malformed date", async () => {
    for (const bad of [{ amount: 0 }, { amount: 12.5 }, { amount: 2_000_000 }, { method: "cheque" as never }, { paidOn: "yesterday" }]) {
      await expect(createCaller().tutorPayments.report({ ...report, ...bad })).rejects.toThrow();
    }
    expect(dbMocks.reportTuitionPayment).not.toHaveBeenCalled();
  });

  it("tells the Tutor how much they may still report when they have reported too much", async () => {
    dbMocks.reportTuitionPayment.mockResolvedValue({ outcome: "over", most: 1000 });
    await expect(createCaller().tutorPayments.report(report))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "That is more than is owed. The most that can be recorded is 1,000 Taka." });
  });

  it("holds back a flood of reports, and says why", async () => {
    dbMocks.reportTuitionPayment.mockResolvedValue({ outcome: "too_many_waiting" });
    await expect(createCaller().tutorPayments.report(report)).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("gives someone else's tuition the answer a missing one would get", async () => {
    dbMocks.reportTuitionPayment.mockResolvedValue({ outcome: "not_found" });
    await expect(createCaller().tutorPayments.report({ ...report, requestId: 999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is a Tutor's to read and report, not a Guardian's", async () => {
    const guardian = createCaller({ id: 202, role: "guardian", name: "Guardian", openId: "guardian:202" });
    await expect(Promise.resolve().then(() => guardian.tutorPayments.mine())).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(Promise.resolve().then(() => guardian.tutorPayments.report(report))).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.reportTuitionPayment).not.toHaveBeenCalled();
  });
});

describe("what a tuition open to Home or Online is charged as", () => {
  beforeEach(() => vi.clearAllMocks());

  it("is an Admin's choice between Home and Online", async () => {
    dbMocks.setTuitionChargeKind.mockResolvedValue({ outcome: "set" });

    await expect(createCaller(admin).admin.setTuitionChargeKind({ requestId: 21, kind: "online" })).resolves.toEqual({ outcome: "set" });
    expect(dbMocks.setTuitionChargeKind).toHaveBeenCalledWith({ requestId: 21, kind: "online" });
    await expect(createCaller(admin).admin.setTuitionChargeKind({ requestId: 21, kind: "package" as never })).rejects.toThrow();
  });

  it("is settled once money has been paid, and only for a tuition open to both", async () => {
    dbMocks.setTuitionChargeKind.mockResolvedValueOnce({ outcome: "has_payments" });
    await expect(createCaller(admin).admin.setTuitionChargeKind({ requestId: 21, kind: "home" })).rejects.toMatchObject({ code: "CONFLICT" });

    dbMocks.setTuitionChargeKind.mockResolvedValueOnce({ outcome: "not_both" });
    await expect(createCaller(admin).admin.setTuitionChargeKind({ requestId: 21, kind: "home" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("is not a Tutor's to choose", async () => {
    await expect(Promise.resolve().then(() => createCaller().admin.setTuitionChargeKind({ requestId: 21, kind: "home" }))).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
