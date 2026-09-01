import { describe, expect, it } from "vitest";
import {
  calculateTutorProfileCompletion,
  tutorProfileDraftSchema,
  tutorProfileSubmissionSchema,
  validateTutorProfileCatalogReferences,
} from "./tutor-profile.validation";

const completeSubmission = {
  profilePhotoKey: "tutors/1503/profile/photo.webp",
  name: "Aminul Islam",
  gender: "male",
  dateOfBirth: "1995-01-10",
  headline: "Experienced Mathematics Tutor for SSC Students",
  phone: "+8801516131411",
  contactEmail: "aminul@example.com",
  currentLocationId: "bd-dhaka",
  teachingAreaIds: ["bd-mirpur"],
  availableNationwide: true,
  universityId: 1,
  facultyDepartmentId: 11,
  degreeMajorId: 111,
  studyStatus: "graduated",
  primarySubjectIds: [1],
  additionalSubjectIds: [2],
  classLevelIds: [1],
  curriculumIds: [1],
  teachingExperienceYears: 3,
  studentTypeIds: [1],
  tuitionType: "both",
  preferredStudentGender: "both",
  preferredClassSizes: ["one_to_one"],
  preferredTeachingDays: ["monday"],
  preferredTimeSlots: ["evening"],
  feeMin: 5000,
  feeMax: 7000,
  teachingLanguageIds: [1],
  communicationPreferences: ["phone"],
};

const approvedExpandedSubmission = {
  ...completeSubmission,
  privateDetails: {
    presentAddress: "House 12, Road 5, Mirpur, Dhaka",
    permanentAddress: "Village Example, Rangpur",
    nationality: "Bangladeshi",
    religion: "Islam",
    fatherName: "Abdul Karim",
    fatherPhone: "+8801712345678",
  },
  educationRecords: [{
    qualificationLevel: "Bachelor",
    instituteName: "University of Dhaka",
    degreeExamTitle: "BSc",
    majorGroup: "Mathematics",
    studyStartDate: "2018-01-01",
    currentlyStudying: false,
    studyEndDate: "2022-12-31",
    passingYear: 2022,
  }],
  universityIdDocumentStatus: "uploaded",
};

describe("Tutor Profile domain validation", () => {
  it("accepts a valid partial draft and normalizes trimmed free text", () => {
    const result = tutorProfileDraftSchema.safeParse({
      headline: "  Mathematics Tutor for SSC Students  ",
      teachingExperienceYears: 0,
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.headline).toBe("Mathematics Tutor for SSC Students");
    }
  });

  it("reports field-specific errors for invalid draft values", () => {
    const result = tutorProfileDraftSchema.safeParse({
      phone: "+8801212345678",
      dateOfBirth: "2099-01-01",
      headline: "Too short",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const invalidFields = result.error.issues.map(issue => String(issue.path[0]));
      expect(invalidFields).toEqual(expect.arrayContaining(["phone", "dateOfBirth", "headline"]));
    }
  });

  it("rejects system-managed fields in every Tutor-editable profile payload", () => {
    const result = tutorProfileDraftSchema.safeParse({
      headline: "Experienced Mathematics Tutor for SSC Students",
      profileStatus: "approved",
      accountStatus: "active",
      completionPercentage: 100,
      assignedRequestCount: 99,
      lastUpdatedAt: 1_700_000_000_000,
    });

    expect(result.success).toBe(false);
  });

  it("requires all approved submission groups and enforces cross-field invariants", () => {
    expect(tutorProfileSubmissionSchema.safeParse(approvedExpandedSubmission).success).toBe(true);

    const invalidSubmission = tutorProfileSubmissionSchema.safeParse({
      ...approvedExpandedSubmission,
      additionalSubjectIds: [1],
      availableNationwide: false,
      feeMin: 8000,
      feeMax: 7000,
    });

    expect(invalidSubmission.success).toBe(false);
    if (!invalidSubmission.success) {
      const invalidFields = invalidSubmission.error.issues.map(issue => String(issue.path[0]));
      expect(invalidFields).toEqual(
        expect.arrayContaining(["additionalSubjectIds", "availableNationwide", "feeMax"]),
      );
    }
  });

  it("requires approved private identity/family information, one complete education record, and University ID upload before final review", () => {
    expect(tutorProfileSubmissionSchema.safeParse(approvedExpandedSubmission).success).toBe(true);

    const result = tutorProfileSubmissionSchema.safeParse({
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        fatherPhone: undefined,
      },
      educationRecords: [{
        ...approvedExpandedSubmission.educationRecords[0],
        studyEndDate: undefined,
      }],
      universityIdDocumentStatus: "not_uploaded",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(issue => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining([
        "privateDetails.fatherPhone",
        "educationRecords.0.studyEndDate",
        "universityIdDocumentStatus",
      ]));
    }
  });

  it("deliberately rejects direct NID values until encryption and retention controls are implemented", () => {
    const result = tutorProfileDraftSchema.safeParse({
      privateDetails: {
        presentAddress: "House 12, Road 5, Mirpur, Dhaka",
        nationalId: "1234567890",
      },
    });

    expect(result.success).toBe(false);
  });

  it("rejects duplicate values in enum-based multi-select preferences", () => {
    const result = tutorProfileDraftSchema.safeParse({
      preferredTeachingDays: ["monday", "monday"],
      preferredTimeSlots: ["evening", "evening"],
      communicationPreferences: ["phone", "phone"],
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const invalidFields = result.error.issues.map(issue => String(issue.path[0]));
      expect(invalidFields).toEqual(
        expect.arrayContaining(["preferredTeachingDays", "preferredTimeSlots", "communicationPreferences"]),
      );
    }
  });

  it("reports inactive selections and mismatched academic catalog parents with field-specific paths", () => {
    const issues = validateTutorProfileCatalogReferences(completeSubmission, {
      activeLocationIds: new Set(["bd-dhaka", "bd-mirpur"]),
      activeUniversityIds: new Set([1]),
      activeFacultyDepartmentIds: new Set<number>(),
      activeDegreeMajorFacultyDepartmentIds: new Map([[111, 12]]),
      activeSubjectIds: new Set([2]),
      activeClassLevelIds: new Set([1]),
      activeCurriculumIds: new Set([1]),
      activeStudentTypeIds: new Set([1]),
      activeLanguageIds: new Set([1]),
    });

    expect(issues.map(issue => issue.path[0])).toEqual(
      expect.arrayContaining(["facultyDepartmentId", "degreeMajorId", "primarySubjectIds"]),
    );
  });

  it("calculates 0 for an empty profile, 100 for a complete A–F profile, and ignores optional biography", () => {
    expect(calculateTutorProfileCompletion({})).toBe(0);
    expect(calculateTutorProfileCompletion(completeSubmission)).toBe(100);
    expect(
      calculateTutorProfileCompletion({
        ...completeSubmission,
        aboutMe: "I use structured practice and patient explanations.",
        teachingApproach: "Concept-first teaching.",
      }),
    ).toBe(100);
  });
});
