import { randomBytes } from "node:crypto";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { tutorJobs, tutorRequestLearningNeeds, tutorRequests, users } from "../drizzle/schema";
import { learningNeedsFromLegacy, summarizeLearningNeeds, type LearningNeed } from "@shared/learning-needs";
import { createTutorRequest, getDb, getJobBoardFilterOptions, listPublishedTutorJobs } from "./db";

// One Guardian, two tuitions on the Job Board: one asks for several curricula and classes, one for a single
// curriculum and class. Everything made here is removed afterwards, by id; every list below asks for the
// tuition's own Job ID, so whatever else the database holds does not change what is read.
const tag = randomBytes(3).toString("hex");
let userId = 0;
const requestIds: number[] = [];
const jobIds: Record<string, string> = {};

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

const several: LearningNeed[] = [
  { category: "English Version", classes: [{ classCourse: `Class 5 ${tag}`, subjects: [`Math ${tag}`, `English ${tag}`] }, { classCourse: `Class 6 ${tag}`, subjects: [`Math ${tag}`] }] },
  { category: "Bangla Medium", classes: [{ classCourse: `Class 8 ${tag}`, subjects: [`Physics ${tag}`] }] },
];

async function makeJob(name: string, needs: LearningNeed[]) {
  const db = await database();
  const summary = summarizeLearningNeeds(needs);
  const { id } = await createTutorRequest({
    guardianUserId: userId, tuitionType: "online", category: summary.category, curriculumType: summary.curriculumType, classCourse: summary.classCourse,
    subjects: JSON.stringify(summary.subjects), daysPerWeek: 3, locationText: "Dhaka", budgetAmount: 5000,
  } as typeof tutorRequests.$inferInsert, needs);
  requestIds.push(id);
  jobIds[name] = `TJLN-${tag}-${name}`;
  await db.insert(tutorJobs).values({
    tutorRequestId: id, publicJobId: jobIds[name], tuitionType: "online", category: summary.category, classCourse: summary.classCourse,
    subjects: JSON.stringify(summary.subjects), daysPerWeek: 3, publishedAt: new Date(),
  });
  return id;
}

beforeAll(async () => {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-jbln-${tag}`, name: `JBLN ${tag}`, role: "guardian" });
  userId = Number(made.insertId);
  await makeJob("several", several);
  await makeJob("single", learningNeedsFromLegacy({ category: "Madrasa Medium", classCourse: `Class 3 ${tag}`, subjects: [`Quran ${tag}`] }));
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  for (const id of requestIds) {
    await db.delete(tutorJobs).where(eq(tutorJobs.tutorRequestId, id));
    await db.delete(tutorRequests).where(eq(tutorRequests.id, id));
  }
  if (userId) {
    await db.delete(users).where(eq(users.id, userId));
  }
});

async function found(name: string, filters: Parameters<typeof listPublishedTutorJobs>[0] extends infer T ? Partial<T> : never) {
  const page = await listPublishedTutorJobs({ jobId: jobIds[name], page: 1, pageSize: 10, ...filters });
  return page.totalCount;
}

describe("the Job Board's filters, for a tuition that asks for several curricula and classes", () => {
  it("writes a request's curricula and classes as one row each, and the request keeps a one-line summary", async () => {
    const db = await database();
    const rows = await db.select().from(tutorRequestLearningNeeds).where(eq(tutorRequestLearningNeeds.tutorRequestId, requestIds[0]!));
    const [request] = await db.select({ category: tutorRequests.category, classCourse: tutorRequests.classCourse }).from(tutorRequests).where(eq(tutorRequests.id, requestIds[0]!));

    expect(rows.map(row => `${row.category} / ${row.classCourse}`)).toEqual([
      `English Version / Class 5 ${tag}`, `English Version / Class 6 ${tag}`, `Bangla Medium / Class 8 ${tag}`,
    ]);
    expect(request).toEqual({ category: "English Version, Bangla Medium", classCourse: `Class 5 ${tag}, Class 6 ${tag}, Class 8 ${tag}` });
  });

  it("finds it by either curriculum, and by any one of its classes", async () => {
    expect(await found("several", { categories: ["English Version"] })).toBe(1);
    expect(await found("several", { categories: ["Bangla Medium"] })).toBe(1);
    expect(await found("several", { classCourses: [`Class 6 ${tag}`] })).toBe(1);
    expect(await found("several", { classCourses: [`Class 8 ${tag}`] })).toBe(1);
    expect(await found("several", { categories: ["Madrasa Medium"] })).toBe(0);
  });

  it("holds a curriculum and a class chosen together to a pair the tuition asks for", async () => {
    expect(await found("several", { categories: ["Bangla Medium"], classCourses: [`Class 8 ${tag}`] })).toBe(1);
    expect(await found("several", { categories: ["English Version"], classCourses: [`Class 8 ${tag}`] })).toBe(0);
  });

  it("keeps a subject with the class it was chosen for", async () => {
    expect(await found("several", { subjects: [`Physics ${tag}`] })).toBe(1);
    expect(await found("several", { categories: ["English Version"], subjects: [`Physics ${tag}`] })).toBe(0);
    expect(await found("several", { classCourses: [`Class 5 ${tag}`], subjects: [`English ${tag}`] })).toBe(1);
    expect(await found("several", { classCourses: [`Class 6 ${tag}`], subjects: [`English ${tag}`] })).toBe(0);
  });

  it("still finds a tuition with one curriculum and class the way it always did", async () => {
    expect(await found("single", { categories: ["Madrasa Medium"], classCourses: [`Class 3 ${tag}`], subjects: [`Quran ${tag}`] })).toBe(1);
    expect(await found("single", { categories: ["English Version"] })).toBe(0);
  });

  it("offers every curriculum with its own classes, and every class with its own subjects", async () => {
    const options = await getJobBoardFilterOptions();

    expect(options.classesByCategory["English Version"]).toEqual(expect.arrayContaining([`Class 5 ${tag}`, `Class 6 ${tag}`]));
    expect(options.classesByCategory["English Version"]).not.toContain(`Class 8 ${tag}`);
    expect(options.classesByCategory["Bangla Medium"]).toContain(`Class 8 ${tag}`);
    expect(options.subjectsByClass[`Class 5 ${tag}`]).toEqual(expect.arrayContaining([`Math ${tag}`, `English ${tag}`]));
    expect(options.subjectsByClass[`Class 6 ${tag}`]).toEqual([`Math ${tag}`]);
    expect(options.subjectsByClass[`Class 8 ${tag}`]).toEqual([`Physics ${tag}`]);
  });
});
