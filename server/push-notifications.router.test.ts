import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";
import * as db from "./db";
import { appRouter } from "./routers";

const base = {
  email: null, loginPhone: null, passwordHash: null, loginMethod: "password", accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const guardian = { ...base, id: 21, openId: "guardian-21", name: "Rina Akter", role: "guardian" as const };
const tutor = { ...base, id: 31, openId: "tutor-31", name: "Karim", role: "tutor" as const };

function caller(user: TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: {} },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.restoreAllMocks());

describe("pushNotifications", () => {
  it("gives out the server's public key to any signed-in Tutor or Guardian", async () => {
    vi.spyOn(db, "getPushNotificationPublicKey").mockResolvedValue({ publicKey: "test-key" });
    await expect(caller(guardian).pushNotifications.getPublicKey()).resolves.toEqual({ publicKey: "test-key" });
    await expect(caller(tutor).pushNotifications.getPublicKey()).resolves.toEqual({ publicKey: "test-key" });
  });

  it("refuses an anonymous visitor", async () => {
    await expect(caller(null).pushNotifications.getPublicKey()).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("saves a subscription against the signed-in user's own id", async () => {
    const subscribe = vi.spyOn(db, "subscribeToPushNotifications").mockResolvedValue({ subscribed: true });
    await expect(caller(guardian).pushNotifications.subscribe({ endpoint: "https://fcm.example/1", p256dh: "key", auth: "secret" }))
      .resolves.toEqual({ subscribed: true });
    expect(subscribe).toHaveBeenCalledWith({ userId: guardian.id, endpoint: "https://fcm.example/1", p256dh: "key", auth: "secret" });
  });

  it("unsubscribes only against the signed-in user's own id - never a client-supplied one", async () => {
    const unsubscribe = vi.spyOn(db, "unsubscribeFromPushNotifications").mockResolvedValue({ unsubscribed: true });
    await expect(caller(tutor).pushNotifications.unsubscribe({ endpoint: "https://fcm.example/1" })).resolves.toEqual({ unsubscribed: true });
    expect(unsubscribe).toHaveBeenCalledWith({ userId: tutor.id, endpoint: "https://fcm.example/1" });
  });
});
