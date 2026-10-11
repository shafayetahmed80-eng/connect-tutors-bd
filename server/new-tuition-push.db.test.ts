import { randomBytes } from "node:crypto";
import { and, eq, inArray, like } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { locations, pushSubscriptions, siteLimits, tutorNotifications, tutorTeachingAreas, tutorTuitionModes, tutors, users } from "../drizzle/schema";

const sent = vi.hoisted(() => ({ calls: [] as Array<{ endpoint: string; payload: { title: string; body: string; url?: string } }> }));
vi.mock("./chat-push", async importOriginal => {
  const actual = await importOriginal<typeof import("./chat-push")>();
  return {
    ...actual,
    sendWebPushNotification: vi.fn(async (subscription: { endpoint: string }, payload: { title: string; body: string; url?: string }) => {
      sent.calls.push({ endpoint: subscription.endpoint, payload });
      return { ok: true as const, gone: false };
    }),
  };
});

import { getDb, listTutorUserIdsForNewTuition, notifyTutorsOfNewTuition, setNewTuitionTutorAlertsEnabled } from "./db";
import { newTuitionPushUrl } from "@shared/push-messages";

// Throwaway Tutors, removed again with everything hung off them - never anything else.
const tag = randomBytes(3).toString("hex");
const made = { userIds: [] as number[], tutorIds: [] as string[], subscriptionEndpoints: [] as string[] };
let areaA = "";
let areaB = "";
const who: Record<string, number> = {};

async function makeTutor(key: string, options: { locationId: string; profileStatus?: "approved" | "draft"; accountStatus?: "active" | "suspended"; teachingAreas?: string[]; online?: boolean; gender?: "male" | "female" }) {
  const database = (await getDb())!;
  const openId = `test:newtuition:${tag}:${key}`;
  const [insert] = await database.insert(users).values({ openId, name: `NT ${key}`, email: `${tag}-${key}@example.test`, role: "tutor", loginMethod: "password", accountStatus: options.accountStatus ?? "active" });
  const userId = Number(insert.insertId);
  const tutorId = `nt-${tag}-${key}`;
  await database.insert(tutors).values({ id: tutorId, userId, name: `NT ${key}`, gender: options.gender ?? "male", locationId: options.locationId, profileStatus: options.profileStatus ?? "approved" });
  for (const locationId of options.teachingAreas ?? []) await database.insert(tutorTeachingAreas).values({ tutorId, locationId });
  if (options.online) await database.insert(tutorTuitionModes).values({ tutorId, mode: "online" });
  made.userIds.push(userId);
  made.tutorIds.push(tutorId);
  who[key] = userId;
  return userId;
}

/** The test Tutors among the ids returned, so Tutors that already live in the dev database cannot make a test flaky. */
const mine = (ids: number[]) => ids.filter(id => made.userIds.includes(id)).sort((a, b) => a - b);

beforeAll(async () => {
  const database = (await getDb())!;
  const occupied = new Set([
    ...(await database.select({ id: tutors.locationId }).from(tutors)).map(row => row.id),
    ...(await database.select({ id: tutorTeachingAreas.locationId }).from(tutorTeachingAreas)).map(row => row.id),
  ]);
  const areas = (await database.select({ id: locations.id }).from(locations).where(eq(locations.type, "area")).orderBy(locations.id)).filter(row => !occupied.has(row.id)).slice(0, 2);
  if (areas.length < 2) throw new Error("These tests need two areas with no Tutor in them in the locations table");
  areaA = areas[0]!.id;
  areaB = areas[1]!.id;
  await makeTutor("current", { locationId: areaA });
  await makeTutor("preferred", { locationId: areaB, teachingAreas: [areaA] });
  await makeTutor("elsewhere", { locationId: areaB });
  await makeTutor("draft", { locationId: areaA, profileStatus: "draft" });
  await makeTutor("suspended", { locationId: areaA, accountStatus: "suspended" });
  await makeTutor("online", { locationId: areaB, online: true });
  // Based in areaB and never in areaA, so the areaA expectations below are untouched by her.
  await makeTutor("woman", { locationId: areaB, gender: "female" });
});

beforeEach(async () => {
  sent.calls.length = 0;
  // Each test starts with no bell notices of its own, so what one leaves cannot pass or fail the next.
  const database = (await getDb())!;
  if (made.tutorIds.length) await database.delete(tutorNotifications).where(inArray(tutorNotifications.tutorId, made.tutorIds));
});

/** The new-tuition bell notices of the test Tutors, by Tutor id. */
async function bellNotices() {
  const database = (await getDb())!;
  const rows = await database.select().from(tutorNotifications)
    .where(and(inArray(tutorNotifications.tutorId, made.tutorIds), like(tutorNotifications.deduplicationKey, "new-tuition:%")));
  return new Map(rows.map(row => [row.tutorId, row] as const));
}
const tutorIdOf = (key: string) => `nt-${tag}-${key}`;
const job: NewTuitionAnnouncement = { publicJobId: "6812", tuitionType: "home", locationId: "", notice: { category: "Bangla Medium", classCourse: "Class 5", locationLabel: "Mirpur 10, Dhaka", budgetAmount: 9000 } };

afterAll(async () => {
  const database = (await getDb())!;
  if (made.userIds.length) await database.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, made.userIds));
  if (made.tutorIds.length) {
    await database.delete(tutorNotifications).where(inArray(tutorNotifications.tutorId, made.tutorIds));
    await database.delete(tutorTeachingAreas).where(inArray(tutorTeachingAreas.tutorId, made.tutorIds));
    await database.delete(tutorTuitionModes).where(inArray(tutorTuitionModes.tutorId, made.tutorIds));
    await database.delete(tutors).where(inArray(tutors.id, made.tutorIds));
  }
  if (made.userIds.length) await database.delete(users).where(inArray(users.id, made.userIds));
});

describe("who a new tuition reaches, against the real database", () => {
  it("reaches a Tutor whose Current Location is the tuition's area, or who prefers it - and nobody else", async () => {
    const reached = mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaA }));
    expect(reached).toEqual([who.current!, who.preferred!].sort((a, b) => a - b));
  });

  it("never reaches a draft profile or a suspended account, even in the right place", async () => {
    const reached = await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaA });
    expect(reached).not.toContain(who.draft);
    expect(reached).not.toContain(who.suspended);
  });

  it("also reaches the Tutors who teach online when a tuition can be taken online, even with an area", async () => {
    const everyone = [who.current!, who.preferred!, who.online!].sort((a, b) => a - b);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "both", locationId: areaA }))).toEqual(everyone);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "online", locationId: areaA }))).toEqual(everyone);
  });

  it("does not bring the online Tutors into a tuition that can only be taught in person", async () => {
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaA }))).not.toContain(who.online);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "group", locationId: areaA }))).not.toContain(who.online);
  });

  it("sends an online tuition with no area to the Tutors who teach online, and no one else", async () => {
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "online", locationId: null }))).toEqual([who.online!]);
  });

  it("has no one to tell about a home, group or package tuition with no area", async () => {
    expect(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: null })).toEqual([]);
    expect(await listTutorUserIdsForNewTuition({ tuitionType: "group", locationId: "   " })).toEqual([]);
  });
});

describe("the alert itself", () => {
  it("goes to every phone of a matching Tutor with the heading, the line and the link to that tuition", async () => {
    const database = (await getDb())!;
    for (const key of ["current", "preferred", "elsewhere"]) {
      const endpoint = `https://push.example/${tag}/${key}`;
      made.subscriptionEndpoints.push(endpoint);
      await database.insert(pushSubscriptions).values({ userId: who[key]!, endpoint, p256dh: "p", auth: "a" });
    }

    await notifyTutorsOfNewTuition({ publicJobId: "6812", tuitionType: "home", locationId: areaA });

    const mineCalls = sent.calls.filter(call => call.endpoint.includes(`/${tag}/`));
    expect(mineCalls.map(call => call.endpoint).sort()).toEqual([`https://push.example/${tag}/current`, `https://push.example/${tag}/preferred`]);
    for (const call of mineCalls) {
      expect(call.payload).toEqual({ title: "নতুন টিউশন জব", body: "আপনার প্রেফারেন্স অনুযায়ী নতুন টিউশন পোস্ট হয়েছে।", url: "/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6812" });
    }
  });
});

describe("who a Guardian's wish for a woman or a man leaves out", () => {
  it("tells only the women when the Guardian asked for a woman, and only the men when for a man", async () => {
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaB, preferredGender: "female" }))).toEqual([who.woman!]);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaB, preferredGender: "male" })))
      .toEqual([who.preferred!, who.elsewhere!, who.online!].sort((a, b) => a - b));
  });

  it("leaves nobody out when the Guardian has no preference, or none is given", async () => {
    const everyone = [who.preferred!, who.elsewhere!, who.online!, who.woman!].sort((a, b) => a - b);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaB, preferredGender: "any" }))).toEqual(everyone);
    expect(mine(await listTutorUserIdsForNewTuition({ tuitionType: "home", locationId: areaB }))).toEqual(everyone);
  });
});

describe("the bell notice", () => {
  const announce = (over: Partial<NewTuitionAnnouncement> = {}) => notifyTutorsOfNewTuition({ ...job, locationId: areaA, ...over });

  it("is written for every Tutor the tuition fits, with the heading, the line and the link to that tuition - and for nobody else", async () => {
    await announce();

    const notices = await bellNotices();
    expect([...notices.keys()].sort()).toEqual([tutorIdOf("current"), tutorIdOf("preferred")]);
    for (const row of notices.values()) {
      expect(row).toMatchObject({
        type: "new_tuition",
        title: "নতুন টিউশন জব — 6812",
        message: "Class 5 · Bangla Medium · Mirpur 10, Dhaka · 9,000 Taka",
        actionPath: newTuitionPushUrl("6812"),
        readAt: null,
      });
    }
  });

  it("is replaced by the next new tuition rather than piled beside it, and comes back unread at the top", async () => {
    await announce();
    const first = await bellNotices();
    const database = (await getDb())!;
    await database.update(tutorNotifications).set({ readAt: new Date() }).where(eq(tutorNotifications.tutorId, tutorIdOf("current")));

    await announce({ publicJobId: "6813", notice: { category: "English Medium", classCourse: "Standard 3", locationLabel: "Mirpur 10, Dhaka", budgetAmount: 12000 } });

    const second = await bellNotices();
    expect(second.size).toBe(2);
    const current = second.get(tutorIdOf("current"))!;
    expect(current.title).toBe("নতুন টিউশন জব — 6813");
    expect(current.message).toBe("Standard 3 · English Medium · Mirpur 10, Dhaka · 12,000 Taka");
    expect(current.readAt).toBeNull();
    // The inbox is ordered by id, so a notice that is to rise has to be a new row.
    expect(current.id).toBeGreaterThan(first.get(tutorIdOf("current"))!.id);
  });

  it("is written for the Tutors a woman's tuition fits only, when the Guardian asked for a woman", async () => {
    await announce({ locationId: areaB, preferredGender: "female" });

    expect([...(await bellNotices()).keys()]).toEqual([tutorIdOf("woman")]);
  });

  it("is not written when only the phone alert was asked for - a caller with nothing to say", async () => {
    await notifyTutorsOfNewTuition({ publicJobId: "6812", tuitionType: "home", locationId: areaA });

    expect((await bellNotices()).size).toBe(0);
  });

  it("is not written, and no phone alert goes out, while the Owner has the alerts switched off", async () => {
    const database = (await getDb())!;
    for (const key of ["current", "preferred"]) {
      const endpoint = `https://push.example/${tag}/off-${key}`;
      made.subscriptionEndpoints.push(endpoint);
      await database.insert(pushSubscriptions).values({ userId: who[key]!, endpoint, p256dh: "p", auth: "a" });
    }
    await setNewTuitionTutorAlertsEnabled(false);
    try {
      expect(await announce()).toBe(0);
      expect((await bellNotices()).size).toBe(0);
      expect(sent.calls.filter(call => call.endpoint.includes(`/${tag}/`))).toEqual([]);
    } finally {
      // Back to no row at all, which is how the switch started: On, by default.
      await setNewTuitionTutorAlertsEnabled(true);
      await database.delete(siteLimits).where(eq(siteLimits.limitId, "control.newTuitionTutorAlerts"));
    }

    // Back to what it was, the alert goes out again.
    expect(await announce()).toBeGreaterThanOrEqual(2);
    expect((await bellNotices()).size).toBe(2);
  });
});
