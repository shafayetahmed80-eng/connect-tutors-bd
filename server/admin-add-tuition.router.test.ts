import { afterEach, describe, expect, it, vi } from "vitest";
import type { TrpcContext } from "./_core/context";

const dbMocks = vi.hoisted(() => ({
  createAdminPostedTuition: vi.fn(),
  updateAdminPostedTuition: vi.fn(),
  getTutorRequestLocation: vi.fn(),
  getNextAdminJobId: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return { ...actual, ...dbMocks };
});

import { ENV } from "./_core/env";
import { JobIdTakenError } from "./db";
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
  learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }] }],
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

  it("writes every curriculum, class and subject asked for, and a one-line summary of them for the tuition's own columns", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 16, live: true });

    await createCaller().admin.createPostedTuition({
      ...homeTuition,
      learningNeeds: [
        { category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }, { classCourse: "Class 5", subjects: ["General Maths", "Bangla"] }] },
        { category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] },
      ],
    });

    const call = dbMocks.createAdminPostedTuition.mock.calls[0][0];
    expect(call.learningNeeds).toEqual([
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }, { classCourse: "Class 5", subjects: ["General Maths", "Bangla"] }] },
      { category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Class 9–10", subjects: ["English"] }] },
    ]);
    expect(call.request).toMatchObject({
      category: "Bangla Medium, English Medium",
      curriculumType: "Cambridge",
      classCourse: "Class 4, Class 5, Class 9–10",
    });
    expect(JSON.parse(call.request.subjects)).toEqual(["General Maths", "Bangla", "English"]);
  });

  it("still takes a tuition sent the way an older page sent it - one category, one class - as a list of one", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 17, live: true });
    const { learningNeeds: _needs, ...rest } = homeTuition;

    await createCaller().admin.createPostedTuition({ ...rest, category: "Bangla Medium", classCourse: "Class 4", subjects: ["General Maths"] } as never);

    const call = dbMocks.createAdminPostedTuition.mock.calls[0][0];
    expect(call.learningNeeds).toEqual([{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 4", subjects: ["General Maths"] }] }]);
    expect(call.request).toMatchObject({ category: "Bangla Medium", classCourse: "Class 4" });
  });

  it("holds a tuition to the Owner's numbers - curricula, classes in all, subjects in a class", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    const need = (category: string, classes: number, subjects = 1) => ({
      category,
      classes: Array.from({ length: classes }, (_, index) => ({ classCourse: `Class ${index + 1}`, subjects: Array.from({ length: subjects }, (_, n) => `Subject ${n + 1}`) })),
    });

    // Three curricula are allowed, a fourth is not.
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, learningNeeds: [need("A", 1), need("B", 1), need("C", 1), need("D", 1)] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 3") });
    // Six classes in all are allowed, seven are not, however they are spread.
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, learningNeeds: [need("A", 4), need("B", 3)] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 6") });
    // Twelve subjects in a class are allowed, thirteen are not.
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, learningNeeds: [need("A", 1, 13)] }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: expect.stringContaining("at most 12") });
    expect(dbMocks.createAdminPostedTuition).not.toHaveBeenCalled();

    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 18, live: true });
    await createCaller().admin.createPostedTuition({ ...homeTuition, learningNeeds: [need("A", 2), need("B", 2), need("C", 2, 12)] });
    expect(dbMocks.createAdminPostedTuition).toHaveBeenCalledTimes(1);
  });

  it("writes the Tutoring Time asked for into the tuition's row, and null when the form sent none", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 19, live: true });

    await createCaller().admin.createPostedTuition({ ...homeTuition, tutoringTime: "16:30" });
    await createCaller().admin.createPostedTuition(homeTuition);

    expect(dbMocks.createAdminPostedTuition.mock.calls[0][0].request).toMatchObject({ tutoringTime: "16:30" });
    // Null rather than a missing key or a blank: the column is nullable and a
    // blank time is no wish at all.
    expect(dbMocks.createAdminPostedTuition.mock.calls[1][0].request).toHaveProperty("tutoringTime", null);
  });

  it("holds the Tutoring Time to the Guardian journey's own rule - a zero-padded 24-hour time or nothing", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 20, live: true });

    for (const tutoringTime of ["4:30 PM", "24:00", "16:60", ""]) {
      await expect(createCaller().admin.createPostedTuition({ ...homeTuition, tutoringTime }), tutoringTime)
        .rejects.toMatchObject({ code: "BAD_REQUEST" });
    }
    expect(dbMocks.createAdminPostedTuition).not.toHaveBeenCalled();

    // The edge of the day on either side is a time.
    await createCaller().admin.createPostedTuition({ ...homeTuition, tutoringTime: "00:00" });
    await createCaller().admin.createPostedTuition({ ...homeTuition, tutoringTime: "23:59" });
    expect(dbMocks.createAdminPostedTuition.mock.calls.map(([call]) => call.request.tutoringTime)).toEqual(["00:00", "23:59"]);
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
    await expect(createCaller().admin.createPostedTuition({
      ...homeTuition,
      learningNeeds: [{ category: "English Medium", classes: [{ classCourse: "Class 4", subjects: ["English"] }] }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // No subject at all in a class.
    await expect(createCaller().admin.createPostedTuition({
      ...homeTuition,
      learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: [] }] }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    // The same curriculum twice.
    await expect(createCaller().admin.createPostedTuition({
      ...homeTuition,
      learningNeeds: [homeTuition.learningNeeds[0], homeTuition.learningNeeds[0]],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createAdminPostedTuition).not.toHaveBeenCalled();
  });

  it("is closed to anyone who is not an Admin", async () => {
    await expect(createCaller(null).admin.createPostedTuition(homeTuition)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect(
      createCaller({ ...adminUser, role: "user", openId: "someone-else" }).admin.createPostedTuition(homeTuition),
    ).rejects.toMatchObject({ code: "FORBIDDEN" });
  });
});

describe("the Job ID a posted tuition takes", () => {
  it("writes the tuition under the Job ID the form sent, or lets the table choose", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockResolvedValue({ id: 201, live: true });

    // A Job ID is its request's id plus 6799.
    await createCaller().admin.createPostedTuition({ ...homeTuition, jobId: "7000" });
    expect(dbMocks.createAdminPostedTuition.mock.calls[0][0].requestId).toBe(201);

    await createCaller().admin.createPostedTuition(homeTuition);
    expect(dbMocks.createAdminPostedTuition.mock.calls[1][0].requestId).toBeUndefined();
  });

  it("refuses a Job ID below the first one, or one that is not a number", async () => {
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, jobId: "6799" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST", message: "A Job ID is a number from 6800 up." });
    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, jobId: "68a1" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.createAdminPostedTuition).not.toHaveBeenCalled();
  });

  it("says which Job ID is already taken", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.createAdminPostedTuition.mockRejectedValue(new JobIdTakenError("6813"));

    await expect(createCaller().admin.createPostedTuition({ ...homeTuition, jobId: "6813" }))
      .rejects.toMatchObject({ code: "CONFLICT", message: "Job ID 6813 is already taken." });
  });

  it("offers the next Job ID to Admins only", async () => {
    dbMocks.getNextAdminJobId.mockResolvedValue({ jobId: "6831" });
    await expect(createCaller().admin.nextJobId()).resolves.toEqual({ jobId: "6831" });
    await expect(createCaller({ ...adminUser, role: "guardian", openId: "someone-else" }).admin.nextJobId())
      .rejects.toMatchObject({ code: "FORBIDDEN" });
  });

  it("is not something an edit can change", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.updateAdminPostedTuition.mockResolvedValue({ updated: true, guardianEdited: false });

    await expect(createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14, jobId: "7000" } as never))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateAdminPostedTuition).not.toHaveBeenCalled();
  });
});

describe("admin.updatePostedTuition", () => {
  it("builds the row the same way posting does, and names which tuition", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.updateAdminPostedTuition.mockResolvedValue({ updated: true, guardianEdited: true });

    await createCaller().admin.updatePostedTuition({
      ...homeTuition,
      requestId: 14,
      learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 6", subjects: ["General Maths"] }, { classCourse: "Class 7", subjects: ["Bangla"] }] }],
      budgetAmount: 8000,
    });

    const call = dbMocks.updateAdminPostedTuition.mock.calls[0][0];
    expect(call).toMatchObject({ adminUserId: 42, requestId: 14 });
    expect(call.request).toMatchObject({ classCourse: "Class 6, Class 7", budgetAmount: 8000, locationText: "Shyamoli, Dhaka" });
    // The whole list goes in again: the rows under the tuition are replaced, not patched.
    expect(call.learningNeeds).toEqual([
      { category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 6", subjects: ["General Maths"] }, { classCourse: "Class 7", subjects: ["Bangla"] }] },
    ]);
    // The name and number travel; whether they are honoured is the server's
    // call, not the caller's - a Guardian who registered owns both.
    expect(call.guardian).toEqual({ name: "Off-site Guardian", phone: "+8801999888777" });
  });

  it("puts the Tutoring Time into the row it rewrites, and null when the edit sends none so an old time is cleared", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });
    dbMocks.updateAdminPostedTuition.mockResolvedValue({ updated: true, guardianEdited: false });

    await createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14, tutoringTime: "16:30" });
    await createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14 });

    expect(dbMocks.updateAdminPostedTuition.mock.calls[0][0].request).toMatchObject({ tutoringTime: "16:30" });
    // The row is rewritten whole, so a missing value would keep the time the
    // tuition had before; null is what takes it off.
    expect(dbMocks.updateAdminPostedTuition.mock.calls[1][0].request).toHaveProperty("tutoringTime", null);
  });

  it("refuses an edit whose Tutoring Time is not HH:mm", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });

    await expect(createCaller().admin.updatePostedTuition({ ...homeTuition, requestId: 14, tutoringTime: "4:30 PM" }))
      .rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(dbMocks.updateAdminPostedTuition).not.toHaveBeenCalled();
  });

  it("holds an edit to the same rules a new tuition is held to", async () => {
    dbMocks.getTutorRequestLocation.mockResolvedValue({ cityLocationId: "dhaka-city", locationId: "dhaka-shyamoli", locationLabel: "Shyamoli, Dhaka" });

    await expect(createCaller().admin.updatePostedTuition({
      ...homeTuition,
      requestId: 14,
      learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 4", subjects: [] }] }],
    })).rejects.toMatchObject({ code: "BAD_REQUEST" });
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
