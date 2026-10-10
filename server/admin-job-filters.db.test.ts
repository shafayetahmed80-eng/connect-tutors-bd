import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardianProfiles, guardianTuitionRequests, locations, tutorJobInterests, tutorJobs, tutorRequests, users } from "../drizzle/schema";
import { jobIdForRequest } from "@shared/job-id";
import type { AdminJobFilters } from "./admin-job-filters";
import { getAdminJobFilterOptions, getDb, listAdminPostedJobsPage } from "./db";

// Both Tutors are seeded by scripts/seed-dev-discovery-fixtures.mjs. Every row
// this test makes is removed afterwards, by id. The Guardians' names carry a
// random tag, and every list below asks for that tag, so whatever else the
// database holds does not change what is read.
const holderId = "dev-tutor-amina";
const otherTutorId = "dev-tutor-rakib";
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

const cityA = `test-ajf-city-a-${tag}`;
const areaA = `test-ajf-area-a-${tag}`;
const cityB = `test-ajf-city-b-${tag}`;
const areaB = `test-ajf-area-b-${tag}`;

const key: Record<string, number> = {};
const requestIds: number[] = [];
const userIds: number[] = [];
const jobIds: number[] = [];

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeGuardian(name: string, suffix: string) {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-ajf-${tag}-${suffix}`, name: `${name} ${tag}`, role: "guardian" });
  const userId = Number(made.insertId);
  userIds.push(userId);
  await db.insert(guardianProfiles).values({
    userId, guardianId: `T${tag}${suffix}`.slice(0, 12), phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`,
    gender: "female", cityLocationId: cityA, locationId: areaA,
  });
  return userId;
}

type Made = Partial<typeof tutorRequests.$inferInsert>;

async function makeRequest(name: string, guardianUserId: number, over: Made) {
  const db = await database();
  const [made] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    daysPerWeek: 3, locationText: "Dhaka", ...over,
  });
  key[name] = Number(made.insertId);
  requestIds.push(key[name]);
  return key[name];
}

async function makeJob(requestId: number, interests: Array<{ tutorId: string; status: "interested" | "withdrawn" | "shortlisted" | "matched" }>) {
  const db = await database();
  const [job] = await db.insert(tutorJobs).values({
    tutorRequestId: requestId, publicJobId: `TAJF-${tag}-${requestId}`, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5",
    subjects: JSON.stringify(["Math"]), daysPerWeek: 3, publishedAt: new Date(),
  });
  jobIds.push(Number(job.insertId));
  for (const interest of interests) await db.insert(tutorJobInterests).values({ tutorJobId: Number(job.insertId), ...interest });
}

async function waitingRequest(requestId: number, guardianUserId: number, over: Partial<typeof guardianTuitionRequests.$inferInsert>) {
  const db = await database();
  await db.insert(guardianTuitionRequests).values({ tutorRequestId: requestId, guardianUserId, type: "confirm", tutorId: holderId, status: "pending", ...over });
}

beforeAll(async () => {
  const db = await database();
  await db.insert(locations).values({ id: cityA, label: "Test City A", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaA, label: "Test Area A", type: "area", country: "Bangladesh", parentId: cityA });
  await db.insert(locations).values({ id: cityB, label: "Test City B", type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaB, label: "Test Area B", type: "area", country: "Bangladesh", parentId: cityB });

  const first = await makeGuardian("Alpha Guardian", "01");
  const second = await makeGuardian("Beta Guardian", "02");

  // Pending
  await makeRequest("p1", first, {
    subjects: JSON.stringify(["Math", "English"]), budgetAmount: 4000, tuitionCityLocationId: cityA, tuitionLocationId: areaA, tuitionLocationLabel: "Test Area A, Test City A",
    publicationState: "submitted", heardAboutUs: "facebook", studentGender: "male", preferredGender: "female", createdAt: ago(10),
  });
  await makeRequest("p2", first, {
    tuitionType: "online", category: "English Version", classCourse: "Class 8", subjects: JSON.stringify(["Physics"]), daysPerWeek: 5, budgetAmount: 8000,
    tuitionCityLocationId: cityB, tuitionLocationId: areaB, tuitionLocationLabel: "Test Area B, Test City B", publicationState: "reviewing", postedByAdmin: 1,
    heardAboutUs: "others", preferredGender: "any", createdAt: ago(2),
  });
  // Live
  const l1 = await makeRequest("l1", second, {
    budgetAmount: 5000, tuitionCityLocationId: cityA, tuitionLocationId: areaA, tuitionLocationLabel: "Test Area A, Test City A",
    status: "reviewing", publicationState: "published", createdAt: ago(8),
  });
  await makeJob(l1, [{ tutorId: holderId, status: "shortlisted" }, { tutorId: otherTutorId, status: "withdrawn" }]);
  const l2 = await makeRequest("l2", second, {
    classCourse: "Class 6", subjects: JSON.stringify(["Bangla"]), daysPerWeek: 4, budgetAmount: 6000, tuitionCityLocationId: cityA, tuitionLocationId: areaA,
    tuitionLocationLabel: "Test Area A, Test City A", status: "reviewing", publicationState: "published", createdAt: ago(1),
  });
  await makeJob(l2, []);
  // Appointed, with the Guardian's Confirm waiting
  const a1 = await makeRequest("a1", second, { status: "matched", tutorId: holderId, publicationState: "published", appointedAt: ago(5), createdAt: ago(12) });
  await waitingRequest(a1, second, { type: "confirm" });
  // The Tutor it holds, and one more who applied and was not picked
  await makeJob(a1, [{ tutorId: holderId, status: "matched" }, { tutorId: otherTutorId, status: "interested" }]);
  // Appointed, with a Confirm about a Tutor who no longer holds it: left behind, not answerable
  const a2 = await makeRequest("a2", second, { status: "matched", tutorId: holderId, publicationState: "published", appointedAt: ago(1), createdAt: ago(3) });
  await waitingRequest(a2, second, { type: "confirm", tutorId: otherTutorId });
  // Confirmed, with the Guardian's removal waiting
  const c1 = await makeRequest("c1", second, { status: "matched", tutorId: holderId, publicationState: "published", appointedAt: ago(30), appointmentConfirmedAt: ago(20), createdAt: ago(35) });
  await waitingRequest(c1, second, { type: "remove_tutor", reason: "Misses classes" });
  await makeJob(c1, [{ tutorId: holderId, status: "matched" }]);
  // Cancelled
  await makeRequest("x1", second, { status: "closed", publicationState: "closed", cancelledAt: ago(40), cancellationReason: "No longer needed", createdAt: ago(50) });
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (jobIds.length) await db.delete(tutorJobInterests).where(inArray(tutorJobInterests.tutorJobId, jobIds));
  if (requestIds.length) {
    await db.delete(guardianTuitionRequests).where(inArray(guardianTuitionRequests.tutorRequestId, requestIds));
    await db.delete(tutorJobs).where(inArray(tutorJobs.tutorRequestId, requestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  if (userIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await db.delete(locations).where(inArray(locations.id, [areaA, areaB]));
  await db.delete(locations).where(inArray(locations.id, [cityA, cityB]));
});

/** Which of this test's tuitions a list returns, by name. */
async function read(filters: AdminJobFilters, stage: "all" | "pending" | "live" | "appointed" | "confirmed" | "cancelled" = "all") {
  const page = await listAdminPostedJobsPage({ query: "", stage, page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag, ...filters } });
  const names = Object.keys(key).filter(name => page.items.some(item => item.id === key[name])).sort();
  return { names, counts: page.counts, total: page.total };
}

/** The tuitions Applied Tutors lists - Live, Appointed and Confirmed together - by name. */
async function readApplied(filters: AdminJobFilters, stages: Array<"live" | "appointed" | "confirmed"> = ["live", "appointed", "confirmed"]) {
  const page = await listAdminPostedJobsPage({ query: "", stage: "all", stages, page: 1, pageSize: 100, postedBy: "all", filters: { guardian: tag, ...filters } });
  return Object.keys(key).filter(name => page.items.some(item => item.id === key[name])).sort();
}

describe("the Admin's job filters", () => {
  it("counts each stage in SQL, the way the stages were always counted", async () => {
    const { counts, total } = await read({});
    expect(counts).toEqual({ pending: 2, live: 2, appointed: 2, confirmed: 1, closed: 0, cancelled: 1 });
    expect(total).toBe(8);
  });

  it("reads the Job Board's own filters off the request", async () => {
    expect((await read({ cityId: cityA })).names).toEqual(["l1", "l2", "p1"]);
    expect((await read({ locationIds: [areaB] })).names).toEqual(["p2"]);
    expect((await read({ tuitionTypes: ["online"] })).names).toEqual(["p2"]);
    expect((await read({ daysPerWeek: [5] })).names).toEqual(["p2"]);
    expect((await read({ categories: ["English Version"] })).names).toEqual(["p2"]);
    expect((await read({ classCourses: ["Class 6"] })).names).toEqual(["l2"]);
    expect((await read({ studentGender: "male" })).names).toEqual(["p1"]);
    expect((await read({ preferredTutorGender: "female" })).names).toEqual(["p1"]);
    // "Any" is what a request holds unless the Guardian chose a gender, so it is nearly all of them.
    expect((await read({ preferredTutorGender: "any" })).names).toEqual(["a1", "a2", "c1", "l1", "l2", "p2", "x1"]);
  });

  it("finds a subject inside the JSON list, and any one of several", async () => {
    expect((await read({ subjects: ["English"] }, "pending")).names).toEqual(["p1"]);
    expect((await read({ subjects: ["Physics", "Bangla"] })).names).toEqual(["l2", "p2"]);
  });

  it("finds a tuition by its Job ID, and nothing by a number that is not one", async () => {
    expect((await read({ jobId: jobIdForRequest(key.l1) })).names).toEqual(["l1"]);
    expect((await read({ jobId: "not-a-number" })).names).toEqual([]);
  });

  it("takes a salary range, and leaves out a tuition with no salary on it", async () => {
    expect((await read({ salaryFrom: 5000 })).names).toEqual(["l1", "l2", "p2"]);
    expect((await read({ salaryTo: 5000 })).names).toEqual(["l1", "p1"]);
    expect((await read({ salaryFrom: 5000, salaryTo: 6000 })).names).toEqual(["l1", "l2"]);
  });

  it("separates Guardian posts from Admin posts, and finds a Guardian by name", async () => {
    expect((await read({ postedBy: "admin" })).names).toEqual(["p2"]);
    expect((await read({ postedBy: "guardian" })).names).not.toContain("p2");
    expect((await read({ guardian: `Alpha Guardian ${tag}` })).names).toEqual(["p1", "p2"]);
    expect((await read({ guardian: `Beta Guardian ${tag}` })).names).toEqual(["a1", "a2", "c1", "l1", "l2", "x1"]);
  });

  it("finds a Guardian by Guardian ID or by mobile number", async () => {
    const db = await database();
    const [profile] = await db.select({ guardianId: guardianProfiles.guardianId, phone: guardianProfiles.phone }).from(guardianProfiles).where(inArray(guardianProfiles.userId, userIds.slice(0, 1)));
    expect((await read({ guardian: profile.guardianId })).names).toEqual(["p1", "p2"]);
    expect((await read({ guardian: profile.phone })).names).toEqual(["p1", "p2"]);
  });

  it("filters on how the Guardian heard of us and on the posting date", async () => {
    expect((await read({ heardAboutUs: ["facebook"] })).names).toEqual(["p1"]);
    expect((await read({ postedFrom: ago(9) })).names).not.toContain("p1");
    expect((await read({ postedFrom: ago(9) })).names).toContain("l2");
    expect((await read({ postedTo: ago(9) })).names).toContain("p1");
    expect((await read({ postedTo: ago(9) })).names).not.toContain("l2");
  });

  it("finds a waiting Guardian request only while the tuition can still answer it", async () => {
    expect((await read({ waitingRequest: "any" })).names).toEqual(["a1", "c1"]);
    expect((await read({ waitingRequest: "confirm" })).names).toEqual(["a1"]);
    expect((await read({ waitingRequest: "remove_tutor" })).names).toEqual(["c1"]);
    expect((await read({ waitingRequest: "cancel_tuition" })).names).toEqual([]);
  });

  it("counts days from the date each stage began", async () => {
    expect((await read({ daysInStage: 7 }, "pending")).names).toEqual(["p1"]);
    expect((await read({ daysInStage: 7 }, "live")).names).toEqual(["l1"]);
    expect((await read({ daysInStage: 3 }, "appointed")).names).toEqual(["a1"]);
    expect((await read({ daysInStage: 7 }, "appointed")).names).toEqual([]);
    expect((await read({ daysInStage: 14 }, "confirmed")).names).toEqual(["c1"]);
    expect((await read({ daysInStage: 30 }, "cancelled")).names).toEqual(["x1"]);
    expect((await read({ daysInStage: 30 }, "confirmed")).names).toEqual([]);
    // The two longest waits the filter offers: nothing here has waited that long yet.
    expect((await read({ daysInStage: 60 }, "pending")).names).toEqual([]);
    expect((await read({ daysInStage: 90 }, "live")).names).toEqual([]);
  });

  it("lets the tab counts follow the filters, so a tab never says more than it opens on", async () => {
    const { counts } = await read({ tuitionTypes: ["online"] });
    expect(counts).toEqual({ pending: 1, live: 0, appointed: 0, confirmed: 0, closed: 0, cancelled: 0 });
  });

  it("narrows only the open stage with a filter that means something there alone", async () => {
    const pending = await read({ publicationStates: ["reviewing"] }, "pending");
    expect(pending.names).toEqual(["p2"]);
    expect(pending.counts.pending).toBe(1);
    expect(pending.counts.live).toBe(2);

    // Not the open stage: the Pending-only choice leaves Pending's own count alone.
    const live = await read({ publicationStates: ["reviewing"] }, "live");
    expect(live.counts.pending).toBe(2);
    expect(live.names).toEqual(["l1", "l2"]);

    expect((await read({ applicants: "none" }, "live")).names).toEqual(["l2"]);
    // Withdrawn interest is not an application, so one standing applicant is "few".
    expect((await read({ applicants: "few" }, "live")).names).toEqual(["l1"]);
    expect((await read({ applicants: "many" }, "live")).names).toEqual([]);
  });

  it("lists Live, Appointed and Confirmed together for Applied Tutors, each with the applicants it kept", async () => {
    expect(await readApplied({})).toEqual(["a1", "a2", "c1", "l1", "l2"]);
    // Applicants are read the way the card's own number is: withdrawn interest is not an application.
    expect(await readApplied({ applicants: "none" })).toEqual(["a2", "l2"]);
    expect(await readApplied({ applicants: "few" })).toEqual(["a1", "c1", "l1"]);
    expect(await readApplied({ applicants: "many" })).toEqual([]);
    expect(await readApplied({ applicants: "few" }, ["appointed"])).toEqual(["a1"]);
  });

  it("finds the tuitions that have a Tutor on the Admin's shortlist, and those that have none", async () => {
    // Only a Tutor whose own status is "shortlisted" counts: the one who holds a tuition has moved past it.
    expect(await readApplied({ shortlisted: "has" })).toEqual(["l1"]);
    expect(await readApplied({ shortlisted: "none" })).toEqual(["a1", "a2", "c1", "l2"]);
    expect(await readApplied({ shortlisted: "has", applicants: "none" })).toEqual([]);
    expect(await readApplied({ shortlisted: "has", applicants: "few" }, ["appointed", "confirmed"])).toEqual([]);
  });

  it("counts days in the stage each tuition is in when three stages are listed together", async () => {
    // Live from its posting (8 days), Appointed from the day a Tutor was (5), Confirmed from its confirmation (20).
    expect(await readApplied({ daysInStage: 7 })).toEqual(["c1", "l1"]);
    expect(await readApplied({ daysInStage: 14 })).toEqual(["c1"]);
    expect(await readApplied({ daysInStage: 60 })).toEqual([]);
  });

  it("offers only what the tuitions hold, from every stage, and narrows to Admin posts on request", async () => {
    const all = await getAdminJobFilterOptions({ postedBy: "all" });
    expect(all.cities).toEqual(expect.arrayContaining([{ id: cityA, label: "Test City A" }, { id: cityB, label: "Test City B" }]));
    expect(all.locationsByCity[cityA]).toEqual([{ id: areaA, label: "Test Area A" }]);
    expect(all.classesByCategory["English Version"]).toContain("Class 8");
    expect(all.subjectsByClass["Class 5"]).toEqual(expect.arrayContaining(["English", "Math"]));
    expect(all.tuitionTypes).toEqual(expect.arrayContaining(["home", "online"]));

    const adminOnly = await getAdminJobFilterOptions({ postedBy: "admin" });
    expect(adminOnly.cities.map(city => city.id)).toContain(cityB);
    expect(adminOnly.cities.map(city => city.id)).not.toContain(cityA);
  });
});
