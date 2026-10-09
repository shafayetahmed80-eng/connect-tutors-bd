import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { locations, pushSubscriptions, tutorTeachingAreas, tutorTuitionModes, tutors, users } from "../drizzle/schema";

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

import { getDb, listTutorUserIdsForNewTuition, notifyTutorsOfNewTuition } from "./db";

// Throwaway Tutors, removed again with everything hung off them - never anything else.
const tag = randomBytes(3).toString("hex");
const made = { userIds: [] as number[], tutorIds: [] as string[], subscriptionEndpoints: [] as string[] };
let areaA = "";
let areaB = "";
const who: Record<string, number> = {};

async function makeTutor(key: string, options: { locationId: string; profileStatus?: "approved" | "draft"; accountStatus?: "active" | "suspended"; teachingAreas?: string[]; online?: boolean }) {
  const database = (await getDb())!;
  const openId = `test:newtuition:${tag}:${key}`;
  const [insert] = await database.insert(users).values({ openId, name: `NT ${key}`, email: `${tag}-${key}@example.test`, role: "tutor", loginMethod: "password", accountStatus: options.accountStatus ?? "active" });
  const userId = Number(insert.insertId);
  const tutorId = `nt-${tag}-${key}`;
  await database.insert(tutors).values({ id: tutorId, userId, name: `NT ${key}`, gender: "male", locationId: options.locationId, profileStatus: options.profileStatus ?? "approved" });
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
  const areas = await database.select({ id: locations.id }).from(locations).where(eq(locations.type, "area")).limit(2);
  if (areas.length < 2) throw new Error("These tests need two areas in the locations table");
  areaA = areas[0]!.id;
  areaB = areas[1]!.id;
  await makeTutor("current", { locationId: areaA });
  await makeTutor("preferred", { locationId: areaB, teachingAreas: [areaA] });
  await makeTutor("elsewhere", { locationId: areaB });
  await makeTutor("draft", { locationId: areaA, profileStatus: "draft" });
  await makeTutor("suspended", { locationId: areaA, accountStatus: "suspended" });
  await makeTutor("online", { locationId: areaB, online: true });
});

beforeEach(() => { sent.calls.length = 0; });

afterAll(async () => {
  const database = (await getDb())!;
  if (made.userIds.length) await database.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, made.userIds));
  if (made.tutorIds.length) {
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
