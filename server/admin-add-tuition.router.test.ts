import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createAdminPostedTuition: vi.fn(),
  updateAdminPostedTuition: vi.fn(),
  getTutorRequestLocation: vi.fn(),
}));

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

const homeTuition = {
  guardianName: "Off-site Guardian",
  guardianPhone: "01999888777",
  tuitionType: "home" as const,
  tuitionCityLocationId: "dhaka-city",
  tuitionLocationId: "dhaka-shyamoli",
  studentCount: 1,
  category: "Bangla Medium",
  classCourse: "Class 4",
  subjects: ["General Maths"],
  daysPerWeek: 3,
  preferredGender: "female" as const,
  budgetAmount: 6500,
  heardAboutUs: "others" as const,
};

afterEach(() => vi.clearAllMocks());

describe("admin.createPostedTuition", () => {
  it("takes the Guardian's own City from the tuition, and normalizes the number", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 14, live: true });

    const result = await createCaller().admin.createPostedTuition(homeTuition);

    expect(result).toEqual({ id: 14, live: true });
    const call = dbMocks.createAdminPostedTuition.mock.calls[0][0];
    expect(call.adminUserId).toBe(42);
    // A local number becomes the canonical one, so posting twice for the same
    // Guardian written two ways still finds one account.
    expect(call.guardian).toMatchObject({
      name: "Off-site Guardian",
      phone: "+8801999888777",
      cityLocationId: "dhaka-city",
      locationId: "dhaka-shyamoli",
    });
    expect(call.request).toMatchObject({
      tuitionType: "home",
      studentCount: 1,
      budgetAmount: 6500,
      locationText: "Shyamoli, Dhaka",
      contactConsent: "not_required",
    });
  });

  it("asks for the Guardian's own City when the tuition is online and has none", async () => {
    const { tuitionCityLocationId: _city, tuitionLocationId: _location, ...rest } = homeTuition;
    await expect(createCaller().admin.createPostedTuition({ ...rest, tuitionType: "online" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });

    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 15, live: true });
    await createCaller().admin.createPostedTuition({
      ...rest, tuitionType: "online",
      guardianCityLocationId: "dhaka-city", guardianLocationId: "dhaka-shyamoli",
    });
    const call = dbMocks.createAdminPostedTuition.mock.calls[0][0];
    expect(call.guardian.cityLocationId).toBe("dhaka-city");
    expect(call.request).toMatchObject({ tuitionType: "online", tuitionLocationId: null, locationText: "Online tuition" });
  });

  it("holds an Admin-posted tuition to the same rules a Guardian's own is held to", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });

    // English Medium without its Curriculum Type - the journey's own rule.
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, category: "English Medium" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    // No subject at all.
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, subjects: [] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createAdminPostedTuition).not.toHaveBeenCalled();
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.createPostedTuition(homeTuition)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      createCaller({ ...adminUser, role: "user", openId: "someone-else" }).admin.createPostedTuition(homeTuition),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("admin.updatePostedTuition", () => {
  it("builds the row the same way posting does, and names which tuition", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.updateAdminPostedTuition.mockResolvedValue({ updated: true, guardianEdited: true });

    await createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14, classCourse: "Class 6", budgetAmount: 8000 });

    const call = dbMocks.updateAdminPostedTuition.mock.calls[0][0];
    expect(call).toMatchObject({ adminUserId: 42, requestId: 14 });
    expect(call.request).toMatchObject({ classCourse: "Class 6", budgetAmount: 8000, locationText: "Shyamoli, Dhaka" });
    // The name and number travel; whether they are honoured is the server's
    // call, not the caller's - a Guardian who registered owns both.
    expect(call.guardian).toEqual({ name: "Off-site Guardian", phone: "+8801999888777" });
  });

  it("holds an edit to the same rules a new tuition is held to", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });

    await expect(createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14, subjects: [] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateAdminPostedTuition).not.toHaveBeenCalled();
  });

  it("is a 404 for a tuition that is gone", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.updateAdminPostedTuition.mockResolvedValue({ updated: false, reason: "REQUEST_NOT_FOUND" });
    await expect(createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 9999 }))
      .rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.updatePostedTuition({ ...homeTuition, requestId: 14 }))
      .rejects.toMatchObject({ code: "UNAUTHORIZED" });
  });
});
