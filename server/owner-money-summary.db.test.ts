import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { guardianProfiles, locations, tuitionPayments, tutorNotifications, tutorRequestOperationEvents, tutorRequests, users } from "../drizzle/schema";
import { getDb, getOwnerMoneySummary, getTuitionPaymentLedger, recordTuitionPayment, reportTuitionPayment } from "./db";

// The Tutor is seeded by scripts/seed-dev-discovery-fixtures.mjs. Everything else
// this test makes is removed afterwards, by id, and every figure below is asked for
// those two tuitions only, so whatever else the database holds changes nothing.
const tutorId = "dev-tutor-amina";
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);
const dayText = (date: Date) => date.toISOString().slice(0, 10);

let guardianUserId = 0;
let adminUserId = 0;
/** Confirmed three days ago and still being paid. */
let openRequestId = 0;
/** Confirmed sixty days ago and paid off, fifty-five days ago. */
let paidOffRequestId = 0;
const city = `test-money-city-${tag}`;
const area = `test-money-area-${tag}`;

let partPaid = 0;
let paidOffAmount = 0;
const creditAmount = 100;
const reportedAmount = 50;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeRequest(confirmedDaysAgo: number) {
  const db = await database();
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 8000, status: "matched", tutorId,
    appointedAt: ago(confirmedDaysAgo + 6), appointmentConfirmedAt: ago(confirmedDaysAgo),
  });
  return Number(made.insertId);
}

beforeAll(async () => {
  vi.spyOn(console, "info").mockImplementation(() => {});
  const db = await database();
  await db.insert(locations).values({ id: city, label: "Test City", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: area, label: "Test Area", type: "area", country: "Bangladesh", parentId: city });
  const [guardian] = await db.insert(users).values({ openId: `test-money-g-${tag}`, name: `Money Guardian ${tag}`, role: "guardian" });
  guardianUserId = Number(guardian.insertId);
  const [admin] = await db.insert(users).values({ openId: `test-money-a-${tag}`, name: `Money Admin ${tag}`, role: "admin" });
  adminUserId = Number(admin.insertId);
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `S${tag}10`, phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: city, locationId: area });
  openRequestId = await makeRequest(3);
  paidOffRequestId = await makeRequest(60);

  // The paid-off tuition: its reduced total, paid inside the first window, 55 days ago.
  const paidOffLedger = (await getTuitionPaymentLedger(paidOffRequestId))!;
  paidOffAmount = paidOffLedger.charge!.early;
  const closing = await recordTuitionPayment({ adminUserId, requestId: paidOffRequestId, amount: paidOffAmount, method: "cash", paidOn: dayText(ago(55)) });
  if (closing.outcome !== "recorded") throw new Error(`Could not pay off the test tuition: ${closing.outcome}`);

  // The open tuition: half the reduced total recorded two days ago, some credit moved onto it the same day,
  // and a further payment the Tutor reported yesterday that nobody has checked yet.
  const openLedger = (await getTuitionPaymentLedger(openRequestId))!;
  partPaid = Math.floor(openLedger.charge!.early / 2);
  const part = await recordTuitionPayment({ adminUserId, requestId: openRequestId, amount: partPaid, method: "cash", paidOn: dayText(ago(2)) });
  if (part.outcome !== "recorded") throw new Error(`Could not record the test payment: ${part.outcome}`);
  await db.insert(tuitionPayments).values({
    tutorRequestId: openRequestId, tutorId, amount: creditAmount, method: "credit", status: "verified", source: "manual",
    paidAt: ago(2), recordedByUserId: adminUserId, decidedByUserId: adminUserId, decidedAt: new Date(),
  });
  const reported = await reportTuitionPayment({ tutorId, userId: adminUserId, requestId: openRequestId, amount: reportedAmount, method: "cash", paidOn: dayText(ago(1)) });
  if (reported.outcome !== "reported") throw new Error(`Could not report the test payment: ${reported.outcome}`);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const requestIds = [openRequestId, paidOffRequestId].filter(Boolean);
  if (requestIds.length) {
    const payments = await db.select({ id: tuitionPayments.id }).from(tuitionPayments).where(inArray(tuitionPayments.tutorRequestId, requestIds));
    const keys = [
      ...requestIds.map(id => `closed:${id}:${tutorId}`),
      ...payments.flatMap(payment => [`payment:${payment.id}:recorded`, `payment:${payment.id}:verified`]),
    ];
    await db.delete(tutorNotifications).where(and(eq(tutorNotifications.tutorId, tutorId), inArray(tutorNotifications.deduplicationKey, keys)));
    await db.delete(tuitionPayments).where(inArray(tuitionPayments.tutorRequestId, requestIds));
    await db.delete(tutorRequestOperationEvents).where(inArray(tutorRequestOperationEvents.tutorRequestId, requestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  await db.delete(guardianProfiles).where(eq(guardianProfiles.userId, guardianUserId));
  await db.delete(users).where(inArray(users.id, [guardianUserId, adminUserId]));
  await db.delete(locations).where(eq(locations.id, area));
  await db.delete(locations).where(eq(locations.id, city));
});

const summary = (windowDays: 7 | 30 | 90) => getOwnerMoneySummary({ windowDays, onlyRequestIds: [openRequestId, paidOffRequestId] });

describe("the Owner's money summary", () => {
  it("counts what was verified inside a 30-day window, and leaves out credit and older money", async () => {
    const result = await summary(30);

    // The payment made 55 days ago is outside the window; the credit is not new money.
    expect(result.collected).toEqual({ amount: partPaid, payments: 1 });
    expect(result.closed).toEqual({ tuitions: 0 });
  });

  it("widens to the older payment and the tuition it closed when the window is 90 days", async () => {
    const result = await summary(90);

    expect(result.collected).toEqual({ amount: partPaid + paidOffAmount, payments: 2 });
    expect(result.closed).toEqual({ tuitions: 1 });
  });

  it("reads what is still owed the way the tuition's own Balance does, and skips the paid-off one", async () => {
    const ledger = (await getTuitionPaymentLedger(openRequestId))!;
    expect(ledger.charge!.balance).toBeGreaterThan(0);

    const result = await summary(30);

    expect(result.stillDue).toEqual({ amount: ledger.charge!.balance, tuitions: 1 });
  });

  it("counts a reported payment as waiting, whatever the window", async () => {
    expect((await summary(7)).waiting).toEqual({ amount: reportedAmount, payments: 1 });
    expect((await summary(90)).waiting).toEqual({ amount: reportedAmount, payments: 1 });
  });

  it("answers for the whole platform when it is not narrowed", async () => {
    const result = await getOwnerMoneySummary({ windowDays: 7 });

    expect(result.windowDays).toBe(7);
    expect(result.generatedAt).toBeInstanceOf(Date);
    for (const figure of [result.collected.amount, result.stillDue.amount, result.waiting.amount, result.closed.tuitions]) {
      expect(Number.isFinite(figure)).toBe(true);
    }
    // The test's own rows are in there too.
    expect(result.waiting.amount).toBeGreaterThanOrEqual(reportedAmount);
  });
});
