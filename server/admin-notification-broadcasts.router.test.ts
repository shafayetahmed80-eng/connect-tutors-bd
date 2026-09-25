import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ notifyGuardianDirectory: vi.fn(), listNotificationBroadcasts: vi.fn() }));

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

describe("admin.notifyGuardianDirectory", () => {
  it("sends the trimmed title and message with the directory's own filters", async () => {
    dbMocks.notifyGuardianDirectory.mockResolvedValue({ sent: 5 });

    const result = await createCaller().admin.notifyGuardianDirectory({
      verification: "verified", title: "  Platform maintenance  ", message: "  Paused tonight.  ",
    });

    expect(result).toEqual({ sent: 5 });
    expect(dbMocks.notifyGuardianDirectory).toHaveBeenCalledWith({
      filters: { query: "", verification: "verified" },
      guardianUserIds: undefined,
      title: "Platform maintenance",
      message: "Paused tonight.",
      adminUserId: 42,
    });
  });

  it("sends to a hand-picked set of Guardians instead, when given", async () => {
    dbMocks.notifyGuardianDirectory.mockResolvedValue({ sent: 2 });

    const result = await createCaller().admin.notifyGuardianDirectory({ guardianUserIds: [11, 22], title: "Hi", message: "Hello" });

    expect(result).toEqual({ sent: 2 });
    expect(dbMocks.notifyGuardianDirectory).toHaveBeenCalledWith(expect.objectContaining({ guardianUserIds: [11, 22] }));
  });

  it("refuses an empty title or message", async () => {
    await expect(createCaller().admin.notifyGuardianDirectory({ title: "", message: "Something" })).rejects.toThrow();
    await expect(createCaller().admin.notifyGuardianDirectory({ title: "Something", message: "" })).rejects.toThrow();
    expect(dbMocks.notifyGuardianDirectory).not.toHaveBeenCalled();
  });

  it("is an Admin's to send", async () => {
    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.notifyGuardianDirectory({ title: "Hi", message: "Hi" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.notifyGuardianDirectory).not.toHaveBeenCalled();
  });
});

describe("admin.listNotificationBroadcasts", () => {
  it("defaults to every audience, no search, first page", async () => {
    dbMocks.listNotificationBroadcasts.mockResolvedValue({ items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 });

    await createCaller().admin.listNotificationBroadcasts({});
    expect(dbMocks.listNotificationBroadcasts).toHaveBeenCalledWith({ audience: "all", query: "", page: 1, pageSize: 20 });

    await createCaller().admin.listNotificationBroadcasts({ audience: "guardian", query: "maintenance", page: 2 });
    expect(dbMocks.listNotificationBroadcasts).toHaveBeenLastCalledWith({ audience: "guardian", query: "maintenance", page: 2, pageSize: 20 });
  });

  it("is an Admin's to read", async () => {
    const guardian = { ...adminUser, role: "guardian" as const };
    await expect(createCaller(guardian).admin.listNotificationBroadcasts({})).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(dbMocks.listNotificationBroadcasts).not.toHaveBeenCalled();
  });
});
