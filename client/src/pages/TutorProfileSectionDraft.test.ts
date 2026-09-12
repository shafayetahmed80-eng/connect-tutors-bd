import { describe, expect, it } from "vitest";
import { createTutorProfileSectionDraftPayload, getTutorProfileSectionGroups, tutorProfileSectionDefinitions } from "./TutorProfileSectionDraft";
import { hydrateTutorProfileForm } from "./TutorProfileFormData";

const onboardingFallback = {
  name: "Amina Rahman",
  phone: "+8801516131411",
  contactEmail: "amina@example.com",
  gender: "female" as const,
  cityId: "dhaka-city",
  locationId: "dhaka-uttara",
};

const baseState = hydrateTutorProfileForm(null, onboardingFallback);

describe("Tutor Profile section draft payloads", () => {
  it("defines the profile sections (Personal / Education / Tuition / Credential / Introduction)", () => {
    expect(tutorProfileSectionDefinitions.map(section => section.id)).toEqual(["a", "c", "d", "f", "e"]);
    expect(tutorProfileSectionDefinitions[0].label).toBe("Personal Information");
    expect(tutorProfileSectionDefinitions[1].label).toBe("Education");
  });

  it("sends the merged tuition, location, and fee fields when saving Section D", () => {
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
    });

    expect(payload).toMatchObject({
      tuitionType: "home",
      currentCityId: "dhaka-city",
      currentLocationId: "dhaka-uttara",
      feeMin: 5000,
      feeMax: 8000,
      travelDistanceKm: 10,
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

  it("saves only the identity private details for the Identity sub-group of Personal Information", () => {
    const payload = createTutorProfileSectionDraftPayload("a-identity", {
      ...baseState,
      name: "Rahim Uddin",
      privateDetails: {
        nationality: "Bangladeshi",
        religion: "Islam",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload).toMatchObject({ name: "Rahim Uddin" });
    expect(payload.privateDetails).toMatchObject({
      nationality: "Bangladeshi",
      religion: "Islam",
    });
    expect(payload.privateDetails).not.toHaveProperty("fatherName");
    expect(payload.privateDetails).not.toHaveProperty("emergencyContactName");
  });

  it("saves only the family private details for the Family sub-group of Personal Information", () => {
    const payload = createTutorProfileSectionDraftPayload("a-family", {
      ...baseState,
      name: "Rahim Uddin",
      privateDetails: {
        nationality: "Bangladeshi",
        fatherName: "Abdul Rahman",
        fatherPhone: "+8801712345678",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload).not.toHaveProperty("name");
    expect(payload.privateDetails).toMatchObject({
      fatherName: "Abdul Rahman",
      fatherPhone: "+8801712345678",
      emergencyContactName: "Nusrat Rahman",
    });
    expect(payload.privateDetails).not.toHaveProperty("nationality");
  });

  it("saves both identity and family private details when the whole Personal Information section is saved", () => {
    const payload = createTutorProfileSectionDraftPayload("a", {
      ...baseState,
      privateDetails: {
        fatherName: "Abdul Rahman",
        emergencyContactName: "Nusrat Rahman",
      },
    });

    expect(payload.privateDetails).toMatchObject({
      fatherName: "Abdul Rahman",
      emergencyContactName: "Nusrat Rahman",
    });
  });

  it("saves only the academic half of Section C for the Education sub-group", () => {
    const payload = createTutorProfileSectionDraftPayload("c-university", {
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

  it("saves what a Tutor teaches with Section D, since Teaching expertise moved there", () => {
    const payload = createTutorProfileSectionDraftPayload("d", {
      ...baseState,
      highestEducation: "Bachelor of Science",
      studyStatus: "graduated",
      primarySubjectIds: ["1", "2"],
      additionalSubjectIds: ["3"],
      teachingExperienceYears: "4",
      priorTeachingExperience: "Two years of home tuition.",
      tuitionType: "home",
      preferredStudentGender: "both",
      preferredClassSizes: ["one_to_one"],
      preferredTeachingDays: ["monday"],
      preferredTimeSlots: ["evening"],
    });

    expect(payload).toMatchObject({
      primarySubjectIds: [1, 2],
      additionalSubjectIds: [3],
      teachingExperienceYears: 4,
      priorTeachingExperience: "Two years of home tuition.",
      tuitionType: "home",
    });
    // Section C keeps the Tutor's own education, and nothing else.
    expect(payload).not.toHaveProperty("highestEducation");
    expect(payload).not.toHaveProperty("studyStatus");
    expect(payload).not.toHaveProperty("educationRecords");
  });

  it("carries the school rows for the Secondary and Higher Secondary popups", () => {
    // Their only field is a block field, and the draft has no key of that
    // name - the rows live in `educationRecords`. Selecting by field id alone
    // collected nothing, so both popups sent {} and everything typed in them
    // went nowhere.
    const state = {
      ...baseState,
      educationRecords: [{
        qualificationLevel: "SSC" as const,
        instituteName: "Narandia High School",
        degreeExamTitle: "SSC",
        majorGroup: "Science",
        resultGpa: "",
        curriculum: "Bangla Version" as const,
        studyStartYear: "",
        studyEndYear: "",
        currentlyStudying: false,
        instituteIdCardNumber: "",
        passingYear: "2009",
        rollNumber: "",
        registrationNumber: "",
      }],
    };

    for (const target of ["c-secondary", "c-higher-secondary"] as const) {
      const payload = createTutorProfileSectionDraftPayload(target, state);
      expect(Object.keys(payload), target).toEqual(["educationRecords"]);
      expect(payload.educationRecords?.[0], target).toMatchObject({
        qualificationLevel: "SSC",
        instituteName: "Narandia High School",
        passingYear: 2009,
      });
    }
  });

  it("splits Section C into its three stages", () => {
    expect(getTutorProfileSectionGroups("c")?.map(group => group.id)).toEqual(["c-university", "c-higher-secondary", "c-secondary"]);
    expect(getTutorProfileSectionGroups("a")?.map(group => group.id)).toEqual(["a-identity", "a-family"]);
    // Tuition and location now edits one sub-group at a time.
    expect(getTutorProfileSectionGroups("d")?.map(group => group.id)).toEqual(["d-availability", "d-teaching"]);
  });
});
