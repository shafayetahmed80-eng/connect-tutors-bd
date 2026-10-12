import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  classLevels,
  curricula,
  guardianProfiles,
  locations,
  subjectsCatalog,
  tutorClassLevels,
  tutorCurricula,
  tutorRequests,
  tutorSubjects,
  tutors,
  users,
} from "../drizzle/schema";
import {
  createOptionCatalogEntry,
  getAdminTutorFilterOptions,
  getAdminTutorReview,
  getDb,
  listAdminTutorDirectoryPage,
  listMatchingCandidatesForRequest,
  saveTutorProfileDraft,
  updateOptionCatalogEntry,
} from "./db";
import { normalizeCatalogName } from "./tutor-profile-catalog.seed";

/**
 * What an Admin reads about a Tutor's subjects, class levels and curricula has
 * to be what the Tutor saved on their own profile.
 *
 * The Tutors here are saved through the app's own `saveTutorProfileDraft`, with
 * ids from the real catalog rows (`pnpm db:seed:tutor-profile-catalog`), so a
 * writer and a reader that drift apart fail here - the old directory columns
 * (`tutors.subjects`, `tutors.levels`) are never written by that save, which is
 * how every real Tutor came to read as teaching nothing.
 *
 * Everything this file makes carries a random tag and is removed afterwards.
 */
const tag = randomBytes(3).toString("hex");

const cityA = `test-tts-city-a-${tag}`;
const areaA = `test-tts-area-a-${tag}`;
const cityB = `test-tts-city-b-${tag}`;
const areaB = `test-tts-area-b-${tag}`;

const userIds: number[] = [];
const tutorIds: string[] = [];
const requestIds: number[] = [];
const ownerSubjectIds: number[] = [];
const nameOf: Record<string, string> = {};
let guardianUserId = 0;
let requestId = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeUser(suffix: string, role: "tutor" | "guardian") {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-tts-${tag}-${suffix}`, name: `TTS ${suffix} ${tag}`, role });
  const id = Number(made.insertId);
  userIds.push(id);
  return id;
}

type CatalogTable = typeof subjectsCatalog | typeof classLevels | typeof curricula;

/** The id of a real catalog option, found by name. */
async function catalogId(table: CatalogTable, name: string) {
  const db = await database();
  const [row] = await db.select({ id: table.id }).from(table).where(eq(table.normalizedName, normalizeCatalogName(name))).limit(1);
  if (!row) throw new Error(`"${name}" is not in the catalog - run pnpm db:seed:tutor-profile-catalog first.`);
  return row.id;
}

const idsOf = (table: CatalogTable, names: string[]) => Promise.all(names.map(name => catalogId(table, name)));

type Picks = { primary?: string[]; additional?: string[]; levels?: string[]; curricula?: string[] };

/** A Tutor whose profile is saved the way the profile form saves it, then approved so the matching list holds them. */
async function saveTutor(label: string, gender: "male" | "female", where: { city: string; area: string }, picks: Picks = {}) {
  const userId = await makeUser(label, "tutor");
  await saveTutorProfileDraft(userId, {
    name: `Tutor ${label} ${tag}`,
    gender,
    currentCityId: where.city,
    currentLocationId: where.area,
    ...(picks.primary ? { primarySubjectIds: await idsOf(subjectsCatalog, picks.primary) } : {}),
    ...(picks.additional ? { additionalSubjectIds: await idsOf(subjectsCatalog, picks.additional) } : {}),
    ...(picks.levels ? { classLevelIds: await idsOf(classLevels, picks.levels) } : {}),
    ...(picks.curricula ? { curriculumIds: await idsOf(curricula, picks.curricula) } : {}),
  });
  const db = await database();
  const [tutor] = await db.select({ id: tutors.id }).from(tutors).where(eq(tutors.userId, userId)).limit(1);
  await db.update(tutors).set({ profileStatus: "approved" }).where(eq(tutors.id, tutor.id));
  tutorIds.push(tutor.id);
  nameOf[tutor.id] = label;
  return tutor.id;
}

const all = { query: tag, profileStatus: "all", jobStage: "all", verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 100 } as const;

/** This test's Tutors on the directory list, by the label they were made with. */
async function directory(over: Partial<Parameters<typeof listAdminTutorDirectoryPage>[0]> = {}) {
  const page = await listAdminTutorDirectoryPage({ ...all, ...over });
  return page.items.filter(item => nameOf[item.id]);
}
const labelsOf = (items: Array<{ id: string }>) => items.map(item => nameOf[item.id]).sort();

let ids: { math: string; bio: string; none: string; owner: string };

beforeAll(async () => {
  const db = await database();
  await db.insert(locations).values({ id: cityA, label: `Test City A ${tag}`, type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaA, label: `Test Area A ${tag}`, type: "area", country: "Bangladesh", parentId: cityA });
  await db.insert(locations).values({ id: cityB, label: `Test City B ${tag}`, type: "city", country: "Bangladesh" });
  await db.insert(locations).values({ id: areaB, label: `Test Area B ${tag}`, type: "area", country: "Bangladesh", parentId: cityB });

  guardianUserId = await makeUser("guardian", "guardian");
  await db.insert(guardianProfiles).values({ userId: guardianUserId, guardianId: `G${tag}`.slice(0, 12), phone: `+88017${Math.floor(10000000 + Math.random() * 89999999)}`, gender: "female", cityLocationId: cityA, locationId: areaA });

  // An Owner-added subject, made the way the Admin catalog screen makes one.
  await createOptionCatalogEntry("subjects", `Test Subject ${tag}`);
  const ownerSubject = await catalogId(subjectsCatalog, `Test Subject ${tag}`);
  ownerSubjectIds.push(ownerSubject);

  ids = {
    // Leads with Mathematics and Physics, also offers Bangla (which the catalog lists before both); teaches SSC and HSC under the national curriculum.
    math: await saveTutor("math", "female", { city: cityA, area: areaA }, {
      primary: ["Mathematics", "Physics"],
      additional: ["Bangla"],
      levels: ["SSC", "HSC"],
      curricula: ["Bangladesh National Curriculum"],
    }),
    bio: await saveTutor("bio", "male", { city: cityB, area: areaB }, {
      primary: ["Biology"],
      levels: ["Class 5"],
      curricula: ["English Medium"],
    }),
    // A profile saved before any of those sections was filled in.
    none: await saveTutor("none", "male", { city: cityA, area: areaA }),
    owner: await saveTutor("owner", "female", { city: cityA, area: areaA }, { additional: [`Test Subject ${tag}`] }),
  };
  // The older directory columns are never written by the profile form. A value left in them (a demo seed, an old import)
  // must not be mistaken for what the Tutor teaches.
  await db.update(tutors).set({ subjects: JSON.stringify(["Mathematics", "Physics"]), levels: JSON.stringify(["HSC"]) }).where(eq(tutors.id, ids.bio));

  const [request] = await db.insert(tutorRequests).values({
    guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "HSC", subjects: JSON.stringify(["Mathematics", "Physics"]),
    daysPerWeek: 3, locationText: `Test Area A ${tag}`,
  });
  requestId = Number(request.insertId);
  requestIds.push(requestId);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  if (tutorIds.length) {
    await db.delete(tutorSubjects).where(inArray(tutorSubjects.tutorId, tutorIds));
    await db.delete(tutorClassLevels).where(inArray(tutorClassLevels.tutorId, tutorIds));
    await db.delete(tutorCurricula).where(inArray(tutorCurricula.tutorId, tutorIds));
  }
  if (requestIds.length) await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  if (tutorIds.length) await db.delete(tutors).where(inArray(tutors.id, tutorIds));
  if (userIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
  if (ownerSubjectIds.length) await db.delete(subjectsCatalog).where(inArray(subjectsCatalog.id, ownerSubjectIds));
  await db.delete(locations).where(inArray(locations.id, [areaA, areaB]));
  await db.delete(locations).where(inArray(locations.id, [cityA, cityB]));
});

describe("what the Tutor Profiles rows say a Tutor teaches", () => {
  it("is the subjects, class levels and curricula the Tutor saved, by their catalog names", async () => {
    const rows = Object.fromEntries((await directory()).map(item => [nameOf[item.id], item]));
    expect(rows.math).toMatchObject({ subjects: ["Mathematics", "Physics", "Bangla"], levels: ["SSC", "HSC"], curricula: ["Bangladesh National Curriculum"] });
    expect(rows.bio).toMatchObject({ subjects: ["Biology"], levels: ["Class 5"], curricula: ["English Medium"] });
  });

  it("leads with the subjects the Tutor picked as primary, then the additional ones", async () => {
    const rows = Object.fromEntries((await directory()).map(item => [nameOf[item.id], item]));
    // The catalog lists Bangla ahead of Mathematics and Physics; the Tutor's own lead subjects still come first.
    expect(rows.math.subjects).toEqual(["Mathematics", "Physics", "Bangla"]);
  });

  it("is an empty list, not a failure, for a Tutor who has not chosen yet", async () => {
    const rows = Object.fromEntries((await directory()).map(item => [nameOf[item.id], item]));
    expect(rows.none).toMatchObject({ subjects: [], levels: [], curricula: [] });
  });

  it("ignores what is left in the older directory columns", async () => {
    const rows = Object.fromEntries((await directory()).map(item => [nameOf[item.id], item]));
    expect(rows.bio.subjects).toEqual(["Biology"]);
    expect(rows.bio.levels).toEqual(["Class 5"]);
  });

  it("reads the same on the single-Tutor review", async () => {
    const review = await getAdminTutorReview(ids.math);
    expect(review).toMatchObject({ subjects: ["Mathematics", "Physics", "Bangla"], levels: ["SSC", "HSC"], curricula: ["Bangladesh National Curriculum"] });
  });
});

describe("the Tutor Profiles subject filter", () => {
  it("finds a Tutor by a subject they saved, primary or additional, and by any one of several", async () => {
    expect(labelsOf(await directory({ subjects: ["Physics"] }))).toEqual(["math"]);
    expect(labelsOf(await directory({ subjects: ["Bangla"] }))).toEqual(["math"]);
    expect(labelsOf(await directory({ subjects: ["Biology", "Bangla"] }))).toEqual(["bio", "math"]);
  });

  it("matches the whole subject name when chosen, and a piece of it when typed", async () => {
    expect(labelsOf(await directory({ subjects: ["Math"] }))).toEqual([]);
    expect(labelsOf(await directory({ subject: "Math" }))).toEqual(["math"]);
  });

  it("does not find a Tutor by a subject that is only in the older directory columns", async () => {
    // `bio` has "Mathematics" and "Physics" in tutors.subjects, but never saved either.
    expect(labelsOf(await directory({ subjects: ["Mathematics"] }))).toEqual(["math"]);
    expect(labelsOf(await directory({ subject: "Physics" }))).toEqual(["math"]);
  });
});

describe("the Tutor Profiles filter options", () => {
  it("offer the subjects Tutors saved, including one the Owner added", async () => {
    const { subjects } = await getAdminTutorFilterOptions();
    expect(subjects).toEqual(expect.arrayContaining(["Bangla", "Biology", "Mathematics", "Physics", `Test Subject ${tag}`]));
  });

  it("follow the Owner renaming an option, and keep one the Owner has hidden while a Tutor still holds it", async () => {
    const ownerSubject = ownerSubjectIds[0];
    const renamed = `Renamed Subject ${tag}`;

    expect(await updateOptionCatalogEntry("subjects", ownerSubject, { name: renamed, active: true })).toEqual({ renamed: true });
    let options = await getAdminTutorFilterOptions();
    expect(options.subjects).toContain(renamed);
    expect(options.subjects).not.toContain(`Test Subject ${tag}`);
    expect(labelsOf(await directory({ subjects: [renamed] }))).toEqual(["owner"]);
    expect((await directory({ subjects: [renamed] }))[0].subjects).toEqual([renamed]);

    expect(await updateOptionCatalogEntry("subjects", ownerSubject, { name: renamed, active: false })).toEqual({ renamed: true });
    options = await getAdminTutorFilterOptions();
    expect(options.subjects).toContain(renamed);
    expect(labelsOf(await directory({ subjects: [renamed] }))).toEqual(["owner"]);
  });
});

describe("Tutor Matching", () => {
  async function candidates() {
    const result = await listMatchingCandidatesForRequest({ requestId, query: tag, verified: "all", location: "", subject: "", tuitionType: "all", page: 1, pageSize: 50 });
    if (!result) throw new Error("The request was not found.");
    return result.items.filter(item => nameOf[item.id]);
  }
  const labelsOfReasons = (item: { matchReasons: Array<{ label: string }> }) => item.matchReasons.map(reason => reason.label);

  it("credits the subjects and the class level a Tutor saved", async () => {
    const byLabel = Object.fromEntries((await candidates()).map(item => [nameOf[item.id], item]));
    expect(labelsOfReasons(byLabel.math)).toEqual(expect.arrayContaining(["Teaches Mathematics, Physics", "Covers HSC"]));
    expect(byLabel.math.matchCautions.map(caution => caution.label)).not.toContain("Does not list Mathematics, Physics");
  });

  it("credits nothing for a subject or level a Tutor never saved", async () => {
    const byLabel = Object.fromEntries((await candidates()).map(item => [nameOf[item.id], item]));
    // `bio` carries "Mathematics, Physics" and "HSC" in the older columns only.
    for (const label of ["bio", "none"]) {
      expect(labelsOfReasons(byLabel[label]).filter(reason => reason.startsWith("Teaches") || reason.startsWith("Covers"))).toEqual([]);
      expect(byLabel[label].matchCautions.map(caution => caution.label)).toContain("Does not list Mathematics, Physics");
    }
  });

  it("puts the Tutor who teaches what was asked ahead of the ones who do not", async () => {
    const order = (await candidates()).map(item => nameOf[item.id]);
    expect(order[0]).toBe("math");
  });

  it("narrows by the subject filter on the same selections", async () => {
    const result = await listMatchingCandidatesForRequest({ requestId, query: tag, verified: "all", location: "", subject: "Biology", tuitionType: "all", page: 1, pageSize: 50 });
    expect(labelsOf(result!.items.filter(item => nameOf[item.id]))).toEqual(["bio"]);
  });
});
