import { describe, expect, it } from "vitest";
import { createProfileDraftPayload, getProfileDraftFeedback, hydrateTutorProfileForm } from "./TutorProfileFormData";
import { getTutorProfileCompletionSummary, getTutorProfileSubmissionErrors, tutorProfileCopy } from "./TutorProfileUx";

const onboardingFallback = {
  name: "Browser-only name",
  phone: "+8801911111111",
  contactEmail: "browser@example.com",
  gender: "male" as const,
  locationId: "old-location",
};

const serverProfile = {
  name: "Amina Rahman",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  currentLocationId: "dhaka-uttara",
  tutorNumber: 1503,
  registeredAt: new Date("2019-07-03T00:00:00.000Z"),
  profileStatus: "draft" as const,
  accountStatus: "active" as const,
  completionPercentage: 22,
  assignedRequestCount: 0,
  teachingAreaIds: ["dhaka-uttara"],
  availableNationwide: false,
  universityId: null,
  facultyDepartmentId: null,
  degreeMajorId: null,
  profilePhotoUrl: null,
  dateOfBirth: null,
  headline: null,
  highestEducation: null,
  studyStatus: null,
  graduationYear: null,
};

/** `serverProfile` carries no selections, so the preview needs them spelled out. */
const emptySelections = {
  primarySubjectIds: [] as string[],
  classLevelIds: [] as string[],
  curriculumIds: [] as string[],
  teachingExperienceYears: "",
  studentTypeIds: [] as string[],
};

describe("Tutor Profile form hydration", () => {
  it("uses the persistent Tutor profile over an onboarding browser fallback after it arrives", () => {
    expect(hydrateTutorProfileForm(serverProfile, onboardingFallback)).toMatchObject({
      name: "Amina Rahman",
      phone: "+8801516131411",
      contactEmail: "amina@example.com",
      gender: "female",
      currentLocationId: "dhaka-uttara",
      tutorNumber: 1503,
      teachingAreaIds: ["dhaka-uttara"],
    });
  });

  it("uses the onboarding fallback only while no persisted server profile is available", () => {
    expect(hydrateTutorProfileForm(null, onboardingFallback)).toMatchObject({
      name: "Browser-only name",
      phone: "+8801911111111",
      contactEmail: "browser@example.com",
      currentLocationId: "old-location",
    });
  });

  it("builds a TP-05 draft payload without system fields, Tutor ownership fields, or raw photo storage keys", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);
    const payload = createProfileDraftPayload({
      ...state,
      dateOfBirth: "1999-04-12",
      headline: "Experienced Mathematics Tutor for SSC Students",
      universityId: "1",
      facultyDepartmentId: "3",
    });

    expect(payload).toMatchObject({
      name: "Amina Rahman",
      currentLocationId: "dhaka-uttara",
      universityId: 1,
      facultyDepartmentId: 3,
    });
    expect(payload).not.toHaveProperty("tutorId");
    expect(payload).not.toHaveProperty("userId");
    expect(payload).not.toHaveProperty("profileStatus");
    expect(payload).not.toHaveProperty("profilePhotoKey");
  });

  it("omits unselected optional selector arrays so a partial draft is accepted instead of failing minimum-selection validation", () => {
    const state = {
      ...hydrateTutorProfileForm(serverProfile, onboardingFallback),
      teachingAreaIds: [],
      preferredClassSizes: [],
      preferredTeachingDays: [],
      preferredTimeSlots: [],
      teachingLanguageIds: [],
      communicationPreferences: [],
    };

    const payload = createProfileDraftPayload(state);

    expect(payload).not.toHaveProperty("teachingAreaIds");
    expect(payload).not.toHaveProperty("preferredClassSizes");
    expect(payload).not.toHaveProperty("preferredTeachingDays");
    expect(payload).not.toHaveProperty("preferredTimeSlots");
    expect(payload).not.toHaveProperty("teachingLanguageIds");
    expect(payload).not.toHaveProperty("communicationPreferences");
  });

  it("hydrates persisted Sections D–G preferences and optional biography fields from the private owner DTO", () => {
    const hydrated = hydrateTutorProfileForm({
      ...serverProfile,
      tuitionType: "both",
      preferredStudentGender: "female",
      preferredClassSizes: ["one_to_one", "small_group"],
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
      teachingLanguageIds: [1, 2],
      communicationPreferences: ["whatsapp", "platform_message"],
      aboutMe: "I help students build confidence through structured practice.",
      teachingApproach: "I begin with concepts and reinforce them through examples.",
      whyChooseMe: "Clear feedback and patient, focused support.",
      additionalNotes: "Available for online sessions after school.",
    } as any, onboardingFallback) as any;

    expect(hydrated).toMatchObject({
      tuitionType: "both",
      preferredStudentGender: "female",
      preferredClassSizes: ["one_to_one", "small_group"],
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
      teachingLanguageIds: ["1", "2"],
      communicationPreferences: ["whatsapp", "platform_message"],
      aboutMe: "I help students build confidence through structured practice.",
    });
  });

  it("normalizes controlled Sections D–G values for a draft without emitting system-managed fields", () => {
    const state = {
      ...hydrateTutorProfileForm(serverProfile, onboardingFallback),
      tuitionType: "both",
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one", "small_group"],
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
      teachingLanguageIds: ["1", "2"],
      communicationPreferences: ["whatsapp", "platform_message"],
      aboutMe: "  Structured, supportive mathematics tuition.  ",
      teachingApproach: "  Concept first, then guided practice.  ",
      whyChooseMe: "  Clear feedback for every learner.  ",
      additionalNotes: "   ",
    } as any;

    const payload = createProfileDraftPayload(state);

    expect(payload).toMatchObject({
      tuitionType: "both",
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one", "small_group"],
      preferredTeachingDays: ["monday", "wednesday"],
      preferredTimeSlots: ["evening"],
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
      teachingLanguageIds: [1, 2],
      communicationPreferences: ["whatsapp", "platform_message"],
      aboutMe: "Structured, supportive mathematics tuition.",
      teachingApproach: "Concept first, then guided practice.",
      whyChooseMe: "Clear feedback for every learner.",
      additionalNotes: undefined,
    });
    expect(payload).not.toHaveProperty("profileStatus");
    expect(payload).not.toHaveProperty("profilePhotoKey");
  });

  it("provides a clear local fee-range message before an invalid draft is sent", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getProfileDraftFeedback({ ...state, feeMin: "8000", feeMax: "7000" })).toBe(
      "Maximum monthly fee must be greater than or equal to the minimum fee.",
    );
  });

  it("provides English required-field guidance before a Tutor submits an incomplete profile", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getTutorProfileSubmissionErrors({
      ...state,
      profilePhotoUrl: null,
      primarySubjectIds: [],
      classLevelIds: [],
      curriculumIds: [],
      teachingExperienceYears: "",
      studentTypeIds: [],
    })).toMatchObject({
      profilePhotoUrl: "Add a profile photo.",
      dateOfBirth: "Enter your date of birth.",
      headline: "Enter a headline with at least 10 characters.",
      universityId: "Select your institute.",
      primarySubjectIds: "Select at least one primary subject.",
      feeMin: "Enter a minimum monthly fee.",
    });
  });

  it("uses concise English-only field labels", () => {
    expect(tutorProfileCopy.fields.university).toBe("Institute");
    expect(tutorProfileCopy.fields.primarySubjects).toBe("Primary Subjects");
  });

  it("summarizes unfinished required profile fields for a persistent completion guide", () => {
    const state = hydrateTutorProfileForm(serverProfile, onboardingFallback);

    expect(getTutorProfileCompletionSummary({
      ...state,
      profilePhotoUrl: null,
      primarySubjectIds: [],
      classLevelIds: [],
      curriculumIds: [],
      teachingExperienceYears: "",
      studentTypeIds: [],
    })).toMatchObject({
      completed: false,
      missingCount: expect.any(Number),
      completedCount: expect.any(Number),
      totalRequired: expect.any(Number),
      completionPercentage: expect.any(Number),
      message: expect.stringContaining("required details remaining"),
      firstMissingLabel: "Profile Photo",
    });
  });

  it("asks only for the study-timeline field that matches the chosen study status", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };

    const studying = getTutorProfileSubmissionErrors({ ...state, studyStatus: "studying", yearSemester: "", graduationYear: "" });
    expect(studying.yearSemester).toBe("Enter your current year or semester.");
    expect(studying.graduationYear).toBeUndefined();

    const graduated = getTutorProfileSubmissionErrors({ ...state, studyStatus: "graduated", yearSemester: "", graduationYear: "" });
    expect(graduated.graduationYear).toBe("Enter your graduation year.");
    expect(graduated.yearSemester).toBeUndefined();

    // Filling the matching field clears it; the other one is never asked for.
    expect(getTutorProfileSubmissionErrors({ ...state, studyStatus: "studying", yearSemester: "2nd Year/Semester" })).not.toHaveProperty("yearSemester");
    expect(getTutorProfileSubmissionErrors({ ...state, studyStatus: "graduated", graduationYear: "2022" })).not.toHaveProperty("graduationYear");
  });

  it("counts the study timeline as one required detail only once a study status is chosen", () => {
    const state = { ...hydrateTutorProfileForm(serverProfile, onboardingFallback), ...emptySelections };

    const withoutStatus = getTutorProfileCompletionSummary({ ...state, studyStatus: "" });
    const withStatus = getTutorProfileCompletionSummary({ ...state, studyStatus: "studying" });

    expect(withStatus.totalRequired).toBe(withoutStatus.totalRequired + 1);
  });
});
