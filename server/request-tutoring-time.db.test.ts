import { randomBytes } from "node:crypto";
import { and, eq, inArray, like, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import {
  guardianProfiles,
  guardianRequestNotifications,
  locations,
  tutorJobs,
  tutorRequestOperationEvents,
  tutorRequestPublicationEvents,
  tutorRequests,
  users,
} from "../drizzle/schema";
import { jobIdForRequest } from "@shared/job-id";

// Going Live alerts the Tutors a new tuition fits. None can fit the area made here, and the push is faked
// as well, so nothing in this file can reach a real phone or touch another test's subscriptions.
vi.mock("./chat-push", async importOriginal => ({
  ...(await importOriginal<typeof import("./chat-push")>()),
  sendWebPushNotification: vi.fn(async () => ({ ok: true as const, gone: false })),
}));

import type { AdminPostedTuitionRequest } from "./db";
import {
  createAdminPostedTuition,
  createTutorRequest,
  getDb,
  listAdminPostedJobsPage,
  listAppliedTutorsForRequest,
  listGuardianAppliedTutors,
  listGuardianTutorRequests,
  listMatchingCandidatesForRequest,
  listPublishedTutorJobs,
  moderateTutorRequestPublication,
  updateAdminPostedTuition,
  updateGuardianTutorRequest,
} from "./db";

// The Tutoring Time a Guardian or an Admin types travels through the real database functions: stored on the
// request, copied to the Job Board when the tuition goes Live, and read back by every screen that shows it.
// Everything is made under a random tag and removed again by id, in a city and area of its own, so whatever
// else the database holds does not change what is read.
const tag = randomBytes(3).toString("hex");
const city = `test-ttime-city-${tag}`;
const area = `test-ttime-area-${tag}`;
const made = { requestIds: [] as number[] };
let adminUserId = 0;
let guardianUserId = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

beforeAll(async () => {
  const db = await database();
  await db.insert(locations).values({ id: city, label: `Test City ${tag}`, type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: area, label: `Test Area ${tag}`, type: "area", country: "Bangladesh", parentId: city });
  const [admin] = await db.insert(users).values({ openId: `test:ttime:${tag}:admin`, name: `TTime Admin ${tag}`, role: "admin", loginMethod: "password" });
  adminUserId = Number(admin.insertId);
  // The Guardian who posts their own requests below. The Admin-posted tuitions get a Guardian of their own.
  const [guardian] = await db.insert(users).values({ openId: `test:ttime:${tag}:guardian`, name: `TTime Guardian ${tag} own`, role: "guardian", loginMethod: "password" });
  guardianUserId = Number(guardian.insertId);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  // A request whose id never came back (it failed between saving and going Live) is still found by its tag.
  const strays = (await db.select({ id: tutorRequests.id }).from(tutorRequests).where(like(tutorRequests.locationText, `%${tag}%`))).map(row => row.id);
  const requestIds = Array.from(new Set([...made.requestIds, ...strays]));
  const guardianIds = new Set<number>(guardianUserId ? [guardianUserId] : []);
  if (requestIds.length) {
    for (const row of await db.select({ id: tutorRequests.guardianUserId }).from(tutorRequests).where(inArray(tutorRequests.id, requestIds))) guardianIds.add(row.id);
    await db.delete(guardianRequestNotifications).where(inArray(guardianRequestNotifications.tutorRequestId, requestIds));
    await db.delete(tutorRequestPublicationEvents).where(inArray(tutorRequestPublicationEvents.tutorRequestId, requestIds));
    await db.delete(tutorRequestOperationEvents).where(inArray(tutorRequestOperationEvents.tutorRequestId, requestIds));
    await db.delete(tutorJobs).where(inArray(tutorJobs.tutorRequestId, requestIds));
    await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  // Only Guardians made here by name, so a phone number that happened to match a real one never deletes it.
  const ownGuardianIds = guardianIds.size
    ? (await db.select({ id: users.id }).from(users).where(and(inArray(users.id, Array.from(guardianIds)), like(users.name, `TTime Guardian ${tag}%`)))).map(row => row.id)
    : [];
  if (ownGuardianIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, ownGuardianIds));
    await db.delete(users).where(inArray(users.id, ownGuardianIds));
  }
  if (adminUserId) await db.delete(users).where(eq(users.id, adminUserId));
  await db.delete(locations).where(eq(locations.id, area));
  await db.delete(locations).where(eq(locations.id, city));
});

/** The request half of an Admin-posted tuition, with only the Tutoring Time left to choose. */
function adminRequest(tutoringTime: string | null): AdminPostedTuitionRequest {
  return {
    tuitionType: "home", category: "Bangla Medium", curriculumType: null, classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    groupCapacity: null, packageDurationMonths: null, studentCount: 1, daysPerWeek: 3, tutoringTime, preferredGender: "any", studentGender: null,
    addressDetails: null, tuitionCityLocationId: city, tuitionLocationId: area, tuitionLocationLabel: `Test Area ${tag}`,
    budgetAmount: 5000, instituteName: null, heardAboutUs: null, notes: null, contactConsent: "not_required", monthlyBudget: null,
    locationText: `TTime area ${tag}`,
  };
}

/** An Admin adds a tuition and it goes Live, the way Add Tuition does. */
async function postTuition(tutoringTime: string | null) {
  const phone = `017${Math.floor(10000000 + Math.random() * 89999999)}`;
  const posted = await createAdminPostedTuition({
    adminUserId,
    guardian: { name: `TTime Guardian ${tag}`, phone, cityLocationId: city, locationId: area },
    request: adminRequest(tutoringTime),
  });
  made.requestIds.push(posted.id);
  expect(posted.live).toBe(true);
  return posted.id;
}

/** The two stored copies, read straight from their tables. `undefined` means the row is not there at all. */
async function stored(requestId: number) {
  const db = await database();
  const [request] = await db.select({ tutoringTime: tutorRequests.tutoringTime }).from(tutorRequests).where(eq(tutorRequests.id, requestId));
  const [job] = await db.select({ tutoringTime: tutorJobs.tutoringTime }).from(tutorJobs).where(eq(tutorJobs.tutorRequestId, requestId));
  return { request: request?.tutoringTime, job: job?.tutoringTime };
}

/** The tuition as the Job Board hands it to a Tutor, found by its own Job ID. */
async function publicJob(requestId: number) {
  const page = await listPublishedTutorJobs({ jobId: jobIdForRequest(requestId), page: 1, pageSize: 5 });
  expect(page.items).toHaveLength(1);
  return page.items[0]!;
}

const guardianFields = {
  tuitionType: "home" as const, category: "Bangla Medium", curriculumType: null, classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
  groupCapacity: null, packageDurationMonths: null, studentCount: 1, daysPerWeek: 3, preferredGender: "any" as const, studentGender: null,
  addressDetails: null, tuitionCityLocationId: city, tuitionLocationId: area, tuitionLocationLabel: `Test Area ${tag}`,
  budgetAmount: 5000, instituteName: null, heardAboutUs: null, notes: null, monthlyBudget: null, locationText: `TTime area ${tag}`,
};

/** A Guardian's own request, as the request form saves it. Leave the time out entirely to save one the way an older caller did. */
async function guardianRequest(tutoringTime?: string | null) {
  const { id } = await createTutorRequest({
    guardianUserId, ...guardianFields, studentFirstName: null, ...(tutoringTime === undefined ? {} : { tutoringTime }),
  });
  made.requestIds.push(id);
  return id;
}

/** What the Guardian's "My requests" read returns for one request - the read the edit form fills itself back in from. */
async function guardianSees(requestId: number) {
  const mine = await listGuardianTutorRequests(guardianUserId);
  const request = mine.find(item => item.id === requestId);
  if (!request) throw new Error(`Request ${requestId} is missing from the Guardian's own list`);
  return request;
}

const appliedFilters = (requestId: number) => ({
  requestId, query: "", profileStatus: "all" as const, jobStage: "all" as const, verified: "all" as const, location: "", subject: "", tuitionType: "all" as const, page: 1, pageSize: 5,
});

describe("the Tutoring Time columns", () => {
  it("exist on tutor_requests and tutor_jobs as an optional varchar(5)", async () => {
    const db = await database();
    const [rows] = await db.execute(sql`
      select table_name as tableName, data_type as dataType, character_maximum_length as maxLength, is_nullable as isNullable
      from information_schema.columns
      where table_schema = database() and column_name = 'tutoringTime' and table_name in ('tutor_requests', 'tutor_jobs')
      order by table_name`);
    const columns = (rows as unknown as Array<{ tableName: string; dataType: string; maxLength: number | string | bigint; isNullable: string }>)
      .map(row => ({ ...row, maxLength: Number(row.maxLength) }));

    // Five characters is exactly "HH:mm"; nullable because the time is optional and blank is NULL.
    expect(columns).toEqual([
      { tableName: "tutor_jobs", dataType: "varchar", maxLength: 5, isNullable: "YES" },
      { tableName: "tutor_requests", dataType: "varchar", maxLength: 5, isNullable: "YES" },
    ]);
  });
});

describe("a tuition an Admin posts with a Tutoring Time", () => {
  it("is stored on the request and copied to the Job Board when it goes Live", async () => {
    const requestId = await postTuition("16:30");

    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
  });

  it("reaches a Tutor on the public Job Board as the same 24-hour text", async () => {
    const requestId = await postTuition("16:30");

    expect((await publicJob(requestId)).tutoringTime).toBe("16:30");
  });

  it("is read back to the Admin for the Edit form, from the Posted jobs board", async () => {
    const requestId = await postTuition("16:30");

    // Searched by the Guardian's name, which carries the tag.
    const page = await listAdminPostedJobsPage({ query: tag, stage: "all", postedBy: "admin", page: 1, pageSize: 50 });
    expect(page.items.find(item => item.id === requestId)?.tutoringTime).toBe("16:30");
  });

  it("heads the Applied Tutors page and the Tutor Matching page with it", async () => {
    const requestId = await postTuition("16:30");

    expect((await listAppliedTutorsForRequest(appliedFilters(requestId)))?.job.tutoringTime).toBe("16:30");
    // One row is enough: the header is what is read here, and Matching ranks every approved Tutor to build the rest.
    const matching = await listMatchingCandidatesForRequest({ requestId, query: "", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 1 });
    expect(matching?.job.tutoringTime).toBe("16:30");
  });

  it("reaches the Guardian's own Applied Tutors header", async () => {
    const requestId = await postTuition("16:30");
    const db = await database();
    const [request] = await db.select({ guardianUserId: tutorRequests.guardianUserId }).from(tutorRequests).where(eq(tutorRequests.id, requestId));

    const applied = await listGuardianAppliedTutors({ guardianUserId: request!.guardianUserId, requestId, page: 1, pageSize: 5 });
    expect(applied?.job.tutoringTime).toBe("16:30");
  });
});

describe("a tuition posted without a Tutoring Time", () => {
  it("has NULL on both tables, never an empty string", async () => {
    const requestId = await postTuition(null);

    expect(await stored(requestId)).toEqual({ request: null, job: null });
  });

  it("reaches a Tutor with tutoringTime null, so the Job Board has nothing to show", async () => {
    const requestId = await postTuition(null);

    const job = await publicJob(requestId);
    expect(job).toHaveProperty("tutoringTime", null);
  });

  it("reads as null to the Admin's Posted jobs board and Applied Tutors header", async () => {
    const requestId = await postTuition(null);

    const page = await listAdminPostedJobsPage({ query: tag, stage: "all", postedBy: "admin", page: 1, pageSize: 50 });
    const item = page.items.find(row => row.id === requestId);
    expect(item).toBeDefined();
    expect(item!.tutoringTime).toBeNull();
    expect((await listAppliedTutorsForRequest(appliedFilters(requestId)))?.job.tutoringTime).toBeNull();
  });
});

describe("editing a Live tuition", () => {
  it("re-projects a changed time to the Job Board, and a cleared one empties both tables", async () => {
    const requestId = await postTuition("16:30");

    const changed = await updateAdminPostedTuition({ adminUserId, requestId, request: adminRequest("09:45") });
    expect(changed.updated).toBe(true);
    expect(await stored(requestId)).toEqual({ request: "09:45", job: "09:45" });
    expect((await publicJob(requestId)).tutoringTime).toBe("09:45");

    // Null is what Add Tuition sends for a blank box; it must clear the time, not leave the old one behind.
    const cleared = await updateAdminPostedTuition({ adminUserId, requestId, request: adminRequest(null) });
    expect(cleared.updated).toBe(true);
    expect(await stored(requestId)).toEqual({ request: null, job: null });
    expect((await publicJob(requestId)).tutoringTime).toBeNull();
  });

  it("adds a time to a tuition that had none", async () => {
    const requestId = await postTuition(null);

    await updateAdminPostedTuition({ adminUserId, requestId, request: adminRequest("07:30") });

    expect(await stored(requestId)).toEqual({ request: "07:30", job: "07:30" });
    expect((await publicJob(requestId)).tutoringTime).toBe("07:30");
  });
});

describe("a Guardian's own request", () => {
  it("comes back from My requests with its time, which is what the edit form fills itself in from", async () => {
    const requestId = await guardianRequest("09:15");

    expect((await guardianSees(requestId)).tutoringTime).toBe("09:15");
    // Still only a request: nothing is on the Job Board until an Admin takes it Live.
    expect(await stored(requestId)).toEqual({ request: "09:15", job: undefined });
  });

  it("comes back as null when it was saved with no time, or by a caller that never heard of the field", async () => {
    const blank = await guardianRequest(null);
    const older = await guardianRequest();

    expect((await guardianSees(blank)).tutoringTime).toBeNull();
    expect((await guardianSees(older)).tutoringTime).toBeNull();
  });

  it("can be edited to a new time and then to none", async () => {
    const requestId = await guardianRequest("09:15");

    const changed = await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, tutoringTime: "18:45" });
    expect(changed.updated).toBe(true);
    expect((await guardianSees(requestId)).tutoringTime).toBe("18:45");

    const cleared = await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, tutoringTime: null });
    expect(cleared.updated).toBe(true);
    expect((await guardianSees(requestId)).tutoringTime).toBeNull();
    expect(await stored(requestId)).toEqual({ request: null, job: undefined });
  });

  it("carries the edited time to the Job Board when an Admin takes it Live", async () => {
    const requestId = await guardianRequest("09:15");
    await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, tutoringTime: "18:45" });

    const live = await moderateTutorRequestPublication({ requestId, adminUserId, action: "go_live" });
    expect(live.updated).toBe(true);

    expect(await stored(requestId)).toEqual({ request: "18:45", job: "18:45" });
    expect((await publicJob(requestId)).tutoringTime).toBe("18:45");
    expect((await listGuardianAppliedTutors({ guardianUserId, requestId, page: 1, pageSize: 5 }))?.job.tutoringTime).toBe("18:45");
  });

  it("goes Live with no time when it never had one", async () => {
    const requestId = await guardianRequest(null);

    await moderateTutorRequestPublication({ requestId, adminUserId, action: "go_live" });

    expect(await stored(requestId)).toEqual({ request: null, job: null });
    expect((await publicJob(requestId)).tutoringTime).toBeNull();
  });
});

describe("a time of day that is stored as text", () => {
  // The suite runs in Asia/Dhaka against a database that speaks UTC. A time that passed through a TIME column,
  // a Date or a zone conversion anywhere on this path would come back shifted by hours; text does not move.
  it.each(["00:05", "23:59"])("returns %s exactly as it was written, on every table and every read", async time => {
    const requestId = await postTuition(time);

    expect(await stored(requestId)).toEqual({ request: time, job: time });
    expect((await publicJob(requestId)).tutoringTime).toBe(time);
    const page = await listAdminPostedJobsPage({ query: tag, stage: "all", postedBy: "admin", page: 1, pageSize: 50 });
    expect(page.items.find(item => item.id === requestId)?.tutoringTime).toBe(time);
    expect((await listAppliedTutorsForRequest(appliedFilters(requestId)))?.job.tutoringTime).toBe(time);

    const guardianTime = await guardianRequest(time);
    expect((await guardianSees(guardianTime)).tutoringTime).toBe(time);
  });
});
