import { randomBytes } from "node:crypto";
import { inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { accountChangeRequests, adminNotificationBroadcasts, guardianRequestNotifications, guardianProfiles, tutorRequests, users } from "../drizzle/schema";
import type { AdminGuardianDirectoryFilters } from "./db";
import { getDb, listGuardianProfilesForAdmin, notifyGuardianDirectory } from "./db";

// Four Guardians made here, found again by a random tag in their names, so
// whatever else the database holds does not change what is read. Every row is
// removed afterwards, by id.
const tag = randomBytes(3).toString("hex");
const day = 24 * 60 * 60 * 1000;
const ago = (days: number) => new Date(Date.now() - days * day);

const ids: Record<string, number> = {};
const nameOf = new Map<number, string>();
const userIds: number[] = [];
const requestIds: number[] = [];
let adminUserId = 0;

async function database() {
  const db = await getDb();
  if (!db) throw new Error("Database is not available");
  return db;
}

async function makeGuardian(name: string, over: Partial<typeof users.$inferInsert>) {
  const db = await database();
  const [made] = await db.insert(users).values({ openId: `test-gdf-${tag}-${name}`, name: `Guardian ${name} ${tag}`, role: "guardian", ...over });
  const id = Number(made.insertId);
  ids[name] = id;
  nameOf.set(id, name);
  userIds.push(id);
  return id;
}

async function postTuitions(guardianUserId: number, howMany: number) {
  const db = await database();
  for (let index = 0; index < howMany; index += 1) {
    const [request] = await db.insert(tutorRequests).values({
      guardianUserId, tuitionType: "home", category: "Bangla Medium", classCourse: "Class 5", subjects: JSON.stringify(["Math"]), daysPerWeek: 3, locationText: "Dhaka",
    });
    requestIds.push(Number(request.insertId));
  }
}

async function requestChange(userId: number, status: "pending" | "approved") {
  const db = await database();
  await db.insert(accountChangeRequests).values({ userId, role: "guardian", type: "name", currentValue: "A", requestedValue: "B", status });
}

beforeAll(async () => {
  const db = await database();
  adminUserId = Number((await db.insert(users).values({ openId: `test-gdf-${tag}-admin`, name: `Admin ${tag}`, role: "admin" }))[0].insertId);
  userIds.push(adminUserId);

  // g1: posted two, a request waiting, joined 10 days ago
  const g1 = await makeGuardian("g1", { createdAt: ago(10) });
  await postTuitions(g1, 2);
  await requestChange(g1, "pending");
  // g2: posted one, a request already answered, joined 40 days ago, suspended
  const g2 = await makeGuardian("g2", { createdAt: ago(40), accountStatus: "suspended" });
  await postTuitions(g2, 1);
  await requestChange(g2, "approved");
  // g3: posted none, joined 2 days ago
  await makeGuardian("g3", { createdAt: ago(2) });
  // g4: posted three, joined 100 days ago, closed
  const g4 = await makeGuardian("g4", { createdAt: ago(100), accountStatus: "closed" });
  await postTuitions(g4, 3);
});

afterAll(async () => {
  const db = await getDb();
  if (!db) return;
  const guardianIds = Object.values(ids);
  await db.delete(guardianRequestNotifications).where(inArray(guardianRequestNotifications.guardianUserId, guardianIds));
  await db.delete(adminNotificationBroadcasts).where(like(adminNotificationBroadcasts.title, `%${tag}%`));
  await db.delete(accountChangeRequests).where(inArray(accountChangeRequests.userId, guardianIds));
  if (requestIds.length) await db.delete(tutorRequests).where(inArray(tutorRequests.id, requestIds));
  if (userIds.length) {
    await db.delete(guardianProfiles).where(inArray(guardianProfiles.userId, userIds));
    await db.delete(users).where(inArray(users.id, userIds));
  }
});

const all = { query: tag, verification: "all", page: 1, pageSize: 100 } as const;

/** Which of this test's Guardians the list returns for these choices, by name. */
async function read(over: Partial<AdminGuardianDirectoryFilters> = {}) {
  const page = await listGuardianProfilesForAdmin({ ...all, ...over });
  return { names: page.items.map(item => nameOf.get(item.userId)).filter(Boolean).sort(), counts: page.counts, total: page.total };
}

describe("the Guardian Profiles filters", () => {
  it("lists all four Guardians when nothing narrows them", async () => {
    expect((await read()).names).toEqual(["g1", "g2", "g3", "g4"]);
  });

  it("takes a joined-date range, the last day included", async () => {
    expect((await read({ joinedFrom: ago(20) })).names).toEqual(["g1", "g3"]);
    expect((await read({ joinedTo: ago(20) })).names).toEqual(["g2", "g4"]);
    expect((await read({ joinedFrom: ago(50), joinedTo: ago(5) })).names).toEqual(["g1", "g2"]);
  });

  it("counts the tuitions a Guardian has posted: none, exactly one, two and more", async () => {
    expect((await read({ tuitions: "none" })).names).toEqual(["g3"]);
    expect((await read({ tuitions: "one" })).names).toEqual(["g2"]);
    expect((await read({ tuitions: "many" })).names).toEqual(["g1", "g4"]);
  });

  it("finds a Guardian with a request waiting, and does not count one already answered", async () => {
    expect((await read({ changeRequest: "has" })).names).toEqual(["g1"]);
    expect((await read({ changeRequest: "none" })).names).toEqual(["g2", "g3", "g4"]);
  });

  it("reads the state of the account", async () => {
    expect((await read({ accountStatus: "active" })).names).toEqual(["g1", "g3"]);
    expect((await read({ accountStatus: "suspended" })).names).toEqual(["g2"]);
    expect((await read({ accountStatus: "closed" })).names).toEqual(["g4"]);
  });

  it("narrows by several choices at once", async () => {
    expect((await read({ tuitions: "many", accountStatus: "active" })).names).toEqual(["g1"]);
    expect((await read({ tuitions: "many", joinedFrom: ago(20) })).names).toEqual(["g1"]);
    expect((await read({ tuitions: "none", changeRequest: "has" })).names).toEqual([]);
  });

  it("lets the Verification tab counts follow the new choices, so a tab never says more than it opens on", async () => {
    const { counts, total } = await read({ tuitions: "many" });
    expect(total).toBe(2);
    expect(counts.all).toBe(2);
    // Nobody here has a profile row, so each reads as unverified.
    expect(counts.unverified).toBe(2);
    expect((await read({ tuitions: "many", verification: "verified" })).total).toBe(0);
  });

  it("keeps the Tuitions column and the Tuitions filter on the same count", async () => {
    const page = await listGuardianProfilesForAdmin({ ...all });
    const posted = Object.fromEntries(page.items.filter(item => nameOf.has(item.userId)).map(item => [nameOf.get(item.userId)!, item.tuitions]));
    expect(posted).toEqual({ g1: 2, g2: 1, g3: 0, g4: 3 });
  });

  it("finds nothing, rather than failing, for dates the wrong way round", async () => {
    expect((await read({ joinedFrom: ago(1), joinedTo: ago(30) })).names).toEqual([]);
  });

  it("notifies exactly the Guardians the same choices list, no more", async () => {
    const result = await notifyGuardianDirectory({
      filters: { query: tag, verification: "all", tuitions: "many" },
      title: `Check ${tag}`,
      message: "Only Guardians with two or more tuitions.",
      adminUserId,
    });
    expect(result).toEqual({ sent: 2 });
    const db = await database();
    const got = await db.select({ guardianUserId: guardianRequestNotifications.guardianUserId }).from(guardianRequestNotifications).where(inArray(guardianRequestNotifications.guardianUserId, Object.values(ids)));
    expect(got.map(row => nameOf.get(row.guardianUserId)).sort()).toEqual(["g1", "g4"]);
  });
});
