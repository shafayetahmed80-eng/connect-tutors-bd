import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const studioMocks = vi.hoisted(() => ({ listImageStudioMarks: vi.fn(), setImageStudioMark: vi.fn() }));
vi.mock("./image-studio", async importOriginal => {
  const actual = await importOriginal<typeof import("./image-studio")>();
  return { ...actual, ...studioMocks };
});

import { ADMIN_TWO_FACTOR_COOKIE_NAME } from "@shared/const";
import { createAdminTwoFactorSessionProof } from "./admin-security";
import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const base = {
  email: "admin@example.com", name: "Admin", passwordHash: null, loginMethod: "password", accountStatus: "active" as const,
  createdAt: new Date(), updatedAt: new Date(), lastSignedIn: new Date(),
};
const owner = { ...base, id: 1, role: "admin" as const, openId: ENV.ownerOpenId };
const staff = { ...base, id: 2, role: "admin" as const, openId: "admin-2" };
const guardian = { ...base, id: 3, role: "guardian" as const, openId: "guardian-3" };

function caller(user: TrpcContext["user"]) {
  const cookie = user?.role === "admin"
    ? `${ADMIN_TWO_FACTOR_COOKIE_NAME}=${createAdminTwoFactorSessionProof(user.id, ENV.cookieSecret, Date.now() + 60_000)}`
    : "";
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example", cookie } },
    res: { cookie() {}, clearCookie() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("imageStudio.marks", () => {
  it("gives every Admin the shared marks, and says whether they may change them", async () => {
    studioMocks.listImageStudioMarks.mockResolvedValue([{ kind: "font", itemId: "mina", starred: true, archived: false }]);

    await expect(caller(staff).imageStudio.marks()).resolves.toEqual({ marks: [{ kind: "font", itemId: "mina", starred: true, archived: false }], canEdit: false });
    await expect(caller(owner).imageStudio.marks()).resolves.toMatchObject({ canEdit: true });
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(caller(guardian).imageStudio.marks()).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("imageStudio.setMark", () => {
  it("lets the Project Owner star or archive, recorded as them", async () => {
    studioMocks.setImageStudioMark.mockResolvedValue({ saved: true });

    await expect(caller(owner).imageStudio.setMark({ kind: "font", itemId: "galada", archived: true })).resolves.toEqual({ saved: true });

    expect(studioMocks.setImageStudioMark).toHaveBeenCalledWith({ kind: "font", itemId: "galada", archived: true, adminUserId: 1 });
  });

  it("refuses other Admins, an unknown kind, a malformed id, and a call that changes nothing", async () => {
    await expect(caller(staff).imageStudio.setMark({ kind: "font", itemId: "galada", starred: true })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(owner).imageStudio.setMark({ kind: "colour" as never, itemId: "galada", starred: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(owner).imageStudio.setMark({ kind: "font", itemId: "../etc", starred: true })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect(caller(owner).imageStudio.setMark({ kind: "font", itemId: "galada" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(studioMocks.setImageStudioMark).not.toHaveBeenCalled();
  });
});

describe("uploaded fonts in the router", () => {
  it("lists them for every Admin and lets only the Owner delete one by its upload id", async () => {
    await expect(caller(guardian).imageStudio.uploadedFonts()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(staff).imageStudio.deleteFont({ id: "upload-0123456789ab" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller(owner).imageStudio.deleteFont({ id: "noto-sans-bengali" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });
});
