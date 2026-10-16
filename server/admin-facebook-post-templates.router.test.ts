import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  getFacebookPostTemplates: vi.fn(),
  saveFacebookPostTemplates: vi.fn(),
  resetFacebookPostTemplates: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";

const owner = {
  id: 42,
  openId: ENV.ownerOpenId,
  email: "owner@example.com",
  name: "Project Owner",
  passwordHash: null,
  loginMethod: "oauth",
  role: "admin" as const,
  accountStatus: "active" as const,
  createdAt: new Date(),
  updatedAt: new Date(),
  lastSignedIn: new Date(),
};

const staffAdmin = {
  ...owner,
  id: 43,
  openId: "staff-admin-openid-not-owner",
  name: "Staff Admin",
};

function createCaller(user: TrpcContext["user"] = owner) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "x.example" } },
    res: { cookie() {}, clearCookie() {}, setHeader() {} },
  } as unknown as TrpcContext);
}

afterEach(() => vi.clearAllMocks());

describe("admin facebook post templates", () => {
  it("allows any authenticated admin to read facebook post templates", async () => {
    const templates = {
      bulkHeader: "Urgent tuitions",
      bulkFooter: "Apply now",
      singleHeader: "Single tuition",
      singleFooter: "Details",
    };
    dbMocks.getFacebookPostTemplates.mockResolvedValue(templates);

    // Both Owner and Staff Admin can read
    await expect(createCaller(owner).admin.getFacebookPostTemplates()).resolves.toEqual(templates);
    await expect(createCaller(staffAdmin).admin.getFacebookPostTemplates()).resolves.toEqual(templates);
    expect(dbMocks.getFacebookPostTemplates).toHaveBeenCalledTimes(2);
  });

  it("allows only the Project Owner Admin to save custom templates", async () => {
    const custom = {
      bulkHeader: "Custom bulk header",
      bulkFooter: "Custom bulk footer",
      singleHeader: "Custom single header",
      singleFooter: "Custom single footer",
    };

    // Owner can save
    await expect(createCaller(owner).admin.saveFacebookPostTemplates(custom)).resolves.toBeUndefined();
    expect(dbMocks.saveFacebookPostTemplates).toHaveBeenCalledWith(custom, owner.id);

    // Regular admin is rejected with FORBIDDEN
    await expect(createCaller(staffAdmin).admin.saveFacebookPostTemplates(custom)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });

    // Guardian or Tutor is also rejected
    await expect(createCaller({ ...owner, role: "guardian" as const }).admin.saveFacebookPostTemplates(custom)).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });

  it("allows only the Project Owner Admin to reset templates to default", async () => {
    // Owner can reset
    await expect(createCaller(owner).admin.resetFacebookPostTemplates()).resolves.toBeUndefined();
    expect(dbMocks.resetFacebookPostTemplates).toHaveBeenCalledTimes(1);

    // Staff admin cannot reset
    await expect(createCaller(staffAdmin).admin.resetFacebookPostTemplates()).rejects.toMatchObject({
      code: "FORBIDDEN",
    });
  });
});
