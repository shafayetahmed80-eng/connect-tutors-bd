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

import type { TrpcContext } from "./_core/context";
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
import { appRouter } from "./routers";

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

/**
 * The request half of an Admin-posted tuition, with only the Tutoring Time left to choose. A string sets the time and
 * null clears it. Pass nothing and the request has no tutoringTime key at all: the edit says nothing about the time.
 */
function adminRequest(tutoringTime?: string | null): AdminPostedTuitionRequest {
  return {
    tuitionType: "home", category: "Bangla Medium", curriculumType: null, classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
    groupCapacity: null, packageDurationMonths: null, studentCount: 1, daysPerWeek: 3, preferredGender: "any", studentGender: null,
    addressDetails: null, tuitionCityLocationId: city, tuitionLocationId: area, tuitionLocationLabel: `Test Area ${tag}`,
    budgetAmount: 5000, instituteName: null, heardAboutUs: null, notes: null, contactConsent: "not_required", monthlyBudget: null,
    locationText: `TTime area ${tag}`,
    ...(tutoringTime === undefined ? {} : { tutoringTime }),
  };
}

/**
 * The two ways a caller leaves the time out of an edit. No key at all is a direct call or an older client; the key
 * holding undefined is what the routers pass on when the payload they were sent had none. Both mean "leave the
 * stored time alone", and neither is the same as null, which is what an emptied box sends to clear it.
 */
const leftOut = [
  ["no tutoringTime key", {}],
  ["tutoringTime undefined", { tutoringTime: undefined }],
] as const;

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

/**
 * The notes on the two stored copies. The edits below change the notes and nothing else, so this is how a test knows
 * the edit itself went through on a table while the Tutoring Time beside it did not move.
 */
async function storedNotes(requestId: number) {
  const db = await database();
  const [request] = await db.select({ notes: tutorRequests.notes }).from(tutorRequests).where(eq(tutorRequests.id, requestId));
  const [job] = await db.select({ notes: tutorJobs.notes }).from(tutorJobs).where(eq(tutorJobs.tutorRequestId, requestId));
  return { request: request?.notes, job: job?.notes };
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
  it("re-projects a changed time to the Job Board, and an explicit null empties both tables", async () => {
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

describe("editing a Live tuition without saying anything about its Tutoring Time", () => {
  // A page open from before the field existed, or any caller that does not know it, sends the rest of the form and
  // no time. That must not blank a time the tuition already has - on the request or on the Job Board copy.
  it.each(leftOut)("keeps the time on the request and on the Job Board when the edit has %s", async (_how, absent) => {
    const requestId = await postTuition("16:30");

    const edited = await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(), notes: "Evening batch only", ...absent } });

    expect(edited.updated).toBe(true);
    // The edit itself reached both tables, so the Job Board copy really was rebuilt ...
    expect(await storedNotes(requestId)).toEqual({ request: "Evening batch only", job: "Evening batch only" });
    // ... and the rebuild used the time the request already held, not an empty one.
    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
    expect((await publicJob(requestId)).tutoringTime).toBe("16:30");
  });

  it("clears the time on both tables when the same edit sends null", async () => {
    const requestId = await postTuition("16:30");

    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(null), notes: "Evening batch only" } });

    expect(await storedNotes(requestId)).toEqual({ request: "Evening batch only", job: "Evening batch only" });
    expect(await stored(requestId)).toEqual({ request: null, job: null });
    expect((await publicJob(requestId)).tutoringTime).toBeNull();
  });

  it("sets the new time on both tables when the same edit sends one", async () => {
    const requestId = await postTuition("16:30");

    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest("18:00"), notes: "Evening batch only" } });

    expect(await storedNotes(requestId)).toEqual({ request: "Evening batch only", job: "Evening batch only" });
    expect(await stored(requestId)).toEqual({ request: "18:00", job: "18:00" });
    expect((await publicJob(requestId)).tutoringTime).toBe("18:00");
  });

  it.each(leftOut)("leaves NULL on both tables for a tuition that had no time, when the edit has %s", async (_how, absent) => {
    const requestId = await postTuition(null);

    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(), notes: "Evening batch only", ...absent } });

    // Not an empty string either: nothing in this edit ever wrote one.
    expect(await storedNotes(requestId)).toEqual({ request: "Evening batch only", job: "Evening batch only" });
    expect(await stored(requestId)).toEqual({ request: null, job: null });
    expect((await publicJob(requestId)).tutoringTime).toBeNull();
  });

  it("keeps the time through two edits in a row that both leave it out", async () => {
    const requestId = await postTuition("16:30");

    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(), notes: "First change" } });
    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(), notes: "Second change", daysPerWeek: 4 } });

    expect(await storedNotes(requestId)).toEqual({ request: "Second change", job: "Second change" });
    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
  });
});

describe("editing an Admin tuition that is off the Job Board", () => {
  // Only a Live tuition is re-projected when it is edited; taking one Live again is a status change of its own.
  // So here the edit lands on tutor_requests alone, and the board copy catches up when the tuition goes Live.
  async function takeOffTheBoard(requestId: number) {
    const db = await database();
    await db.update(tutorRequests).set({ publicationState: "unpublished" }).where(eq(tutorRequests.id, requestId));
    await db.update(tutorJobs).set({ publicationStatus: "unpublished" }).where(eq(tutorJobs.tutorRequestId, requestId));
  }

  it.each(leftOut)("keeps the stored time on the request when the edit has %s", async (_how, absent) => {
    const requestId = await postTuition("16:30");
    await takeOffTheBoard(requestId);

    const edited = await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(), notes: "Evening batch only", ...absent } });

    expect(edited.updated).toBe(true);
    expect((await storedNotes(requestId)).request).toBe("Evening batch only");
    expect((await stored(requestId)).request).toBe("16:30");
  });

  it("clears the stored time on the request when the edit sends null", async () => {
    const requestId = await postTuition("16:30");
    await takeOffTheBoard(requestId);

    await updateAdminPostedTuition({ adminUserId, requestId, request: { ...adminRequest(null), notes: "Evening batch only" } });

    expect((await stored(requestId)).request).toBeNull();
  });

  it("carries a time set during the edit to the Job Board when the tuition goes Live again", async () => {
    const requestId = await postTuition("16:30");
    await takeOffTheBoard(requestId);

    await updateAdminPostedTuition({ adminUserId, requestId, request: adminRequest("18:00") });
    // The edit is not a status change: the board copy is still the old one until the Admin takes it Live.
    expect(await stored(requestId)).toEqual({ request: "18:00", job: "16:30" });

    const live = await moderateTutorRequestPublication({ requestId, adminUserId, action: "go_live" });
    expect(live.updated).toBe(true);
    expect(await stored(requestId)).toEqual({ request: "18:00", job: "18:00" });
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

  it("can be edited to a new time and then, with an explicit null, to none", async () => {
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

describe("a Guardian's pending request edited without saying anything about its Tutoring Time", () => {
  // The edit form of a page left open from before the field existed sends the whole request and no time. Saving it
  // must not erase a time the request already holds; only an explicit null does that.
  it.each(leftOut)("keeps the stored time when the edit has %s", async (_how, absent) => {
    const requestId = await guardianRequest("16:30");

    const edited = await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, notes: "Evening only", ...absent });

    expect(edited.updated).toBe(true);
    // The edit went through (the notes are new) and the time beside it did not move.
    const seen = await guardianSees(requestId);
    expect(seen.notes).toBe("Evening only");
    expect(seen.tutoringTime).toBe("16:30");
    expect(await stored(requestId)).toEqual({ request: "16:30", job: undefined });
  });

  it("clears the stored time to NULL when the same edit sends null", async () => {
    const requestId = await guardianRequest("16:30");

    await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, notes: "Evening only", tutoringTime: null });

    expect((await guardianSees(requestId)).notes).toBe("Evening only");
    expect((await guardianSees(requestId)).tutoringTime).toBeNull();
    expect(await stored(requestId)).toEqual({ request: null, job: undefined });
  });

  it("sets the new time when the same edit sends one", async () => {
    const requestId = await guardianRequest("16:30");

    await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, notes: "Evening only", tutoringTime: "18:00" });

    expect((await guardianSees(requestId)).notes).toBe("Evening only");
    expect(await stored(requestId)).toEqual({ request: "18:00", job: undefined });
  });

  it.each(leftOut)("leaves NULL on a request that had no time when the edit has %s", async (_how, absent) => {
    const requestId = await guardianRequest(null);

    await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, notes: "Evening only", ...absent });

    expect((await guardianSees(requestId)).notes).toBe("Evening only");
    expect(await stored(requestId)).toEqual({ request: null, job: undefined });
  });

  it("still reaches the Job Board with the kept time when an Admin takes it Live", async () => {
    const requestId = await guardianRequest("16:30");
    await updateGuardianTutorRequest({ guardianUserId, requestId, ...guardianFields, studentFirstName: null, notes: "Evening only" });

    const live = await moderateTutorRequestPublication({ requestId, adminUserId, action: "go_live" });
    expect(live.updated).toBe(true);

    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
    expect((await publicJob(requestId)).tutoringTime).toBe("16:30");
  });
});

describe("a page left open from before the field existed, saving through the real routers", () => {
  // Everything above calls the database functions directly. This goes in at the front door: the real tRPC routers
  // validate the payload, turn it into the call the database function gets, and write to the real tables. The
  // payload is what an old tab sends, the whole form with no tutoringTime key.
  const learningNeeds = [{ category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }] }];

  async function callerFor(userId: number) {
    const db = await database();
    const [user] = await db.select().from(users).where(eq(users.id, userId));
    return appRouter.createCaller({
      user,
      req: { protocol: "https", headers: { host: "x.example" } },
      res: { cookie() {}, clearCookie() {} },
    } as unknown as TrpcContext);
  }

  /** The Admin's Add Tuition form as the page sends it, for a Guardian made here (the name carries the tag for clean-up). */
  function adminForm(guardianPhone: string, extra: Record<string, unknown> = {}) {
    return {
      guardianName: `TTime Guardian ${tag} router`, guardianPhone,
      tuitionType: "home" as const, tuitionCityLocationId: city, tuitionLocationId: area, studentCount: 1,
      learningNeeds, daysPerWeek: 3, preferredGender: "any" as const, budgetAmount: 5000, heardAboutUs: "others" as const,
      ...extra,
    };
  }

  /** An Admin posts a tuition with a time through the router, and it goes Live. */
  async function postThroughRouter(tutoringTime: string) {
    const guardianPhone = `017${Math.floor(10000000 + Math.random() * 89999999)}`;
    const admin = await callerFor(adminUserId);
    const posted = await admin.admin.createPostedTuition(adminForm(guardianPhone, { tutoringTime }));
    made.requestIds.push(posted.id);
    expect(posted.live).toBe(true);
    expect(await stored(posted.id)).toEqual({ request: tutoringTime, job: tutoringTime });
    return { requestId: posted.id, guardianPhone, admin };
  }

  it("keeps the stored time on the request and the Job Board when an Admin saves an edit with no tutoringTime key", async () => {
    const { requestId, guardianPhone, admin } = await postThroughRouter("16:30");

    const result = await admin.admin.updatePostedTuition({ ...adminForm(guardianPhone, { notes: "Evening batch only" }), requestId });

    expect(result.updated).toBe(true);
    expect(await storedNotes(requestId)).toEqual({ request: "Evening batch only", job: "Evening batch only" });
    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
    expect((await publicJob(requestId)).tutoringTime).toBe("16:30");
  });

  it("clears both copies when the Admin's edit sends null, and sets both when it sends a time", async () => {
    const { requestId, guardianPhone, admin } = await postThroughRouter("16:30");

    await admin.admin.updatePostedTuition({ ...adminForm(guardianPhone), requestId, tutoringTime: null });
    expect(await stored(requestId)).toEqual({ request: null, job: null });

    await admin.admin.updatePostedTuition({ ...adminForm(guardianPhone), requestId, tutoringTime: "18:00" });
    expect(await stored(requestId)).toEqual({ request: "18:00", job: "18:00" });
    expect((await publicJob(requestId)).tutoringTime).toBe("18:00");
  });

  it("refuses a padded time with BAD_REQUEST and changes nothing on either copy", async () => {
    const { requestId, guardianPhone, admin } = await postThroughRouter("16:30");

    await expect(admin.admin.updatePostedTuition({ ...adminForm(guardianPhone, { notes: "Never saved" }), requestId, tutoringTime: " 08:05 " }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    expect(await storedNotes(requestId)).toEqual({ request: null, job: null });
    expect(await stored(requestId)).toEqual({ request: "16:30", job: "16:30" });
  });

  it("keeps a Guardian's stored time when their pending-request edit has no tutoringTime key, and clears it for null", async () => {
    const requestId = await guardianRequest("16:30");
    const guardian = await callerFor(guardianUserId);
    const form = {
      requestId, tuitionType: "home" as const, tuitionCityLocationId: city, tuitionLocationId: area, studentCount: 1,
      learningNeeds, daysPerWeek: 3, preferredGender: "any" as const, budgetAmount: 5000, heardAboutUs: "others" as const, notes: "Evening only",
    };

    const kept = await guardian.tutorRequests.updatePending(form);
    expect(kept.updated).toBe(true);
    expect((await guardianSees(requestId)).notes).toBe("Evening only");
    expect(await stored(requestId)).toEqual({ request: "16:30", job: undefined });

    await guardian.tutorRequests.updatePending({ ...form, tutoringTime: null });
    expect(await stored(requestId)).toEqual({ request: null, job: undefined });
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
