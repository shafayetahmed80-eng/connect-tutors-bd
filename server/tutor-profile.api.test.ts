import { beforeEach, describe, expect, it, vi } from "vitest";

const profileDbMocks = vi.hoisted(() => ({
  getTutorAccountStatusByUserId: vi.fn(),
  getTutorProfileByUserId: vi.fn(),
  saveTutorProfileDraft: vi.fn(),
  submitTutorProfile: vi.fn(),
  searchUniversities: vi.fn(),
  searchFacultyDepartments: vi.fn(),
  searchBangladeshLocations: vi.fn(),
  searchRegistrationCityLocations: vi.fn(),
  renewTutorPortalSession: vi.fn(),
}));

vi.mock("./db", async importOriginal => {
  const actual = await importOriginal<typeof import("./db")>();
  return {
    ...actual,
    getTutorAccountStatusByUserId: profileDbMocks.getTutorAccountStatusByUserId,
    getTutorProfileByUserId: profileDbMocks.getTutorProfileByUserId,
    saveTutorProfileDraft: profileDbMocks.saveTutorProfileDraft,
    submitTutorProfile: profileDbMocks.submitTutorProfile,
    searchUniversities: profileDbMocks.searchUniversities,
    searchFacultyDepartments: profileDbMocks.searchFacultyDepartments,
    searchBangladeshLocations: profileDbMocks.searchBangladeshLocations,
    searchRegistrationCityLocations: profileDbMocks.searchRegistrationCityLocations,
    renewTutorPortalSession: profileDbMocks.renewTutorPortalSession,
  };
});

import { appRouter } from "./routers";

const completeDraftPayload = {
  name: "Amina Rahman",
  gender: "female" as const,
  dateOfBirth: "1999-04-12",
  headline: "Experienced Mathematics Tutor for SSC Students",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  currentLocationId: "bd-dhaka",
  teachingAreaIds: ["bd-dhaka", "bd-mirpur"],
  availableNationwide: true,
  highestEducation: "Honours" as const,
  universityId: 1,
  facultyDepartmentId: 2,
  degreeMajorId: 3,
  degreeExamTitle: "BSc",
  studyStatus: "graduated" as const,
  graduationYear: 2022,
  primarySubjectIds: [1],
  additionalSubjectIds: [2],
  classLevelIds: [1],
  curriculumIds: [1],
  teachingExperienceYears: 4,
  studentTypeIds: [1],
  tuitionType: "both" as const,
  preferredStudentGender: "both" as const,
  preferredClassSizes: ["one_to_one" as const],
  preferredTeachingDays: ["monday" as const, "wednesday" as const],
  preferredTimeSlots: ["evening" as const],
  feeMin: 5000,
  feeMax: 8000,
  travelDistanceKm: 10,
  teachingLanguageIds: [1],
  communicationPreferences: ["whatsapp" as const],
  aboutMe: "I provide structured lessons, exam preparation, and constructive feedback.",
};

const ownerProfile = {
  ...completeDraftPayload,
  tutorId: "tutor-101",
  tutorNumber: 1503,
  registeredAt: new Date("2026-08-01T00:00:00.000Z"),
  profileStatus: "draft" as const,
  accountStatus: "active" as const,
  completionPercentage: 100,
  assignedRequestCount: 0,
  lastUpdatedAt: new Date("2026-08-01T00:00:00.000Z"),
};

function createCaller(role?: "guardian" | "tutor", userId = 101) {
  return appRouter.createCaller({
    user: role ? { id: userId, role, name: "Test user", openId: `test-${userId}` } : null,
    req: {
      headers: role === "tutor" ? { "x-connect-tutor-portal-session": "test-tutor-portal-proof" } : {},
    },
    res: { cookie() {}, clearCookie() {} },
  } as any);
}

describe("TP-05 owner Tutor Profile procedures", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    profileDbMocks.getTutorAccountStatusByUserId.mockResolvedValue("active");
    profileDbMocks.renewTutorPortalSession.mockResolvedValue(true);
    profileDbMocks.getTutorProfileByUserId.mockResolvedValue(ownerProfile);
    profileDbMocks.saveTutorProfileDraft.mockResolvedValue(ownerProfile);
    profileDbMocks.submitTutorProfile.mockResolvedValue({
      ...ownerProfile,
      profileStatus: "pending",
      completionPercentage: 100,
    });
    profileDbMocks.searchUniversities.mockResolvedValue([{ id: 1, name: "University of Dhaka" }]);
    profileDbMocks.searchFacultyDepartments.mockResolvedValue([{ id: 2, name: "Mathematics" }]);
    profileDbMocks.searchBangladeshLocations.mockResolvedValue([{ id: "dhaka", label: "Dhaka", type: "city" }]);
    profileDbMocks.searchRegistrationCityLocations.mockResolvedValue([
      { id: "mirpur", label: "Mirpur", type: "thana", parentId: "dhaka" },
      { id: "mirpur-10", label: "Mirpur-10 — Mirpur", type: "area", parentId: "mirpur" },
    ]);
  });

  it("returns the authenticated Tutor's complete private registration-backed profile", async () => {
    await expect(createCaller("tutor", 101).tutor.getMyProfile()).resolves.toMatchObject({
      name: "Amina Rahman",
      phone: "+8801516131411",
      contactEmail: "amina@example.com",
      currentLocationId: "bd-dhaka",
      tutorNumber: 1503,
      profileStatus: "draft",
      accountStatus: "active",
    });
    expect(profileDbMocks.getTutorProfileByUserId).toHaveBeenCalledWith(101);
  });

  it("rejects suspended Tutor accounts before private profile data is returned", async () => {
    profileDbMocks.getTutorAccountStatusByUserId.mockResolvedValue("suspended");

    await expect(createCaller("tutor", 101).tutor.getMyProfile()).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(profileDbMocks.getTutorProfileByUserId).not.toHaveBeenCalled();
  });

  it("rejects unauthenticated and Guardian callers before a draft mutation runs", async () => {
    await expect((createCaller().tutor as any).saveProfileDraft(completeDraftPayload)).rejects.toMatchObject({ code: "UNAUTHORIZED" });
    await expect((createCaller("guardian").tutor as any).saveProfileDraft(completeDraftPayload)).rejects.toMatchObject({ code: "FORBIDDEN" });
    expect(profileDbMocks.saveTutorProfileDraft).not.toHaveBeenCalled();
  });

  it("saves only the authenticated Tutor's validated draft and returns recalculated completion", async () => {
    await expect((createCaller("tutor", 101).tutor as any).saveProfileDraft(completeDraftPayload)).resolves.toMatchObject({
      completionPercentage: 100,
      profileStatus: "draft",
      contactEmail: "amina@example.com",
    });
    expect(profileDbMocks.saveTutorProfileDraft).toHaveBeenCalledWith(101, completeDraftPayload);
  });

  it("saves a partial draft when unselected optional selector arrays are omitted", async () => {
    const partialDraft = {
      name: completeDraftPayload.name,
      gender: completeDraftPayload.gender,
      phone: completeDraftPayload.phone,
      contactEmail: completeDraftPayload.contactEmail,
      availableNationwide: true,
    };

    await expect((createCaller("tutor", 101).tutor as any).saveProfileDraft(partialDraft)).resolves.toMatchObject({
      profileStatus: "draft",
    });
    expect(profileDbMocks.saveTutorProfileDraft).toHaveBeenCalledWith(101, partialDraft);
  });

  it("rejects structurally invalid draft fields and client-supplied system or owner fields", async () => {
    const caller = createCaller("tutor", 101);

    await expect((caller.tutor as any).saveProfileDraft({ ...completeDraftPayload, phone: "invalid" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    await expect((caller.tutor as any).saveProfileDraft({ ...completeDraftPayload, profileStatus: "approved", tutorId: "tutor-202", userId: 202, profilePhotoKey: "tutors/202/untrusted.png" })).rejects.toMatchObject({ code: "BAD_REQUEST" });
    expect(profileDbMocks.saveTutorProfileDraft).not.toHaveBeenCalled();
  });

  it("submits only the authenticated Tutor's persisted profile and reports pending review", async () => {
    await expect((createCaller("tutor", 101).tutor as any).submitProfile()).resolves.toMatchObject({
      profileStatus: "pending",
      completionPercentage: 100,
    });
    expect(profileDbMocks.submitTutorProfile).toHaveBeenCalledWith(101);
  });

  it("does not transition an incomplete persisted profile to pending review", async () => {
    profileDbMocks.submitTutorProfile.mockRejectedValue(
      new (await import("./db")).TutorProfileValidationError([
        { path: ["headline"], message: "This field is required before profile submission." },
      ]),
    );

    await expect((createCaller("tutor", 101).tutor as any).submitProfile()).rejects.toMatchObject({
      code: "BAD_REQUEST",
      message: expect.stringContaining("required before profile submission"),
    });
  });

  it("rejects a repeat submission when the stored profile is already under review", async () => {
    profileDbMocks.submitTutorProfile.mockRejectedValue(
      new (await import("./db")).TutorProfileStateError(
        "Only a draft or changes-requested Tutor Profile can be submitted for review.",
      ),
    );

    await expect((createCaller("tutor", 101).tutor as any).submitProfile()).rejects.toMatchObject({
      code: "CONFLICT",
      message: expect.stringContaining("Only a draft"),
    });
  });

  it("limits catalog searches to active Tutors and forwards parent-scoped, bounded searches", async () => {
    const tutorCaller = createCaller("tutor", 101);

    await expect((tutorCaller.catalog as any).searchUniversities({ query: "  Dhaka  ", limit: 20 })).resolves.toEqual([
      { id: 1, name: "University of Dhaka" },
    ]);
    await expect((tutorCaller.catalog as any).searchFacultyDepartments({ query: "Math", limit: 10 })).resolves.toEqual([
      { id: 2, name: "Mathematics" },
    ]);
    await expect((tutorCaller.catalog as any).searchBangladeshLocations({ query: "Dha", types: ["city"], limit: 5 })).resolves.toEqual([
      { id: "dhaka", label: "Dhaka", type: "city" },
    ]);
    expect(profileDbMocks.searchUniversities).toHaveBeenCalledWith({ query: "Dhaka", limit: 20 });
    expect(profileDbMocks.searchFacultyDepartments).toHaveBeenCalledWith({ query: "Math", limit: 10 });
    expect(profileDbMocks.searchBangladeshLocations).toHaveBeenCalledWith({ query: "Dha", types: ["city"], limit: 5 });

    await expect((createCaller("guardian").catalog as any).searchUniversities({ query: "Dhaka" })).rejects.toMatchObject({ code: "FORBIDDEN" });
    await expect((tutorCaller.catalog as any).searchUniversities({ query: "x", limit: 51 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("forwards bounded persisted Bangladesh hierarchy identifiers for active Tutor hydration", async () => {
    const tutorCaller = createCaller("tutor", 101);
    const ids = ["dhaka-thana-uttara", "dhaka-uttara-sector-1"];

    await expect((tutorCaller.catalog as any).searchBangladeshLocations({
      query: "",
      types: ["thana", "subdivision"],
      ids,
      limit: 5,
    })).resolves.toEqual([{ id: "dhaka", label: "Dhaka", type: "city" }]);

    expect(profileDbMocks.searchBangladeshLocations).toHaveBeenCalledWith({
      query: "",
      types: ["thana", "subdivision"],
      ids,
      limit: 5,
    });
  });

  it("publicly exposes combined parent and sub-area options only for the requested registration City", async () => {
    await expect((createCaller().catalog as any).searchRegistrationLocations({ cityId: "dhaka", query: "mirpur", limit: 30 })).resolves.toEqual([
      { id: "mirpur", label: "Mirpur", type: "thana", parentId: "dhaka" },
      { id: "mirpur-10", label: "Mirpur-10 — Mirpur", type: "area", parentId: "mirpur" },
    ]);
    expect(profileDbMocks.searchRegistrationCityLocations).toHaveBeenCalledWith({ cityId: "dhaka", query: "mirpur", limit: 30 });
    await expect((createCaller().catalog as any).searchRegistrationLocations({ cityId: "dhaka", query: "", limit: 301 })).rejects.toMatchObject({ code: "BAD_REQUEST" });
  });

  it("exposes only structured draft saving and review submission as Tutor Profile write routes", () => {
    const procedures = (appRouter as any)._def.procedures as Record<string, unknown>;

    expect(procedures["tutor.upsertProfile"]).toBeUndefined();
    expect(procedures["tutor.saveProfileDraft"]).toBeDefined();
    expect(procedures["tutor.submitProfile"]).toBeDefined();
  });
});
