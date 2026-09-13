import { describe, expect, it } from "vitest";
import {
  defaultTutorProfileFieldConfig,
  indexResolvedFields,
  resolveTutorProfileFieldConfig,
  tutorProfileFieldRegistry,
  guardianPrivateFieldIds,
} from "@shared/tutor-profile-field-registry";
import {
  guardianCatalogIds,
  guardianReadableFields,
  projectTutorProfileForGuardian,
  type GuardianProfileSource,
} from "./guardian-tutor-profile";

/** Every value a Guardian must never receive carries the word SECRET. */
function fullProfile(): GuardianProfileSource {
  return {
    tutorId: "tutor-175",
    tutorNumber: 777,
    name: "Tania Sultana",
    profilePhotoUrl: "/manus-storage/photo.png",
    gender: "female",
    dateOfBirth: "1999-04-02",
    headline: "Physics made simple",
    phone: "SECRET-PHONE",
    contactEmail: "SECRET-EMAIL",
    highestEducation: "Honours",
    universityId: 7,
    facultyDepartmentId: 12,
    degreeExamTitle: "BSc",
    resultGpa: "3.8",
    deptId: "D-44",
    studyStatus: "studying",
    yearSemester: "3rd year",
    primarySubjectIds: [1, 2],
    additionalSubjectIds: [3],
    classLevelIds: [4],
    curriculumIds: [5],
    teachingExperienceYears: 5,
    tuitionType: "home",
    availableNationwide: true,
    preferredStudentGender: "both",
    preferredClassSizes: ["one_to_one"],
    preferredTeachingDays: ["monday"],
    preferredTimeSlots: ["evening"],
    currentCityId: "dhaka",
    currentLocationId: "gulshan",
    teachingAreaIds: ["banani"],
    feeMin: 4000,
    feeMax: 8000,
    travelDistanceKm: 5,
    aboutMe: "I teach.",
    teachingApproach: "Patiently.",
    whyChooseMe: "Results.",
    additionalNotes: "SECRET-NOTES-FOR-REVIEWERS",
    privateDetails: {
      nationality: "Bangladeshi",
      religion: "Islam",
      additionalPhone: "SECRET-ADDITIONAL-PHONE",
      socialProfileLinks: "SECRET-SOCIAL",
      fatherName: "SECRET-FATHER",
      fatherPhone: "SECRET-FATHER-PHONE",
      motherName: "SECRET-MOTHER",
      motherPhone: "SECRET-MOTHER-PHONE",
      emergencyContactName: "SECRET-EMERGENCY",
      emergencyContactRelation: "SECRET-RELATION",
      emergencyContactPhone: "SECRET-EMERGENCY-PHONE",
      emergencyContactAddress: "SECRET-EMERGENCY-ADDRESS",
      presentAddress: "SECRET-PRESENT-ADDRESS",
    },
    educationRecords: [
      { qualificationLevel: "SSC", instituteName: "Motijheel Model School", majorGroup: "Science", passingYear: 2015, rollNumber: "R-1", registrationNumber: "G-1" },
      { qualificationLevel: "HSC", instituteName: "Notre Dame College", majorGroup: "Science", passingYear: 2017, rollNumber: "R-2", registrationNumber: "G-2" },
      { qualificationLevel: "Masters", instituteName: "Jahangirnagar University", degreeExamTitle: "MSc", instituteIdCardNumber: "ID-9" },
    ],
    universityIdDocumentStatus: "SECRET-DOCUMENT-STATUS",
    uploadedSupportingDocuments: ["SECRET-NID"],
    moderationNote: "SECRET-MODERATION",
    completionPercentage: 88,
    accountStatus: "SECRET-ACCOUNT",
  };
}

/** Every field an Admin could possibly switch on for Guardians, switched on. */
function everythingShown() {
  return resolveTutorProfileFieldConfig(tutorProfileFieldRegistry.map(field => ({
    fieldId: field.id, section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 1,
  })));
}

describe("the floor under the Admin's choice", () => {
  it("never sends a private value, even with every Guardian toggle switched on", () => {
    const projected = projectTutorProfileForGuardian(fullProfile(), everythingShown());
    expect(JSON.stringify(projected)).not.toContain("SECRET");
  });

  it("holds even against a config that claims the private fields are visible", () => {
    // A forged or buggy config must not be enough: the floor is checked again here.
    const forged = indexResolvedFields(defaultTutorProfileFieldConfig().all.map(field => ({ ...field, guardianVisible: true })));
    const projected = projectTutorProfileForGuardian(fullProfile(), forged);
    expect(JSON.stringify(projected)).not.toContain("SECRET");
    expect(guardianReadableFields(forged).some(field => guardianPrivateFieldIds.has(field.id))).toBe(false);
  });
});

describe("what a Guardian reads by default", () => {
  const projected = projectTutorProfileForGuardian(fullProfile(), defaultTutorProfileFieldConfig());

  it("sends the teaching profile", () => {
    expect(projected).toMatchObject({
      tutorId: "tutor-175", tutorNumber: 777, name: "Tania Sultana", headline: "Physics made simple", universityId: 7,
      primarySubjectIds: [1, 2], teachingAreaIds: ["banani"], aboutMe: "I teach.", availableNationwide: true,
    });
  });

  it("holds back personal and identifying details, and the fee range, until an Admin shows them", () => {
    for (const key of ["dateOfBirth", "deptId", "feeMin", "feeMax"]) expect(projected, key).not.toHaveProperty(key);
    expect(projected.privateDetails).toEqual({});
    const hsc = (projected.educationRecords as Array<Record<string, unknown>>).find(record => record.qualificationLevel === "HSC");
    expect(hsc).toEqual({ qualificationLevel: "HSC", instituteName: "Notre Dame College", majorGroup: "Science", passingYear: 2017 });
  });

  it("opens a held-back field once the Admin shows it", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "privateDetails.religion", section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 1 },
      { fieldId: "feeMin", section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 1 },
    ]);
    const shown = projectTutorProfileForGuardian(fullProfile(), config);
    expect(shown.privateDetails).toEqual({ religion: "Islam" });
    expect(shown.feeMin).toBe(4000);
  });
});

describe("the Admin's choice", () => {
  it("hides a field the Admin hid, and a field switched off for everyone", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "aboutMe", section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 0 },
      { fieldId: "headline", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null, label: null, guardianVisible: 1 },
    ]);
    const projected = projectTutorProfileForGuardian(fullProfile(), config);
    expect(projected).not.toHaveProperty("aboutMe");
    expect(projected).not.toHaveProperty("headline");
    expect(guardianReadableFields(config).map(field => field.id)).not.toContain("headline");
  });

  it("drops a whole school record when its section is hidden, and keeps the others", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "secondaryRecord", section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 0 },
    ]);
    const levels = (projectTutorProfileForGuardian(fullProfile(), config).educationRecords as Array<{ qualificationLevel: string }>).map(record => record.qualificationLevel);
    expect(levels).toEqual(["HSC", "Masters"]);
  });

  it("sends nothing marked required, so a Guardian never sees the Tutor's to-do colouring", () => {
    expect(guardianReadableFields(defaultTutorProfileFieldConfig()).every(field => field.required === false)).toBe(true);
  });
});

describe("naming the catalog ids", () => {
  it("only asks for the names of what was sent", () => {
    const config = resolveTutorProfileFieldConfig([
      { fieldId: "teachingAreaIds", section: null, subGroup: null, sortOrder: null, enabled: null, required: null, label: null, guardianVisible: 0 },
    ]);
    const ids = guardianCatalogIds(projectTutorProfileForGuardian(fullProfile(), config));
    expect(ids).toEqual({
      subjects: [1, 2, 3], classLevels: [4], curricula: [5], universityId: 7, facultyDepartmentId: 12, locations: ["dhaka", "gulshan"],
    });
  });
});
