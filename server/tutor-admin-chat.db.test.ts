import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { tutorAdminChatMessages, tutorAdminChatThreads, tutorJobInterests, tutorJobs, tutorRequests, users } from "../drizzle/schema";

const chatWsMocks = vi.hoisted(() => ({ notifyAdminsOfChatMessage: vi.fn(), notifyTutorOfChatMessage: vi.fn() }));
vi.mock("./chat-ws", () => chatWsMocks);

import {
  getDb,
  getTutorAdminChatEligibility,
  getTutorAdminChatThread,
  getTutorAdminChatUnreadCount,
  markTutorAdminChatReadByAdmin,
  sendTutorAdminChatMessageFromAdmin,
  sendTutorAdminChatMessageFromTutor,
} from "./db";

// Both seeded by scripts/seed-dev-discovery-fixtures.mjs; every row this test
// makes on either is removed afterwards. Amina is given an appointed tuition
// below (eligible to chat); Rakib is left with none (not eligible).
const tutorId = "dev-tutor-amina";
const ineligibleTutorId = "dev-tutor-rakib";

// `senderAdminId` is a real foreign key into `users`, so a message "from" one
// needs a row that actually exists - a seeded Admin's id is not guaranteed
// (CI's fresh database seeds no Admin at all), so this test brings its own.
let adminUserId: number;
let guardianUserId: number;
let tutorRequestId: number;
let tutorJobId: number;

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [adminResult] = await database.insert(users).values({
    openId: `test-admin-chat-${Date.now()}`,
    name: "Test Admin",
    role: "admin",
  });
  adminUserId = adminResult.insertId as number;

  const [guardianResult] = await database.insert(users).values({
    openId: `test-guardian-chat-${Date.now()}`,
    name: "Test Guardian",
    role: "guardian",
  });
  guardianUserId = guardianResult.insertId as number;

  // Enough of an appointed tuition for `tutorHasAppointedOrLaterTuition` to
  // see Amina as eligible - the gate reads `tutor_job_interests.status =
  // 'matched'` through `tutor_jobs` into `tutor_requests`, nothing else on
  // these rows matters to it.
  const [requestResult] = await database.insert(tutorRequests).values({
    guardianUserId,
    tuitionType: "home",
    category: "Bangla Medium",
    classCourse: "Class 9",
    subjects: "Mathematics",
    daysPerWeek: 3,
    locationText: "Dhaka",
    status: "matched",
  });
  tutorRequestId = requestResult.insertId as number;

  const now = new Date();
  const [jobResult] = await database.insert(tutorJobs).values({
    tutorRequestId,
    publicJobId: `TEST-CHAT-${Date.now()}`,
    tuitionType: "home",
    category: "Bangla Medium",
    classCourse: "Class 9",
    subjects: "Mathematics",
    daysPerWeek: 3,
    publishedAt: now,
    expiresAt: new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000),
  });
  tutorJobId = jobResult.insertId as number;

  await database.insert(tutorJobInterests).values({ tutorJobId, tutorId, status: "matched" });
});

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  await database.delete(tutorJobInterests).where(eq(tutorJobInterests.tutorJobId, tutorJobId));
  await database.delete(tutorJobs).where(eq(tutorJobs.id, tutorJobId));
  await database.delete(tutorRequests).where(eq(tutorRequests.id, tutorRequestId));
  await database.delete(users).where(eq(users.id, adminUserId));
  await database.delete(users).where(eq(users.id, guardianUserId));
});

afterEach(async () => {
  vi.clearAllMocks();
  const database = await getDb();
  if (!database) return;
  const [thread] = await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, tutorId));
  if (thread) {
    await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, thread.id));
    await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, thread.id));
  }
});

describe("the Tutor-Admin chat, against the real database", () => {
  it("pushes the Admin side after a Tutor writes in, and the Tutor side after an Admin replies", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Hello Admin" });
    expect(chatWsMocks.notifyAdminsOfChatMessage).toHaveBeenCalledWith(tutorId);
    expect(chatWsMocks.notifyTutorOfChatMessage).not.toHaveBeenCalled();

    await sendTutorAdminChatMessageFromAdmin({ tutorId, body: "How can we help?", adminUserId });
    expect(chatWsMocks.notifyTutorOfChatMessage).toHaveBeenCalledWith(tutorId);
  });

  it("counts an Admin reply as unread for the Tutor until the Tutor reads it", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "I have a question" });
    await sendTutorAdminChatMessageFromAdmin({ tutorId, body: "Sure, go ahead", adminUserId });

    await expect(getTutorAdminChatUnreadCount({ tutorId })).resolves.toEqual({ unreadCount: 1 });

    const thread = await getTutorAdminChatThread({ tutorId });
    expect(thread.messages.map(message => message.body)).toEqual(["I have a question", "Sure, go ahead"]);
  });

  it("marks the thread read on the Admin side without touching the Tutor's own read state", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Ping" });
    await markTutorAdminChatReadByAdmin({ tutorId });
    // The Tutor's own message already set tutorLastReadAt=now on send, so this Admin-side mark leaves it untouched either way.
    await expect(getTutorAdminChatUnreadCount({ tutorId })).resolves.toEqual({ unreadCount: 0 });
  });

  it("only lets a Tutor with an appointed-or-later tuition send", async () => {
    await expect(getTutorAdminChatEligibility({ tutorId })).resolves.toEqual({ eligible: true });
    await expect(getTutorAdminChatEligibility({ tutorId: ineligibleTutorId })).resolves.toEqual({ eligible: false });

    await expect(sendTutorAdminChatMessageFromTutor({ tutorId: ineligibleTutorId, body: "Hi" })).resolves.toEqual({ sent: false, reason: "not_eligible" });
    expect(chatWsMocks.notifyAdminsOfChatMessage).not.toHaveBeenCalled();

    const thread = await getTutorAdminChatThread({ tutorId: ineligibleTutorId });
    expect(thread.eligible).toBe(false);
    expect(thread.messages).toEqual([]);
  });

  it("still lets an Admin message a Tutor first, before any tuition is appointed", async () => {
    await expect(sendTutorAdminChatMessageFromAdmin({ tutorId: ineligibleTutorId, body: "Welcome!", adminUserId })).resolves.toEqual({ sent: true });
    const thread = await getTutorAdminChatThread({ tutorId: ineligibleTutorId });
    expect(thread.messages.map(message => message.body)).toEqual(["Welcome!"]);
    // Clean up: this test's own thread, on the tutor the other tests never touch.
    const database = await getDb();
    if (database) {
      const [ineligibleThread] = await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, ineligibleTutorId));
      if (ineligibleThread) {
        await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, ineligibleThread.id));
        await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, ineligibleThread.id));
      }
    }
  });
});
