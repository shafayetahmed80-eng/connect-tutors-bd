import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listAdminConfirmedJobsPage: vi.fn(),
  getTuitionPaymentLedger: vi.fn(),
  recordTuitionPayment: vi.fn(),
  decideTuitionPayment: vi.fn(),
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

describe("a Confirmed tuition's payments", () => {
  const payment = { requestId: 21, amount: 3000, method: "bkash" as const, reference: " 9A8B7C ", paidOn: "2026-09-14", note: null };

  it("has no setter for the status: it is worked out from the payments", () => {
    expect(Object.keys(appRouter._def.procedures)).not.toContain("admin.setJobPaymentStatus");
  });

  it("reads a tuition's ledger, and is a 404 for one that is not Confirmed", async () => {
    dbMocks.getTuitionPaymentLedger.mockResolvedValueOnce({ charge: null, payments: [] });
    await expect(createCaller().admin.listTuitionPayments({ requestId: 21 })).resolves.toEqual({ charge: null, payments: [] });

    dbMocks.getTuitionPaymentLedger.mockResolvedValueOnce(null);
    await expect(createCaller().admin.listTuitionPayments({ requestId: 13 })).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("records a payment against the Admin who typed it, tidying the transaction id", async () => {
    dbMocks.recordTuitionPayment.mockResolvedValue({ outcome: "recorded", charge: { status: "half_paid" } });

    await expect(createCaller().admin.recordTuitionPayment(payment)).resolves.toMatchObject({ outcome: "recorded" });
    expect(dbMocks.recordTuitionPayment).toHaveBeenCalledWith({ adminUserId: 42, ...payment, reference: "9A8B7C" });
  });

  it("refuses an amount that is not a positive whole number of taka, an unknown method or a malformed date", async () => {
    for (const bad of [{ amount: 0 }, { amount: -5 }, { amount: 12.5 }, { amount: 2_000_000 }, { method: "cheque" as never }, { paidOn: "14/09/2026" }]) {
      await expect(createCaller().admin.recordTuitionPayment({ ...payment, ...bad })).rejects.toThrow();
    }
    expect(dbMocks.recordTuitionPayment).not.toHaveBeenCalled();
  });

  it("says how much may still be recorded when a payment is more than is owed", async () => {
    dbMocks.recordTuitionPayment.mockResolvedValue({ outcome: "over", most: 2000 });
    await expect(createCaller().admin.recordTuitionPayment(payment))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "That is more than is owed. The most that can be recorded is 2,000 Taka." });
  });

  it("turns each refusal from the ledger into the message an Admin can act on", async () => {
    const cases: Array<[string, string, string]> = [
      ["not_found", "NOT_FOUND", "This payment or confirmed tuition is unavailable."],
      ["no_charge", "BAD_REQUEST", "This tuition has no salary, so there is no charge to pay."],
      ["too_early", "BAD_REQUEST", "The payment cannot be dated before the tuition was confirmed."],
      ["in_future", "BAD_REQUEST", "The payment cannot be dated in the future."],
      ["duplicate_reference", "CONFLICT", "That transaction ID is already on file for this method."],
    ];
    for (const [outcome, code, message] of cases) {
      dbMocks.recordTuitionPayment.mockResolvedValueOnce({ outcome });
      await expect(createCaller().admin.recordTuitionPayment(payment)).rejects.toMatchObject({ code, message });
    }
  });

  it("verifies or rejects a reported payment, and only those two", async () => {
    dbMocks.decideTuitionPayment.mockResolvedValue({ outcome: "decided", status: "verified" });

    await expect(createCaller().admin.decideTuitionPayment({ paymentId: 8, decision: "verified" })).resolves.toEqual({ outcome: "decided", status: "verified" });
    expect(dbMocks.decideTuitionPayment).toHaveBeenCalledWith({ adminUserId: 42, paymentId: 8, decision: "verified" });

    await expect(createCaller().admin.decideTuitionPayment({ paymentId: 8, decision: "submitted" as never })).rejects.toThrow();
  });

  it("will not decide a payment twice, or one from a Tutor who no longer holds the tuition", async () => {
    dbMocks.decideTuitionPayment.mockResolvedValueOnce({ outcome: "not_pending" });
    await expect(createCaller().admin.decideTuitionPayment({ paymentId: 8, decision: "rejected" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "This payment has already been decided." });

    dbMocks.decideTuitionPayment.mockResolvedValueOnce({ outcome: "not_holder" });
    await expect(createCaller().admin.decideTuitionPayment({ paymentId: 8, decision: "verified" }))
      .rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("is an Admin's to read and to change", async () => {
    const tutor = createCaller({ ...adminUser, role: "tutor" as const });
    await expect(tutor.admin.listTuitionPayments({ requestId: 21 })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(tutor.admin.recordTuitionPayment(payment)).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(tutor.admin.decideTuitionPayment({ paymentId: 8, decision: "verified" })).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});
