import { randomBytes } from "node:crypto";
import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { confirmationLetters, guardianProfiles, locations, tuitionSettlements, tutorRequests, users } from "../drizzle/schema";
import type { AdminJobFilters } from "./admin-job-filters";
import { getDb, listAdminAppointedJobsPage, listAdminCancelledChargesPage, listAdminClosedJobsPage, listAdminConfirmedJobsPage, listAdminPostedJobsPage } from "./db";

// Both Tutors are seeded by scripts/seed-dev-discovery-fixtures.mjs: Amina is a
// woman, Rakib a man. Every row this test makes is removed afterwards, by id.
// The Guardian's name carries a random tag and every list below asks for it, so
// whatever else the database holds does not change what is read.
const womanId = "dev-tutor-amina";
const manId = "dev-tutor-rakib";
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

const city = `test-ajs-city-${tag}`;
const area = `test-ajs-area-${tag}`;

const key: Record<string, number> = {};
const requestIds: number[] = [];
let guardianUserId = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function make(name: string, over: Partial<typeof tutorRequests.$inferInsert>) {
  const db = await database();
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    daysPerWeek: 3, locationText: "Dhaka", ...over,
  });
  key[name] = Number(made.insertId);
  requestIds.push(key[name]);
  return key[name];
}

beforeAll(async () => {
  const db = await database();
  await db.insert(locations).values({ id: city, label: "Test City", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: area, label: "Test Area", type: "area", country: "Bangladesh", parentId: city });
  const [guardian] = await db.insert(users).values({ openId: `test-ajs-${tag}`, name: `Gamma Guardian ${tag}`, role: "guardian" });
  guardianUserId = Number(guardian.insertId);
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `S${tag}01`, phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: city, locationId: area });

  // Appointed: one to the woman a while ago, one to the man yesterday.
  await make("a1", { status: "matched", tutorId: womanId, appointedAt: ago(20), createdAt: ago(25) });
  await make("a2", { status: "matched", tutorId: manId, appointedAt: ago(1), createdAt: ago(2), tuitionCityLocationId: city, tuitionLocationId: area, tuitionLocationLabel: "Test Area, Test City", budgetAmount: 7000 });

  // Confirmed: fully paid (so Closed) with an issued letter; half paid (still Confirmed) with only a draft.
  const c1 = await make("c1", { status: "matched", tutorId: womanId, appointedAt: ago(9), appointmentConfirmedAt: ago(3), paymentStatus: "full_paid", paymentCompletedAt: ago(2), createdAt: ago(12) });
  const c2 = await make("c2", { status: "matched", tutorId: manId, appointedAt: ago(40), appointmentConfirmedAt: ago(30), paymentStatus: "half_paid", createdAt: ago(45) });
  await db.insert(confirmationLetters).values({
    tutorRequestId: c1, guardianUserId, tutorId: womanId, createdByAdminUserId: guardianUserId, issuedByAdminUserId: guardianUserId, status: "issued",
    letterNumber: `TAJS-${tag}-1`, version: 1, contentSnapshot: "{}", issuedAt: new Date(),
  });
  await db.insert(confirmationLetters).values({
    tutorRequestId: c2, guardianUserId, tutorId: manId, createdByAdminUserId: guardianUserId, status: "draft",
    letterNumber: `TAJS-${tag}-2`, version: 1, contentSnapshot: "{}",
  });

  // Cancelled after being confirmed: never settled; settled with a credited refund; settled with nothing to return.
  await make("x1", { status: "closed", publicationState: "closed", tutorId: womanId, appointmentConfirmedAt: ago(60), cancelledAt: ago(10), paymentStatus: "partial_paid", cancellationReason: "The Tutor moved abroad", createdAt: ago(70) });
  const x2 = await make("x2", { status: "closed", publicationState: "closed", tutorId: womanId, appointmentConfirmedAt: ago(50), cancelledAt: ago(12), paymentStatus: "full_paid", cancellationReason: "Guardian changed plans", createdAt: ago(60) });
  const x3 = await make("x3", { status: "closed", publicationState: "closed", tutorId: manId, appointmentConfirmedAt: ago(45), cancelledAt: ago(2), paymentStatus: "full_paid", cancellationReason: "Missed classes", createdAt: ago(55) });
  await db.insert(tuitionSettlements).values({ tutorRequestId: x2, tutorId: womanId, reason: "guardian_valid", retained: 1500, paidAtSettlement: 2500, refundAmount: 1000, disposition: "credited" });
  await db.insert(tuitionSettlements).values({ tutorRequestId: x3, tutorId: manId, reason: "tutor_fault", retained: 2000, paidAtSettlement: 2000, refundAmount: 0, disposition: "none" });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (requestIds.length) {
    await db.delete(tuitionSettlements).where(inArray(tuitionSettlements.tutorRequestId, requestIds));
    await db.delete(confirmationLetters).where(inArray(confirmationLetters.tutorRequestId, requestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  if (guardianUserId) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, [guardianUserId]));
    await db.delete(users).where(inArray(users.id, [guardianUserId]));
  }
  await db.delete(locations).where(inArray(locations.id, [area]));
  await db.delete(locations).where(inArray(locations.id, [city]));
});

const namesOf = (items: Array<{ id: number }>) => Object.keys(key).filter(name => items.some(item => item.id === key[name])).sort();
const ask = (filters: AdminJobFilters) => ({ query: "", page: 1, pageSize: 100, filters: { guardian: tag, ...filters } });
const appointed = async (filters: AdminJobFilters = {}) => namesOf((await listAdminAppointedJobsPage(ask(filters))).items);
const confirmed = async (filters: AdminJobFilters = {}) => namesOf((await listAdminConfirmedJobsPage(ask(filters))).items);
const closed = async (filters: AdminJobFilters = {}) => namesOf((await listAdminClosedJobsPage(ask(filters))).items);
const cancelled = async (filters: AdminJobFilters = {}) => namesOf((await listAdminCancelledChargesPage(ask(filters))).items);

describe("the Appointed Jobs list", () => {
  it("lists only what is asked for, whoever holds it", async () => {
    expect(await appointed()).toEqual(["a1", "a2"]);
  });

  it("reads the Job Board's filters, salary and Guardian off each tuition", async () => {
    expect(await appointed({ cityId: city })).toEqual(["a2"]);
    expect(await appointed({ locationIds: [area] })).toEqual(["a2"]);
    expect(await appointed({ salaryFrom: 5000 })).toEqual(["a2"]);
    expect(await appointed({ salaryTo: 5000 })).toEqual([]);
    expect(await appointed({ guardian: `Gamma Guardian ${tag}` })).toEqual(["a1", "a2"]);
    expect(await appointed({ guardian: `Nobody ${tag}` })).toEqual([]);
  });

  it("narrows by the day a Tutor was appointed and by days since", async () => {
    expect(await appointed({ appointedFrom: ago(5) })).toEqual(["a2"]);
    expect(await appointed({ appointedTo: ago(5) })).toEqual(["a1"]);
    expect(await appointed({ daysInStage: 7 })).toEqual(["a1"]);
    expect(await appointed({ daysInStage: 30 })).toEqual([]);
  });

  it("narrows by the gender of the Tutor who holds it", async () => {
    expect(await appointed({ tutorGender: "female" })).toEqual(["a1"]);
    expect(await appointed({ tutorGender: "male" })).toEqual(["a2"]);
  });

  it("keeps a tuition whose Guardian has no profile in the list", async () => {
    // The Guardian is joined only to be searched; a tuition never drops out for want of one.
    const page = await listAdminAppointedJobsPage({ query: "", page: 1, pageSize: 100 });
    expect(page.total).toBeGreaterThanOrEqual(2);
    expect(namesOf(page.items)).toEqual(expect.arrayContaining(["a1", "a2"]));
  });
});

describe("the Confirmed Jobs list", () => {
  it("lists the confirmed ones, and not the one whose fee is paid in full", async () => {
    expect(await confirmed()).toEqual(["c2"]);
  });

  it("narrows by the Payment Status the ledger keeps, one or several", async () => {
    expect(await confirmed({ paymentStatuses: ["half_paid"] })).toEqual(["c2"]);
    expect(await confirmed({ paymentStatuses: ["half_paid", "partial_paid"] })).toEqual(["c2"]);
    expect(await confirmed({ paymentStatuses: ["full_due"] })).toEqual([]);
    // Full Paid is Closed, so no Confirmed list ever holds one.
    expect(await confirmed({ paymentStatuses: ["full_paid"] })).toEqual([]);
  });

  it("separates a tuition whose letter is issued from one with a draft or none", async () => {
    expect(await confirmed({ letter: "issued" })).toEqual([]);
    expect(await confirmed({ letter: "not_issued" })).toEqual(["c2"]);
  });

  it("narrows by the day it was confirmed, the day it was appointed, and days since", async () => {
    expect(await confirmed({ confirmedFrom: ago(10) })).toEqual([]);
    expect(await confirmed({ confirmedTo: ago(10) })).toEqual(["c2"]);
    expect(await confirmed({ appointedFrom: ago(20) })).toEqual([]);
    expect(await confirmed({ daysInStage: 14 })).toEqual(["c2"]);
  });

  it("narrows by the Tutor's gender", async () => {
    expect(await confirmed({ tutorGender: "female" })).toEqual([]);
    expect(await confirmed({ tutorGender: "male" })).toEqual(["c2"]);
  });
});

describe("the Closed Jobs list", () => {
  it("lists the Confirmed tuition whose fee is Full Paid, with the day it closed", async () => {
    expect(await closed()).toEqual(["c1"]);
    const [row] = (await listAdminClosedJobsPage(ask({}))).items;
    expect(row?.closedAt).toBeInstanceOf(Date);
    expect(row?.paymentStatus).toBe("full_paid");
  });

  it("reads the same dates and letter choices as Confirmed, and the day it closed", async () => {
    expect(await closed({ confirmedFrom: ago(10) })).toEqual(["c1"]);
    expect(await closed({ confirmedTo: ago(10) })).toEqual([]);
    expect(await closed({ appointedFrom: ago(20) })).toEqual(["c1"]);
    expect(await closed({ letter: "issued" })).toEqual(["c1"]);
    expect(await closed({ letter: "not_issued" })).toEqual([]);
    expect(await closed({ closedFrom: ago(5) })).toEqual(["c1"]);
    expect(await closed({ closedTo: ago(5) })).toEqual([]);
  });

  it("counts days from the day the last payment closed it, not the day it was confirmed", async () => {
    // Confirmed 3 days ago but closed 2 days ago.
    expect(await closed({ daysInStage: 1 })).toEqual(["c1"]);
    expect(await closed({ daysInStage: 3 })).toEqual([]);
  });

  it("narrows by the Tutor's gender", async () => {
    expect(await closed({ tutorGender: "female" })).toEqual(["c1"]);
    expect(await closed({ tutorGender: "male" })).toEqual([]);
  });
});

describe("the Cancelled list", () => {
  it("lists the tuitions cancelled after they were confirmed", async () => {
    expect(await cancelled()).toEqual(["x1", "x2", "x3"]);
  });

  it("narrows by the day it was cancelled and by days since", async () => {
    expect(await cancelled({ cancelledFrom: ago(5) })).toEqual(["x3"]);
    expect(await cancelled({ cancelledTo: ago(11) })).toEqual(["x2"]);
    // A day short of the 10 that x1 was cancelled ago: a stored timestamp is rounded to the second, so asking for exactly 10 passes or fails on timing.
    expect(await cancelled({ daysInStage: 9 })).toEqual(["x1", "x2"]);
  });

  it("tells a settled tuition from one nobody has settled, and one with a refund from one without", async () => {
    expect(await cancelled({ settlement: "not_settled" })).toEqual(["x1"]);
    expect(await cancelled({ settlement: "settled" })).toEqual(["x2", "x3"]);
    expect(await cancelled({ settlement: "refund" })).toEqual(["x2"]);
  });

  it("narrows by what became of a refund, and by why the tuition ended", async () => {
    expect(await cancelled({ refundDisposition: "credited" })).toEqual(["x2"]);
    expect(await cancelled({ refundDisposition: "refunded" })).toEqual([]);
    expect(await cancelled({ settlementReasons: ["tutor_fault"] })).toEqual(["x3"]);
    expect(await cancelled({ settlementReasons: ["guardian_valid", "tutor_fault"] })).toEqual(["x2", "x3"]);
    expect(await cancelled({ settlementReasons: ["late_notice"] })).toEqual([]);
  });

  it("finds a word of the reason typed at cancellation, and the Payment Status", async () => {
    expect(await cancelled({ cancelReason: "moved abroad" })).toEqual(["x1"]);
    expect(await cancelled({ cancelReason: "plans" })).toEqual(["x2"]);
    expect(await cancelled({ paymentStatuses: ["partial_paid"] })).toEqual(["x1"]);
    expect(await cancelled({ paymentStatuses: ["full_paid"] })).toEqual(["x2", "x3"]);
  });

  it("narrows by the Tutor's gender", async () => {
    expect(await cancelled({ tutorGender: "male" })).toEqual(["x3"]);
    expect(await cancelled({ tutorGender: "female" })).toEqual(["x1", "x2"]);
  });
});

describe("the same choices on the Posted jobs board", () => {
  const board = async (stage: "appointed" | "confirmed" | "closed" | "cancelled", filters: AdminJobFilters) => {
    const page = await listAdminPostedJobsPage({ query: "", stage, page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag, ...filters } });
    return { names: namesOf(page.items), counts: page.counts };
  };

  it("narrows the open stage with its own choices and leaves the other stages' counts alone", async () => {
    const confirmedNow = await board("confirmed", { paymentStatuses: ["half_paid"] });
    expect(confirmedNow.names).toEqual(["c2"]);
    expect(confirmedNow.counts).toEqual({ pending: 0, live: 0, appointed: 2, confirmed: 1, closed: 1, cancelled: 3 });

    const closedNow = await board("closed", { closedFrom: ago(5), letter: "issued" });
    expect(closedNow.names).toEqual(["c1"]);
    expect(closedNow.counts.closed).toBe(1);
    expect(closedNow.counts.confirmed).toBe(1);

    const cancelledNow = await board("cancelled", { settlement: "refund" });
    expect(cancelledNow.names).toEqual(["x2"]);
    expect(cancelledNow.counts.confirmed).toBe(1);
    expect(cancelledNow.counts.closed).toBe(1);

    const appointedNow = await board("appointed", { tutorGender: "female", appointedTo: ago(5) });
    expect(appointedNow.names).toEqual(["a1"]);
    expect(appointedNow.counts.appointed).toBe(1);
  });
});
