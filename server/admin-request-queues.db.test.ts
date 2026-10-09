import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountChangeRequests, guardianProfiles, guardianTuitionRequests, locations, tutorJobInterests, tutorJobs, tutorRequests, tutors, users } from "../drizzle/schema";
import { jobIdForRequest } from "@shared/job-id";
import type { AdminGuardianRequestQueueFilters } from "./admin-request-filters";
import { getDb, listAccountChangeRequestsForAdmin, listGuardianRequestActions } from "./db";

// What the two request queues - Guardian Requests and Change requests - narrow
// by. Everything is made here, found again by a random tag in the names, and
// removed afterwards by id, so whatever else the database holds does not
// change what is read.
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

const userIds: number[] = [];
const requestIds: number[] = [];
const tutorIds: string[] = [];
const jobIds: number[] = [];
const key: Record<string, number> = {};
const nameOfRequest = new Map<number, string>();
let adminUserId = 0;
let area = "";
let city = "";
const people: Record<string, number> = {};
const tutorOf: Record<string, string> = {};

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeUser(name: string, role: "guardian" | "tutor" | "admin") {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-rq-${tag}-${name}`, name: `${name} ${tag}`, role });
  const id = Number(made.insertId);
  userIds.push(id);
  people[name] = id;
  return id;
}

async function makeGuardian(name: string) {
  const db = await database();
  const id = await makeUser(name, "guardian");
  await db.insert(guardianProfiles).values({ userId: id, guardianId: `${name}${tag}`.slice(0, 12), phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: city, locationId: area });
  return id;
}

async function makeTutor(name: string) {
  const db = await database();
  const userId = await makeUser(name, "tutor");
  const id = `rq-${tag}-${name}`;
  await db.insert(tutors).values({ id, userId, name: `${name} ${tag}`, profileStatus: "approved", gender: "female", locationId: area });
  tutorIds.push(id);
  tutorOf[name] = id;
  return id;
}

async function makeRequest(name: string, guardianUserId: number, over: Partial<typeof tutorRequests.$inferInsert>) {
  const db = await database();
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]), daysPerWeek: 3, locationText: "Dhaka", ...over,
  });
  key[name] = Number(made.insertId);
  requestIds.push(key[name]);
  nameOfRequest.set(key[name], name);
  return key[name];
}

async function makeJob(requestId: number, interests: Array<{ tutorId: string; shortlistedAt?: Date; appointmentRequestedAt?: Date; status?: "interested" | "shortlisted" }>) {
  const db = await database();
  const [job] = await db.insert(tutorJobs).values({
    tutorRequestId: requestId, publicJobId: `RQ-${tag}-${requestId}`, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5",
    subjects: JSON.stringify(["Math"]), daysPerWeek: 3, publishedAt: new Date(),
  });
  jobIds.push(Number(job.insertId));
  for (const interest of interests) {
    await db.insert(tutorJobInterests).values({
      tutorJobId: Number(job.insertId), tutorId: interest.tutorId, status: interest.status ?? "interested",
      guardianShortlistedAt: interest.shortlistedAt ?? null, appointmentRequestedAt: interest.appointmentRequestedAt ?? null,
    });
  }
}

async function askGuardian(requestId: number, over: Partial<typeof guardianTuitionRequests.$inferInsert>) {
  const db = await database();
  await db.insert(guardianTuitionRequests).values({ tutorRequestId: requestId, type: "confirm", status: "pending", ...over } as typeof guardianTuitionRequests.$inferInsert);
}

async function askChange(name: string, userId: number, role: "guardian" | "tutor" | "admin", over: Partial<typeof accountChangeRequests.$inferInsert>) {
  const db = await database();
  await db.insert(accountChangeRequests).values({ userId, role, type: "name", currentValue: "A", requestedValue: "B", status: "pending", ...over });
  void name;
}

beforeAll(async () => {
  const db = await database();
  const [row] = await db.select({ id: locations.id, parentId: locations.parentId }).from(locations).where(eq(locations.type, "area")).limit(1);
  if (!row?.parentId) throw new Error("These tests need an area with a city in the locations table");
  area = row.id;
  city = row.parentId;
  adminUserId = await makeUser("admin", "admin");
  const gA = await makeGuardian("gA");
  const gB = await makeGuardian("gB");
  const tA = await makeTutor("tA");
  const tB = await makeTutor("tB");

  // r1 Appointed (a Guardian's own post), r2 Confirmed (an Admin's), r3 Live (a Guardian's), r4 Cancelled
  const r1 = await makeRequest("r1", gA, { status: "matched", tutorId: tA, publicationState: "published", appointedAt: ago(9) });
  const r2 = await makeRequest("r2", gB, { status: "matched", tutorId: tB, publicationState: "published", appointedAt: ago(30), appointmentConfirmedAt: ago(20), postedByAdmin: 1 });
  const r3 = await makeRequest("r3", gA, { status: "reviewing", publicationState: "published" });
  const r4 = await makeRequest("r4", gB, { status: "closed", publicationState: "closed", cancelledAt: ago(1) });
  void r4;

  await askGuardian(r1, { guardianUserId: gA, type: "confirm", tutorId: tA, createdAt: ago(10) });
  await askGuardian(r2, { guardianUserId: gB, type: "remove_tutor", tutorId: tB, reason: "Misses classes", createdAt: ago(3) });
  await askGuardian(r3, { guardianUserId: gA, type: "cancel_tuition", reason: "Found someone", createdAt: ago(1) });
  await askGuardian(r2, { guardianUserId: gB, type: "remove_tutor", tutorId: tB, reason: "Earlier ask", status: "approved", decidedAt: ago(28), createdAt: ago(31) });
  await askGuardian(r1, { guardianUserId: gA, type: "confirm", tutorId: tA, status: "declined", decidedAt: ago(45), createdAt: ago(50) });

  // Applicants on r3: one the Guardian shortlisted, one the Guardian asked to appoint
  await makeJob(r3, [
    { tutorId: tA, status: "shortlisted", shortlistedAt: ago(5) },
    { tutorId: tB, appointmentRequestedAt: ago(2) },
  ]);

  // Change requests
  await askChange("c1", gA, "guardian", { type: "name", createdAt: ago(10) });
  await askChange("c2", gB, "guardian", { type: "mobile", createdAt: ago(3) });
  await askChange("c3", people.tA, "tutor", { type: "name", status: "approved", decidedAt: ago(19), createdAt: ago(20) });
  await askChange("c4", gA, "guardian", { type: "close_account", reason: "Moving", status: "declined", declineReason: "A payment is still due", decidedAt: ago(30), createdAt: ago(40) });
  await askChange("c5", gB, "guardian", { type: "name", status: "declined", declineReason: "Not enough detail", decidedAt: ago(4), createdAt: ago(5) });
  await askChange("c6", adminUserId, "admin", { type: "mobile", createdAt: ago(2) });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  await db.delete(accountChangeRequests).where(inArray(accountChangeRequests.userId, userIds));
  if (jobIds.length) await db.delete(tutorJobInterests).where(inArray(tutorJobInterests.tutorJobId, jobIds));
  if (requestIds.length) {
    await db.delete(guardianTuitionRequests).where(inArray(guardianTuitionRequests.tutorRequestId, requestIds));
    await db.delete(tutorJobs).where(inArray(tutorJobs.tutorRequestId, requestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  if (tutorIds.length) await db.delete(tutors).where(inArray(tutors.id, tutorIds));
  if (userIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

/** Which of this test's tuitions a Guardian Requests screen lists, by name, for these choices. */
async function guardianQueue(kind: "shortlist" | "appoint" | "confirm" | "cancel", over: { status?: "pending" | "approved" | "declined"; query?: string; filters?: AdminGuardianRequestQueueFilters } = {}) {
  const page = await listGuardianRequestActions({ kind, status: over.status ?? "pending", page: 1, pageSize: 100, query: over.query ?? tag, filters: over.filters });
  const names = page.items.map(item => nameOfRequest.get(item.requestId)).filter(Boolean).sort();
  return { names, counts: page.counts, total: page.total };
}

/** Which of this test's Change requests a queue lists, by the account's name, for these choices. */
async function changeQueue(over: Partial<Parameters<typeof listAccountChangeRequestsForAdmin>[0]> = {}) {
  const page = await listAccountChangeRequestsForAdmin({ status: "pending", role: "all", type: "all", includeAdminRequests: false, query: tag, ...over });
  return { names: page.items.map(item => item.accountName?.replace(` ${tag}`, "")).sort(), counts: page.counts };
}

describe("the Guardian Requests queues", () => {
  it("finds the requests of this test on each screen, as before", async () => {
    expect((await guardianQueue("confirm")).names).toEqual(["r1"]);
    expect((await guardianQueue("cancel")).names).toEqual(["r2", "r3"]);
    expect((await guardianQueue("appoint")).names).toEqual(["r3"]);
    expect((await guardianQueue("shortlist")).names).toEqual(["r3"]);
  });

  it("searches a Job ID, a Guardian's name or Guardian ID, and a Tutor's name", async () => {
    expect((await guardianQueue("cancel", { query: jobIdForRequest(key.r2) })).names).toEqual(["r2"]);
    expect((await guardianQueue("cancel", { query: `gA ${tag}` })).names).toEqual(["r3"]);
    expect((await guardianQueue("cancel", { query: `gB ${tag}` })).names).toEqual(["r2"]);
    expect((await guardianQueue("cancel", { query: `tB ${tag}` })).names).toEqual(["r2"]);
    expect((await guardianQueue("confirm", { query: `tB ${tag}` })).names).toEqual([]);
    expect((await guardianQueue("shortlist", { query: `tA ${tag}` })).names).toEqual(["r3"]);
    expect((await guardianQueue("cancel", { query: "no-such-person-or-tuition" })).names).toEqual([]);
  });

  it("tells a removal from a cancellation on the Cancel screen", async () => {
    expect((await guardianQueue("cancel", { filters: { requestType: "remove_tutor" } })).names).toEqual(["r2"]);
    expect((await guardianQueue("cancel", { filters: { requestType: "cancel_tuition" } })).names).toEqual(["r3"]);
    // A kind of request the screen does not hold finds nothing, rather than another screen's.
    expect((await guardianQueue("confirm", { filters: { requestType: "remove_tutor" } })).names).toEqual([]);
  });

  it("takes a requested-date range, from the day the Guardian asked or shortlisted", async () => {
    expect((await guardianQueue("cancel", { filters: { requestedFrom: ago(2) } })).names).toEqual(["r3"]);
    expect((await guardianQueue("cancel", { filters: { requestedTo: ago(2) } })).names).toEqual(["r2"]);
    expect((await guardianQueue("shortlist", { filters: { requestedFrom: ago(6) } })).names).toEqual(["r3"]);
    expect((await guardianQueue("shortlist", { filters: { requestedFrom: ago(3) } })).names).toEqual([]);
    expect((await guardianQueue("shortlist", { filters: { requestedTo: ago(6) } })).names).toEqual([]);
    expect((await guardianQueue("appoint", { filters: { requestedFrom: ago(1) } })).names).toEqual([]);
  });

  it("separates the Admin's own tuitions from the Guardians', and reads the stage the tuition is in now", async () => {
    expect((await guardianQueue("cancel", { filters: { postedBy: "admin" } })).names).toEqual(["r2"]);
    expect((await guardianQueue("cancel", { filters: { postedBy: "guardian" } })).names).toEqual(["r3"]);
    expect((await guardianQueue("cancel", { filters: { tuitionStage: "confirmed" } })).names).toEqual(["r2"]);
    expect((await guardianQueue("cancel", { filters: { tuitionStage: "live" } })).names).toEqual(["r3"]);
    expect((await guardianQueue("confirm", { filters: { tuitionStage: "appointed" } })).names).toEqual(["r1"]);
    expect((await guardianQueue("confirm", { filters: { tuitionStage: "cancelled" } })).names).toEqual([]);
  });

  it("lets the tab counts follow the search and the panel, so a tab never says more than it opens on", async () => {
    const all = await guardianQueue("cancel");
    expect(all.counts).toEqual({ pending: 2, approved: 1, declined: 0 });

    const narrowed = await guardianQueue("cancel", { filters: { tuitionStage: "live" } });
    expect(narrowed.counts).toEqual({ pending: 1, approved: 0, declined: 0 });
    expect(narrowed.total).toBe(1);

    const approved = await guardianQueue("cancel", { status: "approved", filters: { postedBy: "admin" } });
    expect(approved.names).toEqual(["r2"]);
    expect(approved.counts).toEqual({ pending: 1, approved: 1, declined: 0 });
    expect((await guardianQueue("confirm", { status: "declined" })).total).toBe(1);
  });
});

describe("the Change requests queue", () => {
  it("lists the requests of this test, an Admin's left out unless the Project Owner asks", async () => {
    expect((await changeQueue()).names).toEqual(["gA", "gB"]);
    expect((await changeQueue({ includeAdminRequests: true })).names).toEqual(["admin", "gA", "gB"]);
  });

  it("searches an account's name or Guardian ID, and does not find an account by someone else's", async () => {
    expect((await changeQueue({ query: `gA ${tag}` })).names).toEqual(["gA"]);
    expect((await changeQueue({ query: `${"gB"}${tag}`.slice(0, 12) })).names).toEqual(["gB"]);
    expect((await changeQueue({ query: "no-such-account-name" })).names).toEqual([]);
  });

  it("takes a requested-date range", async () => {
    expect((await changeQueue({ requestedFrom: ago(5) })).names).toEqual(["gB"]);
    expect((await changeQueue({ requestedTo: ago(5) })).names).toEqual(["gA"]);
    expect((await changeQueue({ status: "declined", requestedFrom: ago(10) })).names).toEqual(["gB"]);
  });

  it("narrows by the panel the account belongs to and by what it asked for", async () => {
    expect((await changeQueue({ status: "approved", role: "tutor" })).names).toEqual(["tA"]);
    expect((await changeQueue({ role: "guardian", type: "mobile" })).names).toEqual(["gB"]);
    expect((await changeQueue({ type: "close_account" })).names).toEqual([]);
  });

  it("finds a decline by words from its reason, on the Declined tab alone", async () => {
    expect((await changeQueue({ status: "declined", declineReason: "payment" })).names).toEqual(["gA"]);
    expect((await changeQueue({ status: "declined", declineReason: "detail" })).names).toEqual(["gB"]);
    expect((await changeQueue({ status: "declined", declineReason: "nothing like this" })).names).toEqual([]);
    // The other tabs have no decline reason to read, so the words leave them as they are.
    expect((await changeQueue({ status: "pending", declineReason: "payment" })).names).toEqual(["gA", "gB"]);
  });

  it("lets the tab counts follow the search and the panel, the Declined count following the reason", async () => {
    expect((await changeQueue()).counts).toEqual({ pending: 2, approved: 1, declined: 2 });
    expect((await changeQueue({ role: "guardian" })).counts).toEqual({ pending: 2, approved: 0, declined: 2 });
    expect((await changeQueue({ query: `gA ${tag}` })).counts).toEqual({ pending: 1, approved: 0, declined: 1 });
    expect((await changeQueue({ declineReason: "payment" })).counts).toEqual({ pending: 2, approved: 1, declined: 1 });
  });
});
