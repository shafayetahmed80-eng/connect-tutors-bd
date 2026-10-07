import { randomBytes } from "node:crypto";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import {
  guardianProfiles,
  guardianRequestNotifications,
  locations,
  pushSubscriptions,
  tutorAdminChatMessages,
  tutorAdminChatThreads,
  tutorJobs,
  tutorRequestPublicationEvents,
  tutorRequests,
  tutors,
  users,
} from "../drizzle/schema";

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

import { createAdminPostedTuition, getDb, moderateTutorRequestPublication, sendTutorAdminChatMessageFromAdmin } from "./db";

// The real publishing path: Admin Add Tuition goes Live through the same call as Change Status.
// Everything made here is removed again, and nothing else is touched.
const tag = randomBytes(3).toString("hex");
const made = { userIds: [] as number[], tutorIds: [] as string[], requestIds: [] as number[] };
let area = "";
let city = "";
let adminUserId = 0;
let tutorUserId = 0;
const endpoint = `https://push.example/publish/${tag}`;

const alertsForMyTutor = () => sent.calls.filter(call => call.endpoint === endpoint);

beforeAll(async () => {
  const database = (await getDb())!;
  const [row] = await database.select({ id: locations.id, parentId: locations.parentId }).from(locations).where(eq(locations.type, "area")).limit(1);
  if (!row?.parentId) throw new Error("These tests need an area with a city in the locations table");
  area = row.id;
  city = row.parentId;

  const [admin] = await database.insert(users).values({ openId: `test:publish:${tag}:admin`, name: "Publish Admin", role: "admin", loginMethod: "password" });
  adminUserId = Number(admin.insertId);
  const [tutorUser] = await database.insert(users).values({ openId: `test:publish:${tag}:tutor`, name: "Publish Tutor", role: "tutor", loginMethod: "password" });
  tutorUserId = Number(tutorUser.insertId);
  made.userIds.push(adminUserId, tutorUserId);
  const tutorId = `pb-${tag}`;
  await database.insert(tutors).values({ id: tutorId, userId: tutorUserId, name: "Publish Tutor", gender: "female", locationId: area, profileStatus: "approved" });
  made.tutorIds.push(tutorId);
  await database.insert(pushSubscriptions).values({ userId: tutorUserId, endpoint, p256dh: "p", auth: "a" });
});

beforeEach(() => { sent.calls.length = 0; });

afterAll(async () => {
  const database = (await getDb())!;
  if (made.requestIds.length) {
    await database.delete(guardianRequestNotifications).where(inArray(guardianRequestNotifications.tutorRequestId, made.requestIds));
    await database.delete(tutorRequestPublicationEvents).where(inArray(tutorRequestPublicationEvents.tutorRequestId, made.requestIds));
    await database.delete(tutorJobs).where(inArray(tutorJobs.tutorRequestId, made.requestIds));
    const guardianIds = (await database.select({ id: tutorRequests.guardianUserId }).from(tutorRequests).where(inArray(tutorRequests.id, made.requestIds))).map(row => row.id);
    await database.delete(tutorRequests).where(inArray(tutorRequests.id, made.requestIds));
    if (guardianIds.length) {
      await database.delete(guardianProfiles).where(inArray(guardianProfiles.userId, guardianIds));
      await database.delete(users).where(inArray(users.id, guardianIds));
    }
  }
  if (made.userIds.length) await database.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, made.userIds));
  if (made.tutorIds.length) {
    const threadIds = (await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(inArray(tutorAdminChatThreads.tutorId, made.tutorIds))).map(row => row.id);
    if (threadIds.length) await database.delete(tutorAdminChatMessages).where(inArray(tutorAdminChatMessages.threadId, threadIds));
    await database.delete(tutorAdminChatThreads).where(inArray(tutorAdminChatThreads.tutorId, made.tutorIds));
    await database.delete(tutors).where(inArray(tutors.id, made.tutorIds));
  }
  if (made.userIds.length) await database.delete(users).where(inArray(users.id, made.userIds));
});

async function postTuition(locationId: string | null, tuitionType: "home" | "online") {
  const phone = `017${Math.floor(10000000 + Math.random() * 89999999)}`;
  const result = await createAdminPostedTuition({
    adminUserId,
    guardian: { name: `Publish Guardian ${tag}`, phone, cityLocationId: city, locationId: area },
    request: {
      tuitionType, category: "bangla-medium", curriculumType: null, classCourse: "Class 5", subjects: JSON.stringify(["Math"]),
      groupCapacity: null, packageDurationMonths: null, studentCount: 1, daysPerWeek: 3, preferredGender: "any", studentGender: null,
      addressDetails: null, tuitionCityLocationId: locationId ? city : null, tuitionLocationId: locationId, tuitionLocationLabel: locationId ? "Test area" : null,
      budgetAmount: 5000, instituteName: null, heardAboutUs: null, notes: null, contactConsent: "not_required", monthlyBudget: null, locationText: "Test area",
    },
  });
  made.requestIds.push(result.id);
  return result;
}

describe("a tuition going live, through the real publishing path", () => {
  it("alerts a matching Tutor once, with a link to that tuition", async () => {
    const posted = await postTuition(area, "home");
    expect(posted.live).toBe(true);

    // The alert goes out after the transaction, without being waited for.
    await vi.waitFor(() => expect(alertsForMyTutor()).toHaveLength(1));
    const [call] = alertsForMyTutor();
    expect(call!.payload.title).toBe("নতুন টিউশন জব");
    expect(call!.payload.body).toBe("আপনার প্রেফারেন্স অনুযায়ী নতুন টিউশন পোস্ট হয়েছে।");
    expect(call!.payload.url).toBe(`/tutor/dashboard/jobs?returnTo=${encodeURIComponent(`/job-board?job=${6799 + posted.id}`)}`);
  });

  it("does not alert again when the same tuition is published again", async () => {
    const posted = await postTuition(area, "home");
    await vi.waitFor(() => expect(alertsForMyTutor()).toHaveLength(1));

    await moderateTutorRequestPublication({ requestId: posted.id, adminUserId, action: "go_live" }).catch(() => undefined);
    await new Promise(resolve => setTimeout(resolve, 300));
    expect(alertsForMyTutor()).toHaveLength(1);
  });

  it("does not alert a Tutor for a tuition in an area they have nothing to do with", async () => {
    const database = (await getDb())!;
    const [other] = await database.select({ id: locations.id }).from(locations).where(eq(locations.type, "area")).limit(50);
    const elsewhere = (await database.select({ id: locations.id }).from(locations).where(eq(locations.type, "area")).limit(50)).find(row => row.id !== area)?.id ?? other!.id;
    expect(elsewhere).not.toBe(area);

    await postTuition(elsewhere, "home");
    await new Promise(resolve => setTimeout(resolve, 400));
    expect(alertsForMyTutor()).toHaveLength(0);
  });
});

describe("an Admin reply in Chat with Admin", () => {
  it("reaches the Tutor's locked phone with the message itself, linking to the chat", async () => {
    await sendTutorAdminChatMessageFromAdmin({ tutorId: made.tutorIds[0]!, body: "আপনার ডকুমেন্টটা পাঠান", adminUserId });

    await vi.waitFor(() => expect(alertsForMyTutor()).toHaveLength(1));
    expect(alertsForMyTutor()[0]!.payload).toEqual({ title: "অ্যাডমিনের মেসেজ", body: "আপনার ডকুমেন্টটা পাঠান", url: "/tutor/dashboard/chat" });
  });

  it("says a file was sent when the reply is only an attachment", async () => {
    await sendTutorAdminChatMessageFromAdmin({ tutorId: made.tutorIds[0]!, body: "", adminUserId, attachmentKey: "chat/test-file.pdf", attachmentContentType: "application/pdf" });

    await vi.waitFor(() => expect(alertsForMyTutor()).toHaveLength(1));
    expect(alertsForMyTutor()[0]!.payload.body).toBe("📎 একটি ফাইল পাঠানো হয়েছে");
  });
});
