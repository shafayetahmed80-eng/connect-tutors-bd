import { inArray } from "drizzle-orm";
import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { adminPushPreferences, adminPushSubscriptions, pushSubscriptions, users } from "../drizzle/schema";

const chatPushMocks = vi.hoisted(() => ({ sendWebPushNotification: vi.fn(), getWebPushPublicKey: vi.fn(() => "test-public-key") }));
vi.mock("./chat-push", () => chatPushMocks);

import { ENV } from "./_core/env";
import { getDb, isAdminPushSubscribed, isPushSubscribedForUser, notifyAdminPushEvent, sendPushToOwner } from "./db";

const runId = `${Date.now()}`;
const endpointOf = (name: string) => `https://push.example/${runId}/${name}`;
const delivered = () => chatPushMocks.sendWebPushNotification.mock.calls.map(([subscription]) => (subscription as { endpoint: string }).endpoint).filter(endpoint => endpoint.includes(runId));

let adminAllOn: number;
let adminTuitionsOff: number;
let adminRequestsOff: number;
let ownerId: number;
const createdUserIds: number[] = [];
const originalOwnerOpenId = ENV.ownerOpenId;

async function createUser(label: string) {
  const database = await getDb();
  if (!database) throw new Error("Database is not available");
  const [result] = await database.insert(users).values({ openId: `test-admin-push-${label}-${runId}`, name: `Test ${label}`, role: "admin" });
  createdUserIds.push(result.insertId as number);
  return result.insertId as number;
}

async function addAdminDevice(adminId: number, name: string) {
  const database = await getDb();
  await database!.insert(adminPushSubscriptions).values({ adminId, endpoint: endpointOf(name), p256dh: "p256dh", auth: "auth" });
}

beforeAll(async () => {
  adminAllOn = await createUser("all-on");
  adminTuitionsOff = await createUser("tuitions-off");
  adminRequestsOff = await createUser("requests-off");
  ownerId = await createUser("owner");
  const database = await getDb();
  await database!.insert(adminPushPreferences).values({ adminId: adminTuitionsOff, notifyTuitions: false });
  await database!.insert(adminPushPreferences).values({ adminId: adminRequestsOff, notifyGuardianRequests: false, notifyAccountChanges: false });
  ENV.ownerOpenId = `test-admin-push-owner-${runId}`;
});

beforeEach(() => {
  chatPushMocks.sendWebPushNotification.mockReset();
  chatPushMocks.sendWebPushNotification.mockResolvedValue({ ok: true, gone: false, notConfigured: false, statusCode: undefined });
});

afterAll(async () => {
  ENV.ownerOpenId = originalOwnerOpenId;
  const database = await getDb();
  if (!database || createdUserIds.length === 0) return;
  await database.delete(adminPushSubscriptions).where(inArray(adminPushSubscriptions.adminId, createdUserIds));
  await database.delete(pushSubscriptions).where(inArray(pushSubscriptions.userId, createdUserIds));
  await database.delete(adminPushPreferences).where(inArray(adminPushPreferences.adminId, createdUserIds));
  await database.delete(users).where(inArray(users.id, createdUserIds));
});

describe("Admin alerts against the real database", () => {
  it("reaches every Admin device, except one whose Admin switched that kind of alert off", async () => {
    await addAdminDevice(adminAllOn, "all-on-phone");
    await addAdminDevice(adminTuitionsOff, "tuitions-off-phone");

    await notifyAdminPushEvent({ type: "tuition_request", requestId: 7, classCourse: "Class 9", guardianName: "Test", locationText: null });

    expect(delivered()).toEqual([endpointOf("all-on-phone")]);

    chatPushMocks.sendWebPushNotification.mockClear();
    await notifyAdminPushEvent({ type: "tutor_chat", tutorId: "tutor-1", tutorName: "Test", preview: "hi" });

    expect(delivered().sort()).toEqual([endpointOf("all-on-phone"), endpointOf("tuitions-off-phone")].sort());
  });

  it("knows whether this very browser is registered for this Admin, not just whether some Admin is", async () => {
    await expect(isAdminPushSubscribed(adminAllOn, endpointOf("all-on-phone"))).resolves.toEqual({ subscribed: true });
    // Another Admin's device, and a browser the server has never seen.
    await expect(isAdminPushSubscribed(adminAllOn, endpointOf("tuitions-off-phone"))).resolves.toEqual({ subscribed: false });
    await expect(isAdminPushSubscribed(adminAllOn, endpointOf("made-for-something-else"))).resolves.toEqual({ subscribed: false });
  });

  it("sends the Owner's security alert to the phone the Owner switched on in Admin Settings, once even if the browser is in both lists", async () => {
    const database = await getDb();
    await addAdminDevice(ownerId, "owner-admin-phone");
    await addAdminDevice(ownerId, "owner-both-lists");
    await database!.insert(pushSubscriptions).values({ userId: ownerId, endpoint: endpointOf("owner-both-lists"), p256dh: "p256dh", auth: "auth" });
    await database!.insert(pushSubscriptions).values({ userId: ownerId, endpoint: endpointOf("owner-account-phone"), p256dh: "p256dh", auth: "auth" });

    await sendPushToOwner({ title: "New sign-in", body: "A new device signed in", url: "/admin/security" });

    expect(delivered().sort()).toEqual([endpointOf("owner-account-phone"), endpointOf("owner-admin-phone"), endpointOf("owner-both-lists")].sort());
  });

  it("removes an Owner Admin device the push service says is gone", async () => {
    await addAdminDevice(ownerId, "owner-gone-phone");
    chatPushMocks.sendWebPushNotification.mockImplementation(async (subscription: { endpoint: string }) =>
      subscription.endpoint === endpointOf("owner-gone-phone")
        ? { ok: false, gone: true, notConfigured: false, statusCode: 410 }
        : { ok: true, gone: false, notConfigured: false, statusCode: undefined });

    await sendPushToOwner({ title: "t", body: "b", url: "/admin/security" });

    await expect(isAdminPushSubscribed(ownerId, endpointOf("owner-gone-phone"))).resolves.toEqual({ subscribed: false });
  });
});

describe("Guardian-request and account-change alerts against the real database", () => {
  it("reach every Admin device except one whose Admin switched that kind off, using the new columns", async () => {
    await addAdminDevice(adminRequestsOff, "requests-off-phone");

    await notifyAdminPushEvent({ type: "guardian_request", requestId: 13, kind: "confirm", guardianName: "Rina Akter" });
    expect(delivered()).toContain(endpointOf("all-on-phone"));
    expect(delivered()).not.toContain(endpointOf("requests-off-phone"));

    chatPushMocks.sendWebPushNotification.mockClear();
    await notifyAdminPushEvent({ type: "account_change", requestRole: "tutor", changeType: "name", personName: "Karim Uddin" });
    expect(delivered()).toContain(endpointOf("all-on-phone"));
    expect(delivered()).not.toContain(endpointOf("requests-off-phone"));

    chatPushMocks.sendWebPushNotification.mockClear();
    await notifyAdminPushEvent({ type: "tutor_chat", tutorId: "tutor-1", tutorName: "Test", preview: "hi" });
    expect(delivered()).toContain(endpointOf("requests-off-phone"));
  });

  it("keeps another Admin's own request to the Project Owner's devices", async () => {
    await addAdminDevice(ownerId, "owner-alerts-phone");

    await notifyAdminPushEvent({ type: "account_change", requestRole: "admin", changeType: "mobile", personName: "Some Admin" });

    // The Owner may hold other devices from the tests above; what matters is that no other Admin's device heard of it.
    expect(delivered()).toContain(endpointOf("owner-alerts-phone"));
    expect(delivered()).not.toContain(endpointOf("all-on-phone"));
    expect(delivered()).not.toContain(endpointOf("tuitions-off-phone"));
    expect(delivered()).not.toContain(endpointOf("requests-off-phone"));
  });

  it("tells a Tutor or Guardian whether this very browser is registered under their own account", async () => {
    const database = await getDb();
    await database!.insert(pushSubscriptions).values({ userId: adminAllOn, endpoint: endpointOf("account-phone"), p256dh: "p256dh", auth: "auth" });

    await expect(isPushSubscribedForUser({ userId: adminAllOn, endpoint: endpointOf("account-phone") })).resolves.toEqual({ subscribed: true });
    await expect(isPushSubscribedForUser({ userId: adminTuitionsOff, endpoint: endpointOf("account-phone") })).resolves.toEqual({ subscribed: false });
    await expect(isPushSubscribedForUser({ userId: adminAllOn, endpoint: endpointOf("never-seen") })).resolves.toEqual({ subscribed: false });
  });
});
