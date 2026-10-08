import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { guardianTuitionRequests, tutorRequests, users } from "../drizzle/schema";
import { countGuardianRequestActions, getDb } from "./db";

// Both seeded by scripts/seed-dev-discovery-fixtures.mjs. Every row this test
// makes is removed afterwards, and the counts are read as differences, so
// whatever else the database holds does not matter.
const holderId = "dev-tutor-amina";
const otherTutorId = "dev-tutor-rakib";

let guardianUserId: number;
const requestIds: number[] = [];

const tuition = {
  tuitionType: "home" as const,
  category: "Bangla Medium",
  classCourse: "Class 9",
  subjects: "Mathematics",
  daysPerWeek: 3,
  locationText: "Dhaka",
};

async function addTuition(over: Partial<typeof tutorRequests.$inferInsert>) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [result] = await database.insert(tutorRequests).values({ guardianUserId, ...tuition, ...over });
  const id = result.insertId as number;
  requestIds.push(id);
  return id;
}

async function addRequest(tutorRequestId: number, over: Partial<typeof guardianTuitionRequests.$inferInsert>) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  await database.insert(guardianTuitionRequests).values({ tutorRequestId, guardianUserId, type: "confirm", tutorId: holderId, status: "pending", ...over });
}

let before: Awaited<ReturnType<typeof countGuardianRequestActions>>;

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [guardian] = await database.insert(users).values({ openId: `test-request-counts-${Date.now()}`, name: "Test Guardian", role: "guardian" });
  guardianUserId = guardian.insertId as number;

  before = await countGuardianRequestActions();

  // Appointed, with the Guardian's Confirm about its Tutor waiting: counted.
  await addRequest(await addTuition({ status: "matched", tutorId: holderId }), { type: "confirm" });
  // Confirmed, with a removal of its Tutor waiting: counted under Confirmed, not Appointed.
  await addRequest(await addTuition({ status: "matched", tutorId: holderId, appointmentConfirmedAt: new Date() }), { type: "remove_tutor", reason: "Misses classes" });
  // A Confirm about a Tutor who no longer holds the tuition is left behind, not answerable.
  await addRequest(await addTuition({ status: "matched", tutorId: holderId }), { type: "confirm", tutorId: otherTutorId });
  // Answered requests do not wait.
  await addRequest(await addTuition({ status: "matched", tutorId: holderId }), { type: "confirm", status: "approved" });
  // Appointed with nothing asked.
  await addTuition({ status: "matched", tutorId: holderId });
  // A Live tuition's cancellation is counted by Cancel Requests, but it is on neither job list.
  await addRequest(await addTuition({ status: "reviewing", publicationState: "published" }), { type: "cancel_tuition", tutorId: null, reason: "No longer needed" });
});

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  if (requestIds.length) {
    await database.delete(guardianTuitionRequests).where(inArray(guardianTuitionRequests.tutorRequestId, requestIds));
    await database.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  }
  await database.delete(users).where(eq(users.id, guardianUserId));
});

describe("countGuardianRequestActions - tuitions with a request waiting", () => {
  it("counts an Appointed and a Confirmed tuition once each, and only for a request that can still be answered", async () => {
    const after = await countGuardianRequestActions();

    expect(after.appointedJobs - before.appointedJobs).toBe(1);
    expect(after.confirmedJobs - before.confirmedJobs).toBe(1);
  });

  it("leaves the request counts as they were: Confirm and Cancel count requests, not tuitions", async () => {
    const after = await countGuardianRequestActions();

    // Waiting: two Confirms (one stale), a removal and a cancellation.
    expect(after.confirm - before.confirm).toBe(2);
    expect(after.cancel - before.cancel).toBe(2);
  });
});
