import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { guardianProfiles, locations, tuitionPayments, tutorNotifications, tutorRequestOperationEvents, tutorRequests, users } from "../drizzle/schema";
import { jobIdForRequest } from "@shared/job-id";
import {
  getClosedTuitionReceiptFile,
  getDb,
  getPaymentReceiptFile,
  getTuitionPaymentLedger,
  getTutorChargeOverview,
  listAdminClosedJobsPage,
  listAdminConfirmedJobsPage,
  listAdminPostedJobsPage,
  listTuitionHistory,
  recordTuitionPayment,
} from "./db";

// The Tutor is seeded by scripts/seed-dev-discovery-fixtures.mjs. Everything else
// this test makes is removed afterwards, by id; the Guardian's name carries a tag
// and every list below asks for it, so what else the database holds changes nothing.
const tutorId = "dev-tutor-amina";
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);
const dayText = (date: Date) => date.toISOString().slice(0, 10);

let guardianUserId = 0;
let adminUserId = 0;
let requestId = 0;
const extraRequestIds: number[] = [];
const otherTutorId = "dev-tutor-rakib";
const city = `test-closed-city-${tag}`;
const area = `test-closed-area-${tag}`;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

beforeAll(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const db = await database();
  await db.insert(locations).values({ id: city, label: "Test City", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: area, label: "Test Area", type: "area", country: "Bangladesh", parentId: city });
  const [guardian] = await db.insert(users).values({ openId: `test-closed-g-${tag}`, name: `Closed Guardian ${tag}`, role: "guardian" });
  guardianUserId = Number(guardian.insertId);
  const [admin] = await db.insert(users).values({ openId: `test-closed-a-${tag}`, name: `Closed Admin ${tag}`, role: "admin" });
  adminUserId = Number(admin.insertId);
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `S${tag}09`, phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: city, locationId: area });
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 8000, status: "matched", tutorId,
    appointedAt: ago(9), appointmentConfirmedAt: ago(3),
  });
  requestId = Number(made.insertId);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (extraRequestIds.length) {
    await db.delete(tuitionPayments).where(inArray(tuitionPayments.tutorRequestId, extraRequestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, extraRequestIds));
  }
  if (requestId) {
    await db.delete(tutorNotifications).where(and(eq(tutorNotifications.tutorId, tutorId), inArray(tutorNotifications.deduplicationKey, [`closed:${requestId}:${tutorId}`])));
    const payments = await db.select({ id: tuitionPayments.id }).from(tuitionPayments).where(eq(tuitionPayments.tutorRequestId, requestId));
    if (payments.length) {
      await db.delete(tutorNotifications).where(inArray(tutorNotifications.deduplicationKey, payments.flatMap(payment => [`payment:${payment.id}:recorded`, `payment:${payment.id}:verified`])));
    }
    await db.delete(tuitionPayments).where(eq(tuitionPayments.tutorRequestId, requestId));
    await db.delete(tutorRequestOperationEvents).where(eq(tutorRequestOperationEvents.tutorRequestId, requestId));
    await db.delete(tutorRequests).where(eq(tutorRequests.id, requestId));
  }
  await db.delete(guardianProfiles).where(eq(guardianProfiles.userId, guardianUserId));
  await db.delete(users).where(inArray(users.id, [guardianUserId, adminUserId]));
  await db.delete(locations).where(eq(locations.id, area));
  await db.delete(locations).where(eq(locations.id, city));
});

const ask = () => ({ query: "", page: 1, pageSize: 100, filters: { guardian: tag } });
const inConfirmed = async () => (await listAdminConfirmedJobsPage(ask())).items.some(item => item.id === requestId);
const inClosed = async () => (await listAdminClosedJobsPage(ask())).items.some(item => item.id === requestId);
const stored = async () => {
  const db = await database();
  const [row] = await db.select({ paymentStatus: tutorRequests.paymentStatus, paymentCompletedAt: tutorRequests.paymentCompletedAt }).from(tutorRequests).where(eq(tutorRequests.id, requestId));
  return row!;
};

describe("a Confirmed tuition closes when its fee is paid in full", () => {
  it("starts as Confirmed, and is not Closed", async () => {
    expect(await inConfirmed()).toBe(true);
    expect(await inClosed()).toBe(false);
    expect((await stored()).paymentCompletedAt).toBeNull();
  });

  it("stays Confirmed after part of the fee is paid", async () => {
    const ledger = (await getTuitionPaymentLedger(requestId))!;
    // Paying everything inside the first window earns the reduced total, so that is the figure to pay towards.
    expect(ledger.charge?.early).toBeGreaterThan(1);
    const part = Math.floor(ledger.charge!.early / 2);

    const result = await recordTuitionPayment({ adminUserId, requestId, amount: part, method: "cash", paidOn: dayText(ago(2)) });

    expect(result.outcome).toBe("recorded");
    expect(await inConfirmed()).toBe(true);
    expect(await inClosed()).toBe(false);
    expect((await stored()).paymentStatus).not.toBe("full_paid");
    expect((await stored()).paymentCompletedAt).toBeNull();
  });

  it("moves to Closed with the last payment, on that payment's day, and tells the Tutor", async () => {
    const ledger = (await getTuitionPaymentLedger(requestId))!;
    const rest = ledger.charge!.early - ledger.charge!.paid;
    expect(rest).toBeGreaterThan(0);

    const lastDay = ago(1);
    const result = await recordTuitionPayment({ adminUserId, requestId, amount: rest, method: "cash", paidOn: dayText(lastDay) });

    expect(result.outcome).toBe("recorded");
    expect(await inConfirmed()).toBe(false);
    expect(await inClosed()).toBe(true);
    const row = await stored();
    expect(row.paymentStatus).toBe("full_paid");
    expect(dayText(row.paymentCompletedAt!)).toBe(dayText(lastDay));

    const db = await database();
    const [note] = await db.select().from(tutorNotifications).where(and(eq(tutorNotifications.tutorId, tutorId), eq(tutorNotifications.deduplicationKey, `closed:${requestId}:${tutorId}`)));
    expect(note).toMatchObject({ type: "payment", actionPath: "/tutor/dashboard/status?stage=closed", title: "পেমেন্ট সম্পূর্ণ" });
    expect(note?.message).toContain("Closed");
  });

  it("puts one 'Closed' line in the tuition's history, and an ordinary change for the payments before it", async () => {
    const history = await listTuitionHistory(requestId);
    const actions = history.map(entry => entry.action);

    // Part payment moved the status on (Full Due to Half Paid or Partial Paid); the last payment closed it.
    expect(actions.filter(action => action === "tuition_closed")).toHaveLength(1);
    expect(actions.filter(action => action === "admin_payment_status_changed").length).toBeGreaterThanOrEqual(1);
    const closed = history.find(entry => entry.action === "tuition_closed");
    expect(closed?.at).toBeInstanceOf(Date);
    expect(closed?.changedFields ?? []).toEqual([]);
  });

  it("lists the Closed row with the day it closed and a Payment Status of Full Paid", async () => {
    const [row] = (await listAdminClosedJobsPage(ask())).items;
    expect(row).toMatchObject({ id: requestId, paymentStatus: "full_paid" });
    expect(row?.closedAt).toBeInstanceOf(Date);
  });
});

describe("a Closed tuition is still a Confirmed one wherever that matters", () => {
  it("is counted as Closed and not Confirmed on the Posted jobs board", async () => {
    const page = await listAdminPostedJobsPage({ query: "", stage: "closed", page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag } });
    expect(page.items.map(item => item.id)).toEqual([requestId]);
    expect(page.counts).toMatchObject({ confirmed: 0, closed: 1 });
  });

  it("still appears under Confirmed for Applied Tutors, which lists every Confirmed tuition", async () => {
    const page = await listAdminPostedJobsPage({ query: "", stage: "all", stages: ["live", "appointed", "confirmed"], page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag } });
    expect(page.items.map(item => item.id)).toContain(requestId);
  });

  it("is still in the Tutor's own payments overview", async () => {
    const overview = await getTutorChargeOverview(tutorId);
    expect(JSON.stringify(overview)).toContain(`"id":${requestId}`);
  });

  it("keeps its payments ledger open to the Admin", async () => {
    const ledger = await getTuitionPaymentLedger(requestId);
    expect(ledger?.charge).toMatchObject({ status: "full_paid", balance: 0 });
  });
});

describe("receipts", () => {
  const isPdf = (file: { pdfBase64: string } | undefined) => Buffer.from(file?.pdfBase64 ?? "", "base64").subarray(0, 5).toString("latin1") === "%PDF-";

  async function ledgerPayments() {
    return (await getTuitionPaymentLedger(requestId))!.payments;
  }

  it("gives the Tutor a receipt for each verified payment, numbered by the payment", async () => {
    const verified = (await ledgerPayments()).filter(payment => payment.status === "verified");
    expect(verified).toHaveLength(2);

    for (const payment of verified) {
      const file = await getPaymentReceiptFile({ paymentId: payment.id, tutorId });
      expect(isPdf(file)).toBe(true);
      expect(file!.fileName).toMatch(new RegExp(`^Connect-Tutors-Receipt-RCT-\\d{4}-0*${payment.id}\\.pdf$`));
    }
  });

  it("gives an Admin the same receipt without asking whose it is", async () => {
    const [payment] = await ledgerPayments();
    const forTutor = await getPaymentReceiptFile({ paymentId: payment!.id, tutorId });
    const forAdmin = await getPaymentReceiptFile({ paymentId: payment!.id });
    expect(isPdf(forAdmin)).toBe(true);
    expect(forAdmin!.fileName).toBe(forTutor!.fileName);
  });

  it("will not give another Tutor's payment, a payment not found, one still waiting, or one rejected", async () => {
    const [payment] = await ledgerPayments();
    expect(await getPaymentReceiptFile({ paymentId: payment!.id, tutorId: otherTutorId })).toBeUndefined();
    expect(await getPaymentReceiptFile({ paymentId: 2_000_000_000, tutorId })).toBeUndefined();
    expect(await getPaymentReceiptFile({ paymentId: 2_000_000_000 })).toBeUndefined();

    const db = await database();
    const paidAt = ago(1);
    const [waiting] = await db.insert(tuitionPayments).values({ tutorRequestId: requestId, tutorId, amount: 100, method: "cash", status: "submitted", paidAt });
    const [rejected] = await db.insert(tuitionPayments).values({ tutorRequestId: requestId, tutorId, amount: 100, method: "cash", status: "rejected", paidAt });
    expect(await getPaymentReceiptFile({ paymentId: Number(waiting.insertId), tutorId })).toBeUndefined();
    expect(await getPaymentReceiptFile({ paymentId: Number(rejected.insertId) })).toBeUndefined();
  });

  it("still gives a Tutor the receipt for money they paid on a tuition that is no longer theirs", async () => {
    const db = await database();
    // A tuition now held by someone else, with a verified payment from the Tutor who held it before.
    const [made] = await db.insert(tutorRequests).values({
      guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 6", subjects: JSON.stringify(["Math"]),
      daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 8000, status: "matched", tutorId: otherTutorId, appointmentConfirmedAt: ago(5),
    });
    const earlierId = Number(made.insertId);
    extraRequestIds.push(earlierId);
    const [payment] = await db.insert(tuitionPayments).values({ tutorRequestId: earlierId, tutorId, amount: 500, method: "bkash", status: "verified", paidAt: ago(4), decidedAt: ago(4) });

    const file = await getPaymentReceiptFile({ paymentId: Number(payment.insertId), tutorId });
    expect(isPdf(file)).toBe(true);
    // The tuition's charge now belongs to the new Tutor, so this one is not asked for a final receipt on it.
    expect(await getClosedTuitionReceiptFile({ requestId: earlierId, tutorId })).toBeUndefined();
  });

  it("gives the Closed tuition's Tutor, and an Admin, one final receipt numbered by the Job ID", async () => {
    const forTutor = await getClosedTuitionReceiptFile({ requestId, tutorId });
    const forAdmin = await getClosedTuitionReceiptFile({ requestId });

    expect(isPdf(forTutor)).toBe(true);
    expect(forTutor!.fileName).toMatch(/^Connect-Tutors-Receipt-RCT-\d{4}-J\d+\.pdf$/);
    expect(forTutor!.fileName).toContain(jobIdForRequest(requestId));
    expect(forAdmin!.fileName).toBe(forTutor!.fileName);
  });

  it("will not give the final receipt to another Tutor, or for a tuition that is not Closed", async () => {
    expect(await getClosedTuitionReceiptFile({ requestId, tutorId: otherTutorId })).toBeUndefined();
    expect(await getClosedTuitionReceiptFile({ requestId: 2_000_000_000 })).toBeUndefined();

    const db = await database();
    const [made] = await db.insert(tutorRequests).values({
      guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 7", subjects: JSON.stringify(["Math"]),
      daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 8000, status: "matched", tutorId, appointmentConfirmedAt: ago(2),
    });
    const openId = Number(made.insertId);
    extraRequestIds.push(openId);
    // Confirmed and unpaid: nothing to be a final receipt for.
    expect(await getClosedTuitionReceiptFile({ requestId: openId, tutorId })).toBeUndefined();
  });
});

describe("a Closed tuition that is cancelled is Cancelled, not Closed", () => {
  it("moves to Cancelled and leaves the Closed list", async () => {
    const db = await database();
    await db.update(tutorRequests).set({ status: "closed", publicationState: "closed", cancelledAt: new Date(), cancellationReason: "Test" }).where(eq(tutorRequests.id, requestId));

    expect(await inClosed()).toBe(false);
    const page = await listAdminPostedJobsPage({ query: "", stage: "cancelled", page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag } });
    expect(page.items.map(item => item.id)).toContain(requestId);
  });
});
