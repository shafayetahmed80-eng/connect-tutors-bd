import { beforeEach, describe, expect, it, vi } from "vitest";

const fieldConfigDbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  renewTutorPortalSession: vi.fn(),
  getTutorProfileFieldConfig: vi.fn(),
  listTutorProfileFieldOverrides: vi.fn(),
  saveTutorProfileFieldOverrides: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...fieldConfigDbMocks };
});

import { ENV } from "./_core/env";
import { appRouter } from "./routers";
import { defaultTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";

const ownerUser = { id: 1, role: "admin" as const, name: "Owner", openId: ENV.ownerOpenId };
const nonOwnerAdminUser = { id: 2, role: "admin" as const, name: "Admin", openId: "not-the-owner" };

function createTutorCaller(userId = 101) {
  return appRouter.createCaller({
    user: { id: userId, role: "tutor" as const, name: "Test tutor", openId: `test-${userId}` },
    req: { headers: { "x-connect-tutor-portal-session": "test-tutor-portal-proof" } },
    res: { cookie() {}, clearCookie() {} },
  } as any);
}

function createAdminCaller(user: typeof ownerUser | typeof nonOwnerAdminUser | null) {
  return appRouter.createCaller({
    user,
    req: { protocol: "https", headers: { host: "connecttutor.example" } },
    res: { cookie() {}, clearCookie() {} },
  } as any);
}

const validChange = { fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 as const };

describe("tutorProfileFieldConfig router", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    fieldConfigDbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    fieldConfigDbMocks.renewTutorPortalSession.mockResolvedValue(true);
    fieldConfigDbMocks.getTutorProfileFieldConfig.mockResolvedValue(defaultTutorProfileFieldConfig());
    fieldConfigDbMocks.saveTutorProfileFieldOverrides.mockResolvedValue(undefined);
  });

  it("lets a signed-in, active Tutor read the resolved config", async () => {
    const config = await createTutorCaller().tutorProfileFieldConfig.resolved();
    expect(config.byId.get("name")?.section).toBe("a");
    expect(fieldConfigDbMocks.getTutorProfileFieldConfig).toHaveBeenCalledOnce();
  });

  it("refuses an anonymous caller for both Owner-only procedures", async () => {
    const caller = createAdminCaller(null);
    await expect(caller.tutorProfileFieldConfig.listOverrides()).rejects.toBeTruthy();
    await expect(caller.tutorProfileFieldConfig.save([validChange])).rejects.toBeTruthy();
    expect(fieldConfigDbMocks.listTutorProfileFieldOverrides).not.toHaveBeenCalled();
    expect(fieldConfigDbMocks.saveTutorProfileFieldOverrides).not.toHaveBeenCalled();
  });

  it("refuses a non-Owner Admin, matching every other Owner-only Dynamic Section mutation", async () => {
    const caller = createAdminCaller(nonOwnerAdminUser);
    await expect(caller.tutorProfileFieldConfig.listOverrides()).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect(caller.tutorProfileFieldConfig.save([validChange])).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(fieldConfigDbMocks.saveTutorProfileFieldOverrides).not.toHaveBeenCalled();
  });

  it("lets the Owner list overrides and save a batch of valid changes", async () => {
    fieldConfigDbMocks.listTutorProfileFieldOverrides.mockResolvedValue([]);
    const caller = createAdminCaller(ownerUser);

    await expect(caller.tutorProfileFieldConfig.listOverrides()).resolves.toEqual([]);
    await expect(caller.tutorProfileFieldConfig.save([validChange])).resolves.toEqual({ saved: 1 });
    expect(fieldConfigDbMocks.saveTutorProfileFieldOverrides).toHaveBeenCalledWith([validChange]);
  });

  it("rejects a save naming a field the registry does not declare", async () => {
    const caller = createAdminCaller(ownerUser);
    await expect(caller.tutorProfileFieldConfig.save([
      { fieldId: "not-a-real-field", section: null, subGroup: null, sortOrder: null, enabled: null, required: null },
    ])).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fieldConfigDbMocks.saveTutorProfileFieldOverrides).not.toHaveBeenCalled();
  });

  it("rejects a required override on a field whose requiredness is code-owned", async () => {
    // yearSemester's requiredness branches on studyStatus in code - it must
    // never accept a flat required/optional override.
    const caller = createAdminCaller(ownerUser);
    await expect(caller.tutorProfileFieldConfig.save([
      { fieldId: "yearSemester", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ])).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(fieldConfigDbMocks.saveTutorProfileFieldOverrides).not.toHaveBeenCalled();
  });
});
