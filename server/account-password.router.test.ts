import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({ changeOwnPasswordByUserId: vi.fn() }));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { appRouter } from "./routers";

const base = {
  id: 7, openId: "user-7", email: "person@example.com", name: "Person",
  passwordHash: null, loginMethod: "password", accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};

function createCaller(user: TrpcContext["user"]) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

const change = { currentPassword: "old-password", newPassword: "new-password-1", confirmNewPassword: "new-password-1" };

afterEach(() => vi.clearAllMocks());

describe("account.changePassword", () => {
  it("changes the signed-in account's own password, whichever panel it belongs to", async () => {
    dbMocks.changeOwnPasswordByUserId.mockResolvedValue("changed");
    for (const role of ["guardian", "tutor", "admin"] as const) {
      await expect(createCaller({ ...base, role } as never).account.changePassword(change)).resolves.toEqual({ changed: true });
      expect(dbMocks.changeOwnPasswordByUserId).toHaveBeenLastCalledWith({ userId: 7, role, currentPassword: "old-password", newPassword: "new-password-1" });
    }
  });

  it("says so when the current password is wrong", async () => {
    dbMocks.changeOwnPasswordByUserId.mockResolvedValue("invalid-current-password");
    await expect(createCaller({ ...base, role: "tutor" } as never).account.changePassword(change)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });

  it("refuses new passwords that do not match or are too short, and anyone signed out", async () => {
    await expect(createCaller({ ...base, role: "admin" } as never).account.changePassword({ ...change, confirmNewPassword: "different-1" })).rejects.toThrow();
    await expect(createCaller({ ...base, role: "admin" } as never).account.changePassword({ ...change, newPassword: "short", confirmNewPassword: "short" })).rejects.toThrow();
    await expect(createCaller(null).account.changePassword(change)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    expect(dbMocks.changeOwnPasswordByUserId).not.toHaveBeenCalled();
  });
});
