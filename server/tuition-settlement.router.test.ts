import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  listAdminCancelledChargesPage: vi.fn(),
  previewTuitionSettlement: vi.fn(),
  saveTuitionSettlement: vi.fn(),
  recordTuitionPayment: vi.fn(),
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
  return appRouter.createCaller({ user, req: { protocol: "https", headers: { host: "x.example" } }, res: { cookie() {}, clearCookie() {} } } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

const save = { requestId: 21, reason: "guardian_valid" as const, receivedSalary: null, retained: null, disposition: "credited" as const, note: null };

describe("the cancelled tuitions list", () => {
  it("defaults to the first page and passes a trimmed search through", async () => {
    dbMocks.listAdminCancelledChargesPage.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });

    await createCaller().admin.listCancelledCharges({});
    expect(dbMocks.listAdminCancelledChargesPage).toHaveBeenCalledWith({ query: "", page: 1, pageSize: 20 });

    await createCaller().admin.listCancelledCharges({ query: "  777 ", page: 2 });
    expect(dbMocks.listAdminCancelledChargesPage).toHaveBeenLastCalledWith({ query: "777", page: 2, pageSize: 20 });
  });

  it("is an Admin's to read", async () => {
    await expect(createCaller({ ...adminUser, role: "tutor" as const }).admin.listCancelledCharges({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listAdminCancelledChargesPage).not.toHaveBeenCalled();
  });
});

describe("previewing a settlement", () => {
  it("passes the grounds and the salary received through", async () => {
    dbMocks.previewTuitionSettlement.mockResolvedValue({ outcome: "preview", retained: 1500 });

    await expect(createCaller().admin.previewTuitionSettlement({ requestId: 21, reason: "tutor_fault", receivedSalary: 5000 })).resolves.toMatchObject({ retained: 1500 });
    expect(dbMocks.previewTuitionSettlement).toHaveBeenCalledWith({ requestId: 21, reason: "tutor_fault", receivedSalary: 5000 });
  });

  it("takes only the four grounds", async () => {
    await expect(createCaller().admin.previewTuitionSettlement({ requestId: 21, reason: "changed_mind" as never })).rejects.toThrow();
    expect(dbMocks.previewTuitionSettlement).not.toHaveBeenCalled();
  });

  it("is a 404 for a tuition that was not cancelled after confirmation, and says when there is no charge", async () => {
    dbMocks.previewTuitionSettlement.mockResolvedValueOnce(null);
    await expect(createCaller().admin.previewTuitionSettlement({ requestId: 13, reason: "guardian_valid" })).rejects.toMatchObject({ code: "NOT_FOUND" });

    dbMocks.previewTuitionSettlement.mockResolvedValueOnce({ outcome: "no_charge" });
    await expect(createCaller().admin.previewTuitionSettlement({ requestId: 13, reason: "guardian_valid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});

describe("saving a settlement", () => {
  it("records it against the Admin who decided", async () => {
    dbMocks.saveTuitionSettlement.mockResolvedValue({ outcome: "saved", refund: 1000, due: 0 });

    await expect(createCaller().admin.saveTuitionSettlement(save)).resolves.toEqual({ outcome: "saved", refund: 1000, due: 0 });
    expect(dbMocks.saveTuitionSettlement).toHaveBeenCalledWith({ adminUserId: 42, ...save });
  });

  it("takes only a refund that is sent back or credited, or none", async () => {
    await expect(createCaller().admin.saveTuitionSettlement({ ...save, disposition: "waived" as never })).rejects.toThrow();
    await expect(createCaller().admin.saveTuitionSettlement({ ...save, retained: -1 })).rejects.toThrow();
    await expect(createCaller().admin.saveTuitionSettlement({ ...save, retained: 1.5 })).rejects.toThrow();
    expect(dbMocks.saveTuitionSettlement).not.toHaveBeenCalled();
  });

  it("will not reduce a settlement whose credit has already been spent", async () => {
    dbMocks.saveTuitionSettlement.mockResolvedValue({ outcome: "credit_used" });
    await expect(createCaller().admin.saveTuitionSettlement(save))
      .rejects.toMatchObject({ code: "CONFLICT", message: "Credit from this tuition has already been spent, so its settlement cannot be reduced." });
  });

  it("is an Admin's to change", async () => {
    await expect(createCaller({ ...adminUser, role: "tutor" as const }).admin.saveTuitionSettlement(save)).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("applying credit to a payment", () => {
  const payment = { requestId: 21, amount: 800, method: "credit" as const, reference: null, paidOn: "2026-09-14", note: null };

  it("is something only an Admin records, as a method like any other", async () => {
    dbMocks.recordTuitionPayment.mockResolvedValue({ outcome: "recorded", charge: {} });
    await expect(createCaller().admin.recordTuitionPayment(payment)).resolves.toMatchObject({ outcome: "recorded" });
    expect(dbMocks.recordTuitionPayment).toHaveBeenCalledWith({ adminUserId: 42, ...payment });
  });

  it("says how much credit the Tutor actually has when it is not enough", async () => {
    dbMocks.recordTuitionPayment.mockResolvedValue({ outcome: "no_credit", available: 700 });
    await expect(createCaller().admin.recordTuitionPayment(payment))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "Only 700 Taka of credit is available." });
  });
});
