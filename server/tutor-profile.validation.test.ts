import { describe, expect, it } from "vitest";
import {
  buildTutorProfileSubmissionRefinement,
  calculateTutorProfileCompletion,
  tutorProfileDraftSchema,
  tutorProfileSubmissionSchema,
  validateTutorProfileCatalogReferences,
} from "./tutor-profile.validation";
import { defaultTutorProfileFieldConfig, resolveTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";

const completeSubmission = {
  profilePhotoKey: "tutors/1503/profile/photo.webp",
  name: "Aminul Islam",
  gender: "male",
  dateOfBirth: "1995-01-10",
  headline: "Experienced Mathematics Tutor for SSC Students",
  phone: "+8801516131411",
  contactEmail: "aminul@example.com",
  currentCityId: "bd-dhaka-city",
  currentLocationId: "bd-dhaka",
  teachingAreaIds: ["bd-mirpur"],
  availableNationwide: true,
  universityId: 1,
  facultyDepartmentId: 11,
  degreeMajorId: 111,
  degreeExamTitle: "BSc",
  studyStatus: "graduated",
  graduationYear: 2022,
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
    // Secondary and Higher Secondary each have their own section now, and both
    // are required to submit - so a complete submission carries all three.
    qualificationLevel: "SSC",
    instituteName: "Dhaka Residential Model College",
    degreeExamTitle: "SSC",
    majorGroup: "Science",
    curriculum: "Bangla Version",
    currentlyStudying: false,
    passingYear: 2014,
  }, {
    qualificationLevel: "HSC",
    instituteName: "Notre Dame College",
    degreeExamTitle: "HSC",
    majorGroup: "Science",
    curriculum: "Bangla Version",
    currentlyStudying: false,
    passingYear: 2016,
  }, {
    qualificationLevel: "Honours",
    instituteName: "University of Dhaka",
    degreeExamTitle: "BSc",
    majorGroup: "Mathematics",
    curriculum: "English Version",
    studyStartYear: 2018,
    currentlyStudying: false,
    studyEndYear: 2022,
  }],
  universityIdDocumentStatus: "uploaded",
};

/** The three records a complete submission carries, by name rather than index. */
const [sscRecord, hscRecord, honoursRecord] = approvedExpandedSubmission.educationRecords;
/** Every submission needs the two school records; a test varies the degree.  */
const withDegreeRecord = (overrides: Record<string, unknown>) => [sscRecord, hscRecord, { ...honoursRecord, ...overrides }];
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

  it("treats an absent Student Types list as fine, but still rejects an empty one", () => {
    // Student Types left the profile UI, so a real Tutor always has `[]` here.
    // The list validator only accepts a non-empty array or `undefined` - so
    // `submitTutorProfile` must send `undefined`, never `[]`, or no Tutor could
    // ever submit.
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, studentTypeIds: undefined }).success).toBe(true);
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, studentTypeIds: [] }).success).toBe(false);
  });

  it("requires approved private identity/family information, one complete education record, and University ID upload before final review", () => {
    expect(tutorProfileSubmissionSchema.safeParse(approvedExpandedSubmission).success).toBe(true);

    const result = tutorProfileSubmissionSchema.safeParse({
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        fatherPhone: undefined,
      },
      educationRecords: withDegreeRecord({ studyEndYear: undefined }),
      universityIdDocumentStatus: "not_uploaded",
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const paths = result.error.issues.map(issue => issue.path.join("."));
      expect(paths).toEqual(expect.arrayContaining([
        "privateDetails.fatherPhone",
        "educationRecords.2.studyEndYear",
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
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      const invalidFields = result.error.issues.map(issue => String(issue.path[0]));
      expect(invalidFields).toEqual(
        expect.arrayContaining(["preferredTeachingDays", "preferredTimeSlots"]),
      );
    }
  });

  it("reports inactive selections and mismatched academic catalog parents with field-specific paths", () => {
    const issues = validateTutorProfileCatalogReferences(completeSubmission, {
      activeLocationIds: new Set(["bd-dhaka-city", "bd-dhaka", "bd-mirpur"]),
      activeUniversityIds: new Set([1]),
      activeFacultyDepartmentIds: new Set<number>(),
      activeDegreeMajorFacultyDepartmentIds: new Map([[111, 12]]),
      activeSubjectIds: new Set([2]),
      activeClassLevelIds: new Set([1]),
      activeCurriculumIds: new Set([1]),
      activeStudentTypeIds: new Set([1]),
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

  it("asks a studying Tutor for a year/semester and a finished one for a graduation year", () => {
    const studying = { ...approvedExpandedSubmission, studyStatus: "studying", graduationYear: undefined, yearSemester: undefined };

    // Studying: the graduation year is irrelevant, the year/semester is required.
    const missingYearSemester = tutorProfileSubmissionSchema.safeParse(studying);
    expect(missingYearSemester.success).toBe(false);
    if (!missingYearSemester.success) {
      expect(missingYearSemester.error.issues.map(issue => issue.path.join("."))).toContain("yearSemester");
    }
    expect(tutorProfileSubmissionSchema.safeParse({ ...studying, yearSemester: "2nd Year/Semester" }).success).toBe(true);

    // Graduated: the mirror image - the graduation year is what is required.
    const graduated = { ...approvedExpandedSubmission, graduationYear: undefined, yearSemester: undefined };
    const missingGraduationYear = tutorProfileSubmissionSchema.safeParse(graduated);
    expect(missingGraduationYear.success).toBe(false);
    if (!missingGraduationYear.success) {
      expect(missingGraduationYear.error.issues.map(issue => issue.path.join("."))).toContain("graduationYear");
    }

    // Each status completes the same single unit, so both reach 100.
    expect(calculateTutorProfileCompletion({ ...studying, yearSemester: "2nd Year/Semester" })).toBe(100);
    expect(calculateTutorProfileCompletion(completeSubmission)).toBe(100);
  });

  it("saves a half-typed degree as a draft, and asks for its end year only at submission", () => {
    // The University Section popup saves a draft on Submit. Demanding the end
    // year at draft level meant a degree whose dates had not been reached yet
    // could not be saved at all - the popup refused to close and said nothing
    // a person could act on.
    const halfTyped = {
      qualificationLevel: "Honours" as const,
      instituteName: "University of Dhaka",
      currentlyStudying: false,
    };

    expect(tutorProfileDraftSchema.safeParse({ educationRecords: [halfTyped] }).success).toBe(true);

    const submission = tutorProfileSubmissionSchema.safeParse({
      ...approvedExpandedSubmission,
      educationRecords: withDegreeRecord({ studyEndYear: undefined }),
    });
    expect(submission.success).toBe(false);
    if (!submission.success) {
      expect(submission.error.issues.map(issue => issue.path.join("."))).toContain("educationRecords.2.studyEndYear");
    }
  });

  it("never asks a board-exam record for an end year, at either level", () => {
    const sscDraft = { qualificationLevel: "SSC" as const, instituteName: "Narandia High School", currentlyStudying: false };
    expect(tutorProfileDraftSchema.safeParse({ educationRecords: [sscDraft] }).success).toBe(true);

    const submission = tutorProfileSubmissionSchema.safeParse(approvedExpandedSubmission);
    expect(submission.success).toBe(true);
  });

  it("rejects qualification records outside the curated vocabularies or with an inverted year range", () => {
    const parseWithRecord = (overrides: Record<string, unknown>) =>
      tutorProfileSubmissionSchema.safeParse({
        ...approvedExpandedSubmission,
        educationRecords: withDegreeRecord(overrides),
      });

    expect(parseWithRecord({ qualificationLevel: "Bachelor" }).success).toBe(false);
    expect(parseWithRecord({ curriculum: "Bangla" }).success).toBe(false);
    expect(parseWithRecord({ studyStartYear: 1800 }).success).toBe(false);

    const inverted = parseWithRecord({ studyStartYear: 2022, studyEndYear: 2018 });
    expect(inverted.success).toBe(false);
    if (!inverted.success) {
      expect(inverted.error.issues.map(issue => issue.path.join("."))).toContain("educationRecords.2.studyEndYear");
    }

    // An ongoing record may leave the end year out entirely.
    expect(parseWithRecord({ currentlyStudying: true, studyEndYear: undefined }).success).toBe(true);
  });

  it("validates a board-exam record by its own rules, not a degree's", () => {
    const school = {
      qualificationLevel: "SSC",
      instituteName: "Dhaka Residential Model College",
      degreeExamTitle: "SSC",
      majorGroup: "Science",
      curriculum: "Bangla Version",
      currentlyStudying: false,
      passingYear: 2016,
      rollNumber: "123456",
      registrationNumber: "1234567890",
    };
    const parse = (overrides: Record<string, unknown> = {}) =>
      tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, educationRecords: [{ ...school, ...overrides }, hscRecord, honoursRecord] });

    // No study span, no "currently studying", and it still passes - those are
    // a degree's fields, and demanding them here is the bug this guards.
    expect(parse().success).toBe(true);
    // The roll and registration numbers are optional.
    expect(parse({ rollNumber: undefined, registrationNumber: undefined }).success).toBe(true);
    // The passing year is still a real four-digit year.
    expect(parse({ passingYear: 1800 }).success).toBe(false);
  });
});

describe("Tutor Profile field config drives submission requiredness", () => {
  function submissionSchemaWithConfig(overrides: Parameters<typeof resolveTutorProfileFieldConfig>[0]) {
    return tutorProfileDraftSchema.superRefine(buildTutorProfileSubmissionRefinement(resolveTutorProfileFieldConfig(overrides)));
  }

  it("matches the shipped-default schema when nothing is overridden", () => {
    const schema = submissionSchemaWithConfig([]);
    expect(schema.safeParse(approvedExpandedSubmission).success).toBe(true);
    expect(schema.safeParse(completeSubmission).success).toBe(false);
  });

  it("stops requiring a field an Owner disables", () => {
    const feeMinDisabled = submissionSchemaWithConfig([
      { fieldId: "feeMin", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    const { feeMin: _feeMin, ...withoutFeeMin } = approvedExpandedSubmission;
    expect(feeMinDisabled.safeParse(withoutFeeMin).success).toBe(true);
  });

  it("starts requiring a field an Owner flips to required", () => {
    const resultGpaRequired = submissionSchemaWithConfig([
      { fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
    ]);
    const { resultGpa: _resultGpa, ...withoutResultGpa } = approvedExpandedSubmission;
    const result = resultGpaRequired.safeParse(withoutResultGpa);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join("."))).toContain("resultGpa");
    }
    expect(resultGpaRequired.safeParse({ ...withoutResultGpa, resultGpa: "3.80" }).success).toBe(true);
  });

  it("cannot flip a code-owned field's requiredness, even with a stored override attempting it", () => {
    // yearSemester's requiredness branches on studyStatus; a stored override
    // is ignored by resolveTutorProfileFieldConfig for a non-configurable
    // field, so this must behave exactly like the default config.
    const attemptedOverride = submissionSchemaWithConfig([
      { fieldId: "yearSemester", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    const studying = { ...approvedExpandedSubmission, studyStatus: "studying", graduationYear: undefined, yearSemester: undefined };
    expect(attemptedOverride.safeParse(studying).success).toBe(false);
  });

  it("requires at least one education record only when that toggle is on, and stops enforcing per-record fields once disabled", () => {
    const educationOptional = submissionSchemaWithConfig([
      { fieldId: "educationRecords", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
      // Secondary and Higher Secondary are their own required sections now, so
      // dropping the history alone still leaves those two demanded.
      { fieldId: "secondaryRecord", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
      { fieldId: "higherSecondaryRecord", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    const { educationRecords: _educationRecords, ...withoutRecords } = approvedExpandedSubmission;
    expect(educationOptional.safeParse(withoutRecords).success).toBe(true);

    const majorGroupOptional = submissionSchemaWithConfig([
      { fieldId: "educationRecords.majorGroup", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    const { majorGroup: _majorGroup, ...degreeWithoutMajor } = honoursRecord;
    expect(majorGroupOptional.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscRecord, hscRecord, degreeWithoutMajor] }).success).toBe(true);
  });
});

describe("Tutor Profile completion respects a disabled field", () => {
  it("drops a disabled field's unit from both the numerator and the denominator", () => {
    const full = calculateTutorProfileCompletion(completeSubmission, defaultTutorProfileFieldConfig());
    expect(full).toBe(100);

    const config = resolveTutorProfileFieldConfig([
      { fieldId: "feeMax", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    // feeMax's own unit is a joint feeMin+feeMax check (id: null) and is never
    // gated - disabling one half must not change the total this time.
    expect(calculateTutorProfileCompletion(completeSubmission, config)).toBe(full);

    const withoutName = { ...completeSubmission, name: undefined };
    const nameDisabled = resolveTutorProfileFieldConfig([
      { fieldId: "name", section: null, subGroup: null, sortOrder: null, enabled: 0, required: null },
    ]);
    // With `name` dropped from both parts of the fraction, a profile missing
    // only `name` still reads 100%.
    expect(calculateTutorProfileCompletion(withoutName, nameDisabled)).toBe(100);
  });
});
