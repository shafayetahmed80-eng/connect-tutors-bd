import { randomBytes } from "node:crypto";
import { eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { adminNotificationBroadcasts, guardianProfiles, locations, subjectsCatalog, tutorNotifications, tutorRequests, tutorReviews, tutorSubjects, tutors, users } from "../drizzle/schema";
import type { AdminTutorDirectoryFilters } from "./db";
import { getAdminTutorFilterOptions, getDb, listAdminTutorDirectoryPage, notifyTutorDirectory } from "./db";
import { normalizeCatalogName } from "./tutor-profile-catalog.seed";

// Four Tutors made here, found again by a random tag in their ids and names, so
// whatever else the database holds does not change what is read. Every row is
// removed afterwards, by id.
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

const cityA = `test-tdf-city-a-${tag}`;
const areaA = `test-tdf-area-a-${tag}`;
const cityB = `test-tdf-city-b-${tag}`;
const areaB = `test-tdf-area-b-${tag}`;

const ids = { t1: `tdf-${tag}-1`, t2: `tdf-${tag}-2`, t3: `tdf-${tag}-3`, t4: `tdf-${tag}-4` };
const nameOf: Record<string, string> = Object.fromEntries(Object.entries(ids).map(([name, id]) => [id, name]));
const userIds: number[] = [];
const requestIds: number[] = [];
let adminUserId = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeUser(suffix: string, role: "tutor" | "guardian" | "admin") {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-tdf-${tag}-${suffix}`, name: `TDF ${suffix} ${tag}`, role });
  const id = Number(made.insertId);
  userIds.push(id);
  return id;
}

async function makeTutor(name: keyof typeof ids, over: Partial<typeof tutors.$inferInsert>) {
  const db = await database();
  await db.insert(tutors).values({
    id: ids[name], userId: await makeUser(name, "tutor"), name: `Tutor ${name} ${tag}`, profileStatus: "approved", gender: "female", locationId: areaA, cityLocationId: cityA,
    ...over,
  });
}

/** A real subject from the Tutor catalog (`pnpm db:seed:tutor-profile-catalog`), picked the way the profile form stores a pick. */
async function pick(tutor: keyof typeof ids, name: string, selectionType: "primary" | "additional") {
  const db = await database();
  const [subject] = await db.select({ id: subjectsCatalog.id }).from(subjectsCatalog).where(eq(subjectsCatalog.normalizedName, normalizeCatalogName(name))).limit(1);
  if (!subject) throw new Error(`"${name}" is not in the subjects catalog - run pnpm db:seed:tutor-profile-catalog first.`);
  await db.insert(tutorSubjects).values({ tutorId: ids[tutor], subjectId: subject.id, selectionType });
}

let guardianUserId = 0;
async function rate(tutorId: string, rating: number, hidden = false) {
  const db = await database();
  const [request] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]), daysPerWeek: 3, locationText: "Dhaka",
  });
  requestIds.push(Number(request.insertId));
  await db.insert(tutorReviews).values({ tutorRequestId: Number(request.insertId), tutorId, guardianUserId, rating, hiddenAt: hidden ? new Date() : null });
}

beforeAll(async () => {
  const db = await database();
  await db.insert(locations).values({ id: cityA, label: `Test City A ${tag}`, type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaA, label: `Test Area A ${tag}`, type: "area", country: "Bangladesh", parentId: cityA });
  await db.insert(locations).values({ id: cityB, label: `Test City B ${tag}`, type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaB, label: `Test Area B ${tag}`, type: "area", country: "Bangladesh", parentId: cityB });

  adminUserId = await makeUser("admin", "admin");
  guardianUserId = await makeUser("guardian", "guardian");
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `G${tag}`.slice(0, 12), phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: cityA, locationId: areaA });

  await makeTutor("t1", { gender: "female", teachingExperienceYears: 5, verified: 1, createdAt: ago(10) });
  await makeTutor("t2", { gender: "male", teachingExperienceYears: 1, verified: 0, createdAt: ago(40) });
  await makeTutor("t3", { gender: "female", locationId: areaB, cityLocationId: cityB, teachingExperienceYears: null, verified: 0, createdAt: ago(2) });
  await makeTutor("t4", { gender: "male", locationId: areaB, cityLocationId: cityB, teachingExperienceYears: 12, verified: 1, createdAt: ago(100) });

  // What each Tutor teaches is the subjects they picked - the older `tutors.subjects` text is not read.
  await pick("t1", "Mathematics", "primary");
  await pick("t1", "Physics", "primary");
  await pick("t2", "Chemistry", "primary");
  await pick("t3", "Physics", "primary");
  await pick("t3", "Mathematics", "additional");
  await pick("t4", "Biology", "primary");

  // t1 averages 4.5, t2 is 3; t3 has no rating; t4's only review was hidden by an Admin, so it counts toward nothing.
  await rate(ids.t1, 5);
  await rate(ids.t1, 4);
  await rate(ids.t2, 3);
  await rate(ids.t4, 5, true);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const tutorIds = Object.values(ids);
  await db.delete(tutorNotifications).where(inArray(tutorNotifications.tutorId, tutorIds));
  await db.delete(adminNotificationBroadcasts).where(like(adminNotificationBroadcasts.title, `%${tag}%`));
  await db.delete(tutorReviews).where(inArray(tutorReviews.tutorId, tutorIds));
  await db.delete(tutorSubjects).where(inArray(tutorSubjects.tutorId, tutorIds));
  if (requestIds.length) await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  await db.delete(tutors).where(inArray(tutors.id, tutorIds));
  if (userIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  await db.delete(locations).where(inArray(locations.id, [areaA, areaB]));
  await db.delete(locations).where(inArray(locations.id, [cityA, cityB]));
});

const all = { query: tag, profileStatus: "all", jobStage: "all", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 100 } as const;

/** Which of this test's Tutors the list returns for these choices, by name. */
async function read(over: Partial<AdminTutorDirectoryFilters> = {}) {
  const page = await listAdminTutorDirectoryPage({ ...all, ...over });
  return { names: page.items.map(item => nameOf[item.id]).filter(Boolean).sort(), counts: page.counts, total: page.total };
}

describe("the Tutor Profiles filters", () => {
  it("lists all four Tutors when nothing narrows them", async () => {
    expect((await read()).names).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("reads gender and City off the Tutor, and the areas they teach from", async () => {
    expect((await read({ gender: "female" })).names).toEqual(["t1", "t3"]);
    expect((await read({ gender: "male" })).names).toEqual(["t2", "t4"]);
    expect((await read({ cityId: cityA })).names).toEqual(["t1", "t2"]);
    expect((await read({ cityId: cityB })).names).toEqual(["t3", "t4"]);
    expect((await read({ locationIds: [areaB] })).names).toEqual(["t3", "t4"]);
    expect((await read({ locationIds: [areaA, areaB] })).names).toEqual(["t1", "t2", "t3", "t4"]);
  });

  it("finds a subject the Tutor picked, primary or additional, and any one of several", async () => {
    expect((await read({ subjects: ["Physics"] })).names).toEqual(["t1", "t3"]);
    expect((await read({ subjects: ["Chemistry", "Biology"] })).names).toEqual(["t2", "t4"]);
    // t3 picked Mathematics as an additional subject; it still counts.
    expect((await read({ subjects: ["Mathematics"] })).names).toEqual(["t1", "t3"]);
    // A whole name, not a piece of one: "Math" is not "Mathematics".
    expect((await read({ subjects: ["Math"] })).names).toEqual([]);
  });

  it("finds a piece of a subject's name when it is typed rather than chosen", async () => {
    expect((await read({ subject: "Chem" })).names).toEqual(["t2"]);
    expect((await read({ subject: "ics" })).names).toEqual(["t1", "t3"]);
  });

  it("puts the subjects each Tutor picked on their row, the ones they lead with first", async () => {
    const page = await listAdminTutorDirectoryPage({ ...all });
    const byName = Object.fromEntries(page.items.filter(item => nameOf[item.id]).map(item => [nameOf[item.id], item.subjects]));
    expect(byName).toEqual({
      t1: ["Mathematics", "Physics"],
      t2: ["Chemistry"],
      t3: ["Physics", "Mathematics"],
      t4: ["Biology"],
    });
  });

  it("takes an experience range, and does not find a Tutor who has not said how long", async () => {
    expect((await read({ experienceFrom: 5 })).names).toEqual(["t1", "t4"]);
    expect((await read({ experienceTo: 5 })).names).toEqual(["t1", "t2"]);
    expect((await read({ experienceFrom: 2, experienceTo: 6 })).names).toEqual(["t1"]);
    expect((await read({ experienceFrom: 0 })).names).toEqual(["t1", "t2", "t4"]);
  });

  it("takes a rating range from the visible reviews, and does not find an unrated Tutor", async () => {
    expect((await read({ ratingFrom: 4.5 })).names).toEqual(["t1"]);
    expect((await read({ ratingTo: 3 })).names).toEqual(["t2"]);
    expect((await read({ ratingFrom: 1 })).names).toEqual(["t1", "t2"]);
    expect((await read({ ratingFrom: 3, ratingTo: 4.4 })).names).toEqual(["t2"]);
    // t4's review is hidden and t3 has none: neither has a rating to be in a range.
    expect((await read({ ratingFrom: 0, ratingTo: 5 })).names).toEqual(["t1", "t2"]);
  });

  it("takes a joined-date range, the last day included", async () => {
    expect((await read({ joinedFrom: ago(20) })).names).toEqual(["t1", "t3"]);
    expect((await read({ joinedTo: ago(20) })).names).toEqual(["t2", "t4"]);
    expect((await read({ joinedFrom: ago(50), joinedTo: ago(5) })).names).toEqual(["t1", "t2"]);
  });

  it("narrows by several choices at once, and by the older ones beside them", async () => {
    expect((await read({ gender: "male", experienceFrom: 10 })).names).toEqual(["t4"]);
    expect((await read({ verified: "verified", cityId: cityA })).names).toEqual(["t1"]);
    expect((await read({ gender: "female", subjects: ["Physics"], ratingFrom: 4 })).names).toEqual(["t1"]);
    expect((await read({ gender: "male", experienceFrom: 50 })).names).toEqual([]);
  });

  it("lets the tab counts follow the new choices, so a tab never says more than it opens on", async () => {
    const { counts, total } = await read({ gender: "female" });
    expect(total).toBe(2);
    expect(counts.profileStatus.all).toBe(2);
    expect(counts.profileStatus.approved).toBe(2);
  });

  it("finds nothing, rather than failing, for a range the wrong way round", async () => {
    expect((await read({ experienceFrom: 9, experienceTo: 2 })).names).toEqual([]);
    expect((await read({ joinedFrom: ago(1), joinedTo: ago(30) })).names).toEqual([]);
  });

  it("offers the Cities, areas and subjects the Tutors hold, each area under its own City", async () => {
    const options = await getAdminTutorFilterOptions();
    expect(options.cities).toEqual(expect.arrayContaining([{ id: cityA, label: `Test City A ${tag}` }, { id: cityB, label: `Test City B ${tag}` }]));
    expect(options.locationsByCity[cityA]).toEqual([{ id: areaA, label: `Test Area A ${tag}` }]);
    expect(options.locationsByCity[cityB]).toEqual([{ id: areaB, label: `Test Area B ${tag}` }]);
    expect(options.subjects).toEqual(expect.arrayContaining(["Biology", "Chemistry", "Mathematics", "Physics"]));
  });

  it("notifies exactly the Tutors the same choices list, no more", async () => {
    const result = await notifyTutorDirectory({
      filters: { ...all, gender: "male", experienceFrom: 0 },
      title: `Check ${tag}`,
      message: "Only the male Tutors.",
      adminUserId,
    });
    expect(result).toEqual({ sent: 2 });
    const db = await database();
    const got = await db.select({ tutorId: tutorNotifications.tutorId }).from(tutorNotifications).where(inArray(tutorNotifications.tutorId, Object.values(ids)));
    expect(got.map(row => nameOf[row.tutorId]).sort()).toEqual(["t2", "t4"]);
  });
});
