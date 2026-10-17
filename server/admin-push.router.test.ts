import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ isAdminPushSubscribed: vi.fn(), isPushSubscribedForUser: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const adminUser = {
  id: 42, openId: ENV.ownerOpenId, email: "owner@example.com", name: "Owner",
  passwordHash: null, loginMethod: "oauth", role: "admin" as const, accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"] = adminUser) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("admin.isPushSubscribed", () => {
  it("asks about the signed-in Admin and the browser's own endpoint", async () => {
    dbMocks.isAdminPushSubscribed.mockResolvedValue({ subscribed: true });

    await expect(createCaller().admin.isPushSubscribed({ endpoint: "  https://push.example/abc  " })).resolves.toEqual({ subscribed: true });

    expect(dbMocks.isAdminPushSubscribed).toHaveBeenCalledWith(42, "https://push.example/abc");
  });

  it("refuses an empty endpoint and anyone who is not an Admin", async () => {
    await expect(createCaller().admin.isPushSubscribed({ endpoint: "   " })).rejects.toThrow();
    await expect(createCaller({ ...adminUser, role: "guardian" as const }).admin.isPushSubscribed({ endpoint: "https://push.example/abc" }))
      .rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.isAdminPushSubscribed).not.toHaveBeenCalled();
  });
});

describe("pushNotifications.isSubscribed", () => {
  it("asks about the signed-in account and the browser's own endpoint, for a Tutor or Guardian alike", async () => {
    dbMocks.isPushSubscribedForUser.mockResolvedValue({ subscribed: false });

    await expect(createCaller({ ...adminUser, id: 77, role: "guardian" as const }).pushNotifications.isSubscribed({ endpoint: " https://push.example/abc " })).resolves.toEqual({ subscribed: false });

    expect(dbMocks.isPushSubscribedForUser).toHaveBeenCalledWith({ userId: 77, endpoint: "https://push.example/abc" });
  });

  it("refuses anyone who is not signed in", async () => {
    await expect(createCaller(null).pushNotifications.isSubscribed({ endpoint: "https://push.example/abc" })).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.isPushSubscribedForUser).not.toHaveBeenCalled();
  });
});
