import { and, eq } from "drizzle-orm";
import { afterAll, afterEach, beforeAll, describe, expect, it, vi } from "vitest";
import { adminNotificationBroadcasts, guardianRequestNotifications, pushSubscriptions, tutorNotifications, tutors, users } from "../drizzle/schema";

const chatPushMocks = vi.hoisted(() => ({ sendWebPushNotification: vi.fn(), getWebPushPublicKey: vi.fn(() => "test-public-key") }));
vi.mock("./chat-push", () => chatPushMocks);

import {
  getDb,
  getPushNotificationPublicKey,
  notifyGuardianDirectory,
  notifyTutorDirectory,
  sendPushToTutor,
  sendPushToUser,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
} from "./db";

// dev-tutor-amina is seeded by scripts/seed-dev-discovery-fixtures.mjs, like
// the demo Tutor rows `sendPushToTutor` itself is written to expect, with no
// account behind it (`userId` null). It is borrowed here only long enough to
// point it at a throwaway account for the resolves-a-real-user assertion,
// then put back exactly as found - the seed data is not this test's to keep.
const seededTutorId = "dev-tutor-amina";

let guardianUserId: number;
let seededTutorUserId: number;

beforeAll(async () => {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [guardianResult] = await database.insert(users).values({
    openId: `test-guardian-push-${Date.now()}`,
    name: "Test Guardian",
    role: "guardian",
  });
  guardianUserId = guardianResult.insertId as number;

  const [tutorResult] = await database.insert(users).values({
    openId: `test-tutor-push-${Date.now()}`,
    name: "Test Tutor",
    role: "tutor",
  });
  seededTutorUserId = tutorResult.insertId as number;
  await database.update(tutors).set({ userId: seededTutorUserId }).where(eq(tutors.id, seededTutorId));
});

afterAll(async () => {
  const database = await getDb();
  if (!database) return;
  await database.update(tutors).set({ userId: null }).where(eq(tutors.id, seededTutorId));
  await database.delete(users).where(eq(users.id, guardianUserId));
  await database.delete(users).where(eq(users.id, seededTutorUserId));
});

afterEach(async () => {
  vi.clearAllMocks();
  const database = await getDb();
  if (!database) return;
  await database.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, guardianUserId));
  await database.delete(pushSubscriptions).where(eq(pushSubscriptions.userId, seededTutorUserId));
});

describe("push subscriptions", () => {
  it("gives out the server's public key, whatever getWebPushPublicKey reports", async () => {
    await expect(getPushNotificationPublicKey()).resolves.toEqual({ publicKey: "test-public-key" });
  });

  it("saves a subscription, then reassigns it to whoever re-subscribes with the same endpoint", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    const endpoint = `https://fcm.googleapis.com/test/${Date.now()}`;

    await subscribeToPushNotifications({ userId: guardianUserId, endpoint, p256dh: "p1", auth: "a1" });
    const [saved] = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    expect(saved?.userId).toBe(guardianUserId);

    // The same browser subscribing again (a different account, or a fresh key
    // pair after clearing site data) reassigns the one row rather than adding another.
    await subscribeToPushNotifications({ userId: seededTutorUserId, endpoint, p256dh: "p2", auth: "a2" });
    const rows = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    expect(rows).toHaveLength(1);
    expect(rows[0].userId).toBe(seededTutorUserId);
    expect(rows[0].p256dh).toBe("p2");

    await database.delete(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
  });

  it("only unsubscribes a row the signed-in user actually owns", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    const endpoint = `https://fcm.googleapis.com/test/${Date.now()}`;
    await subscribeToPushNotifications({ userId: guardianUserId, endpoint, p256dh: "p1", auth: "a1" });

    await unsubscribeFromPushNotifications({ userId: seededTutorUserId, endpoint });
    const stillThere = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    expect(stillThere).toHaveLength(1);

    await unsubscribeFromPushNotifications({ userId: guardianUserId, endpoint });
    const gone = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.endpoint, endpoint));
    expect(gone).toHaveLength(0);
  });
});

describe("sending a push", () => {
  it("does nothing for a user with no subscription", async () => {
    await sendPushToUser(guardianUserId, { title: "t", body: "b", url: "/x" });
    expect(chatPushMocks.sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("does nothing when there is no user behind the id - a seed/demo Tutor row with no account", async () => {
    await sendPushToUser(null, { title: "t", body: "b", url: "/x" });
    expect(chatPushMocks.sendWebPushNotification).not.toHaveBeenCalled();
  });

  it("sends to every subscription a user has, and prunes the ones the browser reports gone", async () => {
    const database = await getDb();
    if (!database) throw new Error("Database is not available");
    await subscribeToPushNotifications({ userId: guardianUserId, endpoint: "https://fcm.googleapis.com/test/keep", p256dh: "p1", auth: "a1" });
    await subscribeToPushNotifications({ userId: guardianUserId, endpoint: "https://fcm.googleapis.com/test/gone", p256dh: "p2", auth: "a2" });
    chatPushMocks.sendWebPushNotification.mockImplementation(async (subscription: { endpoint: string }) =>
      subscription.endpoint.endsWith("gone") ? { ok: false, gone: true } : { ok: true, gone: false });

    await sendPushToUser(guardianUserId, { title: "New message", body: "Open the app", url: "/guardian/dashboard" });

    expect(chatPushMocks.sendWebPushNotification).toHaveBeenCalledTimes(2);
    const remaining = await database.select().from(pushSubscriptions).where(eq(pushSubscriptions.userId, guardianUserId));
    expect(remaining).toHaveLength(1);
    expect(remaining[0].endpoint.endsWith("keep")).toBe(true);
  });

  it("resolves a Tutor's push through their tutorId, not their users.id", async () => {
    await subscribeToPushNotifications({ userId: seededTutorUserId, endpoint: "https://fcm.googleapis.com/test/tutor", p256dh: "p1", auth: "a1" });
    chatPushMocks.sendWebPushNotification.mockResolvedValue({ ok: true, gone: false });

    await sendPushToTutor(seededTutorId, { title: "Appointed", body: "A Guardian appointed you.", url: "/tutor/dashboard/status" });

    expect(chatPushMocks.sendWebPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://fcm.googleapis.com/test/tutor" }),
      { title: "Appointed", body: "A Guardian appointed you.", url: "/tutor/dashboard/status" },
    );
  });
});

describe("the Admin's bulk-notify broadcast", () => {
  afterEach(async () => {
    const database = await getDb();
    if (!database) return;
    await database.delete(tutorNotifications).where(and(eq(tutorNotifications.tutorId, seededTutorId), eq(tutorNotifications.title, "Push broadcast test")));
    await database.delete(guardianRequestNotifications).where(and(eq(guardianRequestNotifications.guardianUserId, guardianUserId), eq(guardianRequestNotifications.title, "Push broadcast test")));
    await database.delete(adminNotificationBroadcasts).where(eq(adminNotificationBroadcasts.title, "Push broadcast test"));
  });

  it("also pushes to each hand-picked Tutor's own subscription, not just their inbox", async () => {
    await subscribeToPushNotifications({ userId: seededTutorUserId, endpoint: "https://fcm.googleapis.com/test/broadcast-tutor", p256dh: "p1", auth: "a1" });
    chatPushMocks.sendWebPushNotification.mockResolvedValue({ ok: true, gone: false });

    const result = await notifyTutorDirectory({
      filters: { profileStatus: "all", jobStage: "all", query: "" } as never,
      tutorIds: [seededTutorId],
      title: "Push broadcast test",
      message: "A test announcement.",
      adminUserId: guardianUserId,
    });

    expect(result).toEqual({ sent: 1 });
    // The push, like every other site, is fired without waiting on it.
    await vi.waitFor(() => expect(chatPushMocks.sendWebPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://fcm.googleapis.com/test/broadcast-tutor" }),
      { title: "Push broadcast test", body: "A test announcement.", url: "/tutor/dashboard/notifications" },
    ));
  });

  it("also pushes to each hand-picked Guardian's own subscription, not just their inbox", async () => {
    await subscribeToPushNotifications({ userId: guardianUserId, endpoint: "https://fcm.googleapis.com/test/broadcast-guardian", p256dh: "p1", auth: "a1" });
    chatPushMocks.sendWebPushNotification.mockResolvedValue({ ok: true, gone: false });

    const result = await notifyGuardianDirectory({
      filters: { verificationStatus: "all", query: "" } as never,
      guardianUserIds: [guardianUserId],
      title: "Push broadcast test",
      message: "A test announcement.",
      adminUserId: seededTutorUserId,
    });

    expect(result).toEqual({ sent: 1 });
    await vi.waitFor(() => expect(chatPushMocks.sendWebPushNotification).toHaveBeenCalledWith(
      expect.objectContaining({ endpoint: "https://fcm.googleapis.com/test/broadcast-guardian" }),
      { title: "Push broadcast test", body: "A test announcement.", url: "/guardian/dashboard/notifications" },
    ));
  });
});
