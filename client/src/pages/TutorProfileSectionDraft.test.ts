import { describe, expect, it } from "vitest";
import { createTutorProfileSectionDraftPayload, tutorProfileSectionDefinitions } from "./TutorProfileSectionDraft";
import { hydrateTutorProfileForm } from "./TutorProfileFormData";

const onboardingFallback = {
  name: "Amina Rahman",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  locationId: "dhaka-uttara",
};

const baseState = hydrateTutorProfileForm(null, onboardingFallback);

describe("Tutor Profile section draft payloads", () => {
  it("defines the five-section A–E profile sequence", () => {
    expect(tutorProfileSectionDefinitions.map(section => section.id)).toEqual(["a", "b", "c", "d", "e"]);
  });

  it("sends the merged tuition, location, fee, and communication fields when saving Section D", () => {
    const payload = createTutorProfileSectionDraftPayload("d", {
      ...baseState,
      headline: "Experienced Mathematics Tutor for SSC Students",
      tuitionType: "home",
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one"],
      preferredTeachingDays: ["monday"],
      preferredTimeSlots: ["evening"],
      feeMin: "5000",
      feeMax: "8000",
      travelDistanceKm: "10",
      communicationPreferences: ["phone"],
    });

    expect(payload).toMatchObject({
      tuitionType: "home",
      currentLocationId: "dhaka-uttara",
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
      communicationPreferences: ["phone"],
    });
    expect(payload).not.toHaveProperty("headline");
    expect(payload).not.toHaveProperty("phone");
    expect(payload).not.toHaveProperty("aboutMe");
  });

  it("keeps the online/nationwide and fee cross-field pairs together in Section D", () => {
    const payload = createTutorProfileSectionDraftPayload("d", {
      ...baseState,
      tuitionType: "online",
      availableNationwide: true,
      feeMin: "4000",
      feeMax: "9000",
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one"],
      preferredTeachingDays: ["monday"],
      preferredTimeSlots: ["evening"],
    });

    expect(payload).toMatchObject({ tuitionType: "online", availableNationwide: true, feeMin: 4000, feeMax: 9000 });
    expect(payload).not.toHaveProperty("aboutMe");
  });

  it("sends only the introduction fields when saving Section E", () => {
    const payload = createTutorProfileSectionDraftPayload("e", {
      ...baseState,
      aboutMe: "I focus on exam technique.",
      teachingApproach: "Weekly practice sets.",
      feeMin: "5000",
      feeMax: "8000",
    });

    expect(payload).toEqual({ aboutMe: "I focus on exam technique.", teachingApproach: "Weekly practice sets." });
    expect(payload).not.toHaveProperty("feeMin");
    expect(payload).not.toHaveProperty("currentLocationId");
  });

  it("isolates private identity fields from family and emergency fields across section saves", () => {
    const payload = createTutorProfileSectionDraftPayload("a", {
      ...baseState,
      privateDetails: {
        presentAddress: "House 7, Uttara",
        permanentAddress: "Rajshahi",
        nationality: "Bangladeshi",
        religion: "Islam",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload.privateDetails).toMatchObject({
      presentAddress: "House 7, Uttara",
      permanentAddress: "Rajshahi",
      nationality: "Bangladeshi",
      religion: "Islam",
    });
    expect(payload.privateDetails).not.toHaveProperty("fatherName");
    expect(payload.privateDetails).not.toHaveProperty("emergencyContactName");
  });

  it("isolates private family fields from identity fields when saving Section B", () => {
    const payload = createTutorProfileSectionDraftPayload("b", {
      ...baseState,
      privateDetails: {
        presentAddress: "House 7, Uttara",
        nationality: "Bangladeshi",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload.privateDetails).toMatchObject({
      fatherName: "Abdul Rahman",
      fatherPhone: "+8801712345678",
      emergencyContactName: "Nusrat Rahman",
    });
    expect(payload.privateDetails).not.toHaveProperty("presentAddress");
    expect(payload.privateDetails).not.toHaveProperty("nationality");
  });

  it("saves only the academic half of Section C for the Education sub-group", () => {
    const payload = createTutorProfileSectionDraftPayload("c-education", {
      ...baseState,
      highestEducation: "Bachelor of Science",
      studyStatus: "graduated",
      graduationYear: "2020",
      primarySubjectIds: ["1", "2"],
      teachingExperienceYears: "4",
      academicAchievement: "Dean's list",
    });

    expect(payload).toMatchObject({ highestEducation: "Bachelor of Science", studyStatus: "graduated", graduationYear: 2020 });
    expect(payload).not.toHaveProperty("primarySubjectIds");
    expect(payload).not.toHaveProperty("teachingExperienceYears");
    expect(payload).not.toHaveProperty("academicAchievement");
  });

  it("saves only the teaching half of Section C for the Teaching expertise sub-group", () => {
    const payload = createTutorProfileSectionDraftPayload("c-teaching", {
      ...baseState,
      highestEducation: "Bachelor of Science",
      studyStatus: "graduated",
      primarySubjectIds: ["1", "2"],
      additionalSubjectIds: ["3"],
      teachingExperienceYears: "4",
      priorTeachingExperience: "Two years of home tuition.",
    });

    expect(payload).toMatchObject({ primarySubjectIds: [1, 2], additionalSubjectIds: [3], teachingExperienceYears: 4, priorTeachingExperience: "Two years of home tuition." });
    expect(payload).not.toHaveProperty("highestEducation");
    expect(payload).not.toHaveProperty("studyStatus");
    expect(payload).not.toHaveProperty("educationRecords");
  });
});
