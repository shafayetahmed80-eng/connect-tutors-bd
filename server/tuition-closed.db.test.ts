import { randomBytes } from "node:crypto";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { guardianProfiles, locations, tuitionPayments, tutorNotifications, tutorRequestOperationEvents, tutorRequests, users } from "../drizzle/schema";
import {
  getDb,
  getTuitionPaymentLedger,
  getTutorChargeOverview,
  listAdminClosedJobsPage,
  listAdminConfirmedJobsPage,
  listAdminPostedJobsPage,
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

describe("a Closed tuition that is cancelled is Cancelled, not Closed", () => {
  it("moves to Cancelled and leaves the Closed list", async () => {
    const db = await database();
    await db.update(tutorRequests).set({ status: "closed", publicationState: "closed", cancelledAt: new Date(), cancellationReason: "Test" }).where(eq(tutorRequests.id, requestId));

    expect(await inClosed()).toBe(false);
    const page = await listAdminPostedJobsPage({ query: "", stage: "cancelled", page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag } });
    expect(page.items.map(item => item.id)).toContain(requestId);
  });
});
