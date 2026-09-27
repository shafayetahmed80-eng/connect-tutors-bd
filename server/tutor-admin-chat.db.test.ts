import { eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { adminPushSubscriptions, chatQuickReplies, tutorAdminChatMessages, tutorAdminChatNotes, tutorAdminChatThreads, tutorJobInterests, tutorJobs, tutorRequests, users } from "../drizzle/schema";

const chatWsMocks = vi.hoisted(() => ({ notifyAdminsOfChatMessage: vi.fn(), notifyTutorOfChatMessage: vi.fn(), notifyAdminsOfNewNote: vi.fn() }));
vi.mock("./chat-ws", () => chatWsMocks);

import {
  addTutorAdminChatNote,
  createChatQuickReply,
  deleteChatQuickReply,
  getDb,
  getTutorAdminChatEligibility,
  getTutorAdminChatStats,
  getTutorAdminChatThread,
  getTutorAdminChatUnreadCount,
  listChatQuickReplies,
  listTutorAdminChatNotes,
  listTutorAdminChatThreadsForAdmin,
  markTutorAdminChatReadByAdmin,
  reopenTutorAdminChatThread,
  sendTutorAdminChatMessageFromAdmin,
  sendTutorAdminChatMessageFromTutor,
  subscribeAdminToChatPush,
  toggleTutorAdminChatMessageReaction,
  unsubscribeAdminFromChatPush,
  updateChatQuickReply,
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

  it("archives a thread idle 30+ days on the next list read, and a reply un-archives it", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Are you still there?" });
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    const [thread] = await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, tutorId));
    const staleDate = new Date(Date.now() - 31 * 24 * 60 * 60 * 1000);
    await database.update(tutorAdminChatThreads).set({ lastMessageAt: staleDate }).where(eq(tutorAdminChatThreads.id, thread.id));

    const active = await listTutorAdminChatThreadsForAdmin({ query: "", page: 1, pageSize: 50, archived: false });
    expect(active.items.some(item => item.tutorId === tutorId)).toBe(false);

    const archivedList = await listTutorAdminChatThreadsForAdmin({ query: "", page: 1, pageSize: 50, archived: true });
    expect(archivedList.items.some(item => item.tutorId === tutorId)).toBe(true);

    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Sorry, back now." });
    const activeAfterReply = await listTutorAdminChatThreadsForAdmin({ query: "", page: 1, pageSize: 50, archived: false });
    expect(activeAfterReply.items.some(item => item.tutorId === tutorId)).toBe(true);
  });

  it("lets an Admin reopen an archived thread by hand", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Hello again" });
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    await database.update(tutorAdminChatThreads).set({ archivedAt: new Date() }).where(eq(tutorAdminChatThreads.tutorId, tutorId));

    await reopenTutorAdminChatThread({ tutorId });
    const [row] = await database.select({ archivedAt: tutorAdminChatThreads.archivedAt }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, tutorId));
    expect(row?.archivedAt).toBeNull();
  });

  it("keeps private notes only Admins ever read, and tells every other Admin one landed", async () => {
    await addTutorAdminChatNote({ tutorId, authorAdminId: adminUserId, body: "Called about a late payment." });
    const { notes } = await listTutorAdminChatNotes({ tutorId });
    expect(notes.map(note => note.body)).toContain("Called about a late payment.");
    expect(notes[0]?.authorAdminName).toBe("Test Admin");
    expect(chatWsMocks.notifyAdminsOfNewNote).toHaveBeenCalledWith(tutorId);

    const database = await getDb();
    if (database) await database.delete(tutorAdminChatNotes).where(eq(tutorAdminChatNotes.tutorId, tutorId));
  });

  it("toggles a 👍 reaction independently for each side, on any message", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Thanks!" });
    const thread = await getTutorAdminChatThread({ tutorId });
    const messageId = thread.messages[0]!.id;

    const tutorReact = await toggleTutorAdminChatMessageReaction({ tutorId, messageId, role: "tutor" });
    expect(tutorReact).toEqual({ reacted: true });
    let after = await getTutorAdminChatThread({ tutorId });
    expect(after.messages[0]).toMatchObject({ tutorReacted: true, adminReacted: false });

    const adminReact = await toggleTutorAdminChatMessageReaction({ tutorId, messageId, role: "admin" });
    expect(adminReact).toEqual({ reacted: true });
    after = await getTutorAdminChatThread({ tutorId });
    expect(after.messages[0]).toMatchObject({ tutorReacted: true, adminReacted: true });

    const tutorUnreact = await toggleTutorAdminChatMessageReaction({ tutorId, messageId, role: "tutor" });
    expect(tutorUnreact).toEqual({ reacted: false });
    after = await getTutorAdminChatThread({ tutorId });
    expect(after.messages[0]).toMatchObject({ tutorReacted: false, adminReacted: true });
  });

  it("refuses to react to a message outside the given Tutor's own thread", async () => {
    await sendTutorAdminChatMessageFromAdmin({ tutorId: ineligibleTutorId, body: "Not this thread", adminUserId });
    const otherThread = await getTutorAdminChatThread({ tutorId: ineligibleTutorId });
    const otherMessageId = otherThread.messages[0]!.id;

    await expect(toggleTutorAdminChatMessageReaction({ tutorId, messageId: otherMessageId, role: "admin" })).rejects.toThrow();

    const database = await getDb();
    if (database) {
      const [otherThreadRow] = await database.select({ id: tutorAdminChatThreads.id }).from(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.tutorId, ineligibleTutorId));
      if (otherThreadRow) {
        await database.delete(tutorAdminChatMessages).where(eq(tutorAdminChatMessages.threadId, otherThreadRow.id));
        await database.delete(tutorAdminChatThreads).where(eq(tutorAdminChatThreads.id, otherThreadRow.id));
      }
    }
  });

  it("manages a shared library of quick replies", async () => {
    await createChatQuickReply({ label: "Payment help", body: "Please share your payment reference.", createdByAdminId: adminUserId });
    const { items } = await listChatQuickReplies();
    const created = items.find(item => item.label === "Payment help");
    expect(created?.body).toBe("Please share your payment reference.");
    if (!created) throw new Error("Quick reply was not created");

    await updateChatQuickReply({ id: created.id, label: "Payment help", body: "Please share your bKash reference." });
    const { items: afterUpdate } = await listChatQuickReplies();
    expect(afterUpdate.find(item => item.id === created.id)?.body).toBe("Please share your bKash reference.");

    await deleteChatQuickReply({ id: created.id });
    const { items: afterDelete } = await listChatQuickReplies();
    expect(afterDelete.some(item => item.id === created.id)).toBe(false);
  });

  it("counts threads awaiting a reply, and averages response time over the last 30 days", async () => {
    await sendTutorAdminChatMessageFromTutor({ tutorId, body: "Quick question" });
    const before = await getTutorAdminChatStats();
    expect(before.awaitingReplyCount).toBeGreaterThanOrEqual(1);

    await sendTutorAdminChatMessageFromAdmin({ tutorId, body: "On it", adminUserId });
    const after = await getTutorAdminChatStats();
    expect(after.avgResponseMinutes).not.toBeNull();
  });

  it("saves and removes an Admin's push subscription", async () => {
    const endpoint = `https://fcm.googleapis.com/test/${Date.now()}`;
    await subscribeAdminToChatPush({ adminId: adminUserId, endpoint, p256dh: "test-p256dh", auth: "test-auth" });
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    const [saved] = await database.select().from(adminPushSubscriptions).where(eq(adminPushSubscriptions.endpoint, endpoint));
    expect(saved?.adminId).toBe(adminUserId);

    await unsubscribeAdminFromChatPush({ endpoint });
    const [afterRemove] = await database.select().from(adminPushSubscriptions).where(eq(adminPushSubscriptions.endpoint, endpoint));
    expect(afterRemove).toBeUndefined();
  });
});
