import { describe, expect, it } from "vitest";
import {
  buildTutorProfileSubmissionRefinement,
  calculateTutorProfileCompletion,
  tutorProfileDraftSchema,
  tutorProfileEditableDraftSchema,
  tutorProfileSubmissionSchema,
  validateTutorProfileCatalogReferences,
  withoutRetiredTutorProfileFields,
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
  tuitionTypes: ["home", "online"],
  preferredStudentGender: "both",
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
      feeMin: 8000,
      feeMax: 7000,
    });

    expect(invalidSubmission.success).toBe(false);
    if (!invalidSubmission.success) {
      const invalidFields = invalidSubmission.error.issues.map(issue => String(issue.path[0]));
      expect(invalidFields).toEqual(
        expect.arrayContaining(["additionalSubjectIds", "feeMax"]),
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

  it("lets a Tutor who offers only online tuition leave Teaching Areas empty, and nobody else", () => {
    const noAreas = { ...approvedExpandedSubmission, teachingAreaIds: undefined };

    expect(tutorProfileSubmissionSchema.safeParse({ ...noAreas, tuitionTypes: ["online"] }).success).toBe(true);

    for (const tuitionTypes of [["home"], ["home", "online"], ["online", "group"]]) {
      const result = tutorProfileSubmissionSchema.safeParse({ ...noAreas, tuitionTypes });
      expect(result.success).toBe(false);
      if (!result.success) expect(result.error.issues.map(issue => String(issue.path[0]))).toContain("teachingAreaIds");
    }
  });

  it("counts Teaching Areas toward completion for everyone except an online-only Tutor", () => {
    const withoutAreas = { ...completeSubmission, teachingAreaIds: undefined };

    expect(calculateTutorProfileCompletion({ ...withoutAreas, tuitionTypes: ["online"] })).toBe(100);
    expect(calculateTutorProfileCompletion({ ...withoutAreas, tuitionTypes: ["home"] })).toBeLessThan(100);
  });

  it("no longer knows Available Nationwide or Preferred Class Size, and refuses them as unknown keys", () => {
    for (const retired of [{ availableNationwide: true }, { preferredClassSizes: ["one_to_one"] }]) {
      expect(tutorProfileDraftSchema.safeParse({ headline: "Experienced Mathematics Tutor", ...retired }).success).toBe(false);
    }
    // ...but a page opened before they left may still send them; the save input drops them rather than refusing the whole save.
    const stale = withoutRetiredTutorProfileFields(tutorProfileEditableDraftSchema).safeParse({
      headline: "Experienced Mathematics Tutor for SSC Students",
      availableNationwide: true,
      preferredClassSizes: ["one_to_one"],
    });
    expect(stale.success).toBe(true);
    if (stale.success) expect(stale.data).toEqual({ headline: "Experienced Mathematics Tutor for SSC Students" });
    // Anything else unknown is still refused.
    expect(withoutRetiredTutorProfileFields(tutorProfileEditableDraftSchema).safeParse({ headline: "Experienced Mathematics Tutor", surprise: 1 }).success).toBe(false);
  });

  it("requires approved private identity/family information, the two school records, and University ID upload before final review", () => {
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
        "universityIdDocumentStatus",
      ]));
      // A degree added under "Add another qualification" is optional, so its
      // missing end year is not among the things asked for.
      expect(paths).not.toContain("educationRecords.2.studyEndYear");
    }
  });

  it("asks for the Permanent Address before review, unless the Owner makes it optional", () => {
    const withoutAddress = { ...approvedExpandedSubmission, privateDetails: { ...approvedExpandedSubmission.privateDetails, permanentAddress: undefined } };
    const result = tutorProfileSubmissionSchema.safeParse(withoutAddress);
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues.map(issue => issue.path.join("."))).toContain("privateDetails.permanentAddress");
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

  it("asks a studying Tutor for a year/semester and a finished one for a graduation year, when the University Section is all they have", () => {
    // Only the University Section: the school records and the history are left out,
    // so what the Tutor can apply with is decided by the timeline their status asks for.
    const universityOnly = { ...approvedExpandedSubmission, educationRecords: [] };
    const studying = { ...universityOnly, studyStatus: "studying", graduationYear: undefined, yearSemester: undefined };

    // Studying: the graduation year is irrelevant, the year/semester is what completes the section.
    const missingYearSemester = tutorProfileSubmissionSchema.safeParse(studying);
    expect(missingYearSemester.success).toBe(false);
    if (!missingYearSemester.success) {
      expect(missingYearSemester.error.issues.map(issue => issue.path.join("."))).toContain("educationRecords");
    }
    expect(tutorProfileSubmissionSchema.safeParse({ ...studying, yearSemester: "2nd Year/Semester" }).success).toBe(true);

    // Graduated: the mirror image - the graduation year is what completes it.
    const graduated = { ...universityOnly, graduationYear: undefined, yearSemester: undefined };
    const missingGraduationYear = tutorProfileSubmissionSchema.safeParse(graduated);
    expect(missingGraduationYear.success).toBe(false);
    if (!missingGraduationYear.success) {
      expect(missingGraduationYear.error.issues.map(issue => issue.path.join("."))).toContain("educationRecords");
    }

    // Each status completes the same single unit, so both reach 100.
    expect(calculateTutorProfileCompletion({ ...studying, yearSemester: "2nd Year/Semester" })).toBe(100);
    expect(calculateTutorProfileCompletion(completeSubmission)).toBe(100);
  });

  it("saves a half-typed degree as a draft, and does not hold submission to it while the history is optional", () => {
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

    expect(tutorProfileSubmissionSchema.safeParse({
      ...approvedExpandedSubmission,
      educationRecords: withDegreeRecord({ studyEndYear: undefined }),
    }).success).toBe(true);
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
    const additionalSubjectsRequired = submissionSchemaWithConfig([
      { fieldId: "additionalSubjectIds", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
    ]);
    const { additionalSubjectIds: _additionalSubjectIds, ...withoutAdditionalSubjects } = approvedExpandedSubmission;
    const result = additionalSubjectsRequired.safeParse(withoutAdditionalSubjects);
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.map(issue => issue.path.join("."))).toContain("additionalSubjectIds");
    }
    expect(additionalSubjectsRequired.safeParse({ ...withoutAdditionalSubjects, additionalSubjectIds: [2] }).success).toBe(true);
  });

  it("cannot flip a code-owned field's requiredness, even with a stored override attempting it", () => {
    // yearSemester's requiredness branches on studyStatus; a stored override
    // is ignored by resolveTutorProfileFieldConfig for a non-configurable
    // field, so this must behave exactly like the default config.
    const attemptedOverride = submissionSchemaWithConfig([
      { fieldId: "yearSemester", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    const studying = { ...approvedExpandedSubmission, educationRecords: [], studyStatus: "studying", graduationYear: undefined, yearSemester: undefined };
    expect(attemptedOverride.safeParse(studying).success).toBe(false);
  });

  it("ignores a Required setting stored for any education detail", () => {
    const stored = submissionSchemaWithConfig([
      { fieldId: "universityId", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
      { fieldId: "resultGpa", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
      { fieldId: "educationRecords.rollNumber", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
      { fieldId: "secondaryRecord", section: null, subGroup: null, sortOrder: null, enabled: null, required: 0 },
    ]);
    // Neither a GPA nor a roll number is asked for, and Secondary still counts as a section.
    const sscOnly = { ...approvedExpandedSubmission, educationRecords: [sscRecord], universityId: undefined, facultyDepartmentId: undefined, degreeExamTitle: undefined, studyStatus: undefined, graduationYear: undefined, universityIdDocumentStatus: "not_uploaded" };
    expect(stored.safeParse(sscOnly).success).toBe(true);
  });
});

describe("Tutor Profile Qualification history is never required", () => {
  const halfFilledDegree = { qualificationLevel: "Masters" as const, instituteName: "University of Dhaka", currentlyStudying: false };
  const issuePaths = (result: { success: boolean; error?: { issues: Array<{ path: Array<string | number> }> } }) => result.error?.issues.map(issue => issue.path.join(".")) ?? [];

  it("ships as optional, and no setting can make it required", () => {
    expect(defaultTutorProfileFieldConfig().byId.get("educationRecords")?.required).toBe(false);
    expect(defaultTutorProfileFieldConfig().byId.get("educationRecords")?.requiredConfigurable).toBe(false);

    // A setting an Owner stored before this was so is ignored, not honoured.
    const stored = resolveTutorProfileFieldConfig([
      { fieldId: "educationRecords", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
    ]);
    expect(stored.byId.get("educationRecords")?.required).toBe(false);
  });

  it("submits with no degree at all, and with a half-filled one", () => {
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscRecord, hscRecord] }).success).toBe(true);
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscRecord, hscRecord, halfFilledDegree] }).success).toBe(true);
  });

  it("submits the same whichever way the setting was stored", () => {
    const schema = tutorProfileDraftSchema.superRefine(buildTutorProfileSubmissionRefinement(resolveTutorProfileFieldConfig([
      { fieldId: "educationRecords", section: null, subGroup: null, sortOrder: null, enabled: null, required: 1 },
    ])));
    expect(schema.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscRecord, hscRecord] }).success).toBe(true);
    expect(schema.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscRecord, hscRecord, halfFilledDegree] }).success).toBe(true);
  });

  it("does not count a half-filled school record, and does not hold it against a Tutor who has another section", () => {
    const { instituteName: _instituteName, ...sscWithoutInstitute } = sscRecord;
    // The Honours and Higher Secondary records are complete, so the half-filled Secondary is simply not counted.
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, educationRecords: [sscWithoutInstitute, hscRecord] }).success).toBe(true);
  });
});

describe("Tutor Profile Education needs only one section", () => {
  // No University Section and no ID card: what an SSC-only teacher has.
  const withoutUniversity = {
    ...approvedExpandedSubmission,
    universityId: undefined, facultyDepartmentId: undefined, degreeMajorId: undefined, degreeExamTitle: undefined,
    studyStatus: undefined, graduationYear: undefined, yearSemester: undefined,
    universityIdDocumentStatus: "not_uploaded",
  };
  const withRecords = (educationRecords: unknown[]) => ({ ...withoutUniversity, educationRecords });
  const issuePaths = (result: { success: boolean; error?: { issues: Array<{ path: Array<string | number> }> } }) => result.error?.issues.map(issue => issue.path.join(".")) ?? [];
  const { instituteName: _sscInstitute, ...sscWithoutInstitute } = sscRecord;
  const { universityIdDocumentStatus: _idCard, ...universitySection } = approvedExpandedSubmission;

  it("lets a Tutor with only SSC apply, with no University Section and no ID card", () => {
    expect(tutorProfileSubmissionSchema.safeParse(withRecords([sscRecord])).success).toBe(true);
    expect(calculateTutorProfileCompletion(withRecords([sscRecord]))).toBe(100);
  });

  it("lets a Tutor with only Higher Secondary, only a degree under the history, or only the University Section apply", () => {
    expect(tutorProfileSubmissionSchema.safeParse(withRecords([hscRecord])).success).toBe(true);
    expect(tutorProfileSubmissionSchema.safeParse(withRecords([honoursRecord])).success).toBe(true);
    expect(tutorProfileSubmissionSchema.safeParse({ ...approvedExpandedSubmission, educationRecords: [] }).success).toBe(true);
  });

  it("asks for one section, and says so, when there is none", () => {
    const result = tutorProfileSubmissionSchema.safeParse(withRecords([]));
    expect(result.success).toBe(false);
    expect(issuePaths(result)).toContain("educationRecords");
    expect(calculateTutorProfileCompletion(withRecords([]))).toBeLessThan(100);
  });

  it("does not count a section that is started and left half done", () => {
    const halfHonours = { ...honoursRecord, studyEndYear: undefined, currentlyStudying: false };
    expect(issuePaths(tutorProfileSubmissionSchema.safeParse(withRecords([sscWithoutInstitute, halfHonours])))).toContain("educationRecords");
    // ...and does not count against a Tutor who has a whole one beside it.
    expect(tutorProfileSubmissionSchema.safeParse(withRecords([sscRecord, halfHonours])).success).toBe(true);
  });

  it("asks for the University ID card only of a Tutor who filled in the University Section", () => {
    const noCard = { ...universitySection, universityIdDocumentStatus: "not_uploaded" };
    const asked = tutorProfileSubmissionSchema.safeParse(noCard);
    expect(asked.success).toBe(false);
    expect(issuePaths(asked)).toContain("universityIdDocumentStatus");
    expect(tutorProfileSubmissionSchema.safeParse({ ...universitySection, universityIdDocumentStatus: "uploaded" }).success).toBe(true);
    // A Tutor with only school records is not asked.
    expect(tutorProfileSubmissionSchema.safeParse(withRecords([sscRecord, hscRecord])).success).toBe(true);
  });

  it("applies no education rule when the Owner has switched every education section off", () => {
    const off = (fieldId: string) => ({ fieldId, section: null, subGroup: null, sortOrder: null, enabled: 0, required: null });
    const schema = tutorProfileDraftSchema.superRefine(buildTutorProfileSubmissionRefinement(resolveTutorProfileFieldConfig([
      off("secondaryRecord"), off("higherSecondaryRecord"), off("educationRecords"),
      off("universityId"), off("facultyDepartmentId"), off("degreeExamTitle"), off("studyStatus"), off("yearSemester"), off("graduationYear"),
    ])));
    expect(schema.safeParse(withRecords([])).success).toBe(true);
  });

  it("leaves no education detail with a Required switch", () => {
    const config = defaultTutorProfileFieldConfig();
    const switchable = Array.from(config.byId.values()).filter(field => field.section === "c" && field.requiredConfigurable).map(field => field.id);
    expect(switchable).toEqual([]);
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

describe("Tutor Profile Education Result/GPA and Passing Year validation", () => {
  it("rejects school record GPA exceeding 5.00", () => {
    const invalidSsc = {
      ...approvedExpandedSubmission,
      educationRecords: [
        { ...approvedExpandedSubmission.educationRecords[0], resultGpa: "5.50" },
        approvedExpandedSubmission.educationRecords[1],
        approvedExpandedSubmission.educationRecords[2],
      ],
    };
    const parsed = tutorProfileDraftSchema.safeParse(invalidSsc);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.message.includes("cannot exceed 5.00"))).toBe(true);
    }
  });

  it("rejects university CGPA exceeding 4.00", () => {
    const invalidUniGpa = {
      ...approvedExpandedSubmission,
      resultGpa: "4.50",
    };
    const parsed = tutorProfileDraftSchema.safeParse(invalidUniGpa);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.message.includes("cannot exceed 4.00"))).toBe(true);
    }
  });

  it("rejects inverted school passing years (HSC before SSC)", () => {
    const invertedSchoolYears = {
      ...approvedExpandedSubmission,
      educationRecords: [
        { ...approvedExpandedSubmission.educationRecords[0], passingYear: 2018 },
        { ...approvedExpandedSubmission.educationRecords[1], passingYear: 2016 },
        approvedExpandedSubmission.educationRecords[2],
      ],
    };
    const parsed = tutorProfileDraftSchema.safeParse(invertedSchoolYears);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.message.includes("HSC passing year (2016) cannot be earlier than SSC passing year (2018)"))).toBe(true);
    }
  });

  it("rejects university graduation year earlier than HSC passing year", () => {
    const invertedUniGrad = {
      ...approvedExpandedSubmission,
      graduationYear: 2015, // HSC was 2016
    };
    const parsed = tutorProfileDraftSchema.safeParse(invertedUniGrad);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      expect(parsed.error.issues.some(i => i.message.includes("University graduation year (2015) cannot be earlier than HSC passing year (2016)"))).toBe(true);
    }
  });
});
describe("Tutor Profile duplicate phone number validation", () => {
  it("rejects fatherPhone when it duplicates the tutor's personal mobile number", () => {
    const duplicateFather = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        fatherPhone: approvedExpandedSubmission.phone, // same number
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(duplicateFather);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.fatherPhone");
      expect(issue?.message).toContain("Father's phone number cannot be the same as your personal mobile number");
    }
  });

  it("rejects motherPhone when it duplicates the tutor's personal mobile number", () => {
    const duplicateMother = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        motherPhone: approvedExpandedSubmission.phone,
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(duplicateMother);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.motherPhone");
      expect(issue?.message).toContain("Mother's phone number cannot be the same as your personal mobile number");
    }
  });

  it("rejects emergencyContactPhone when it duplicates the tutor's personal mobile number", () => {
    const duplicateEmergency = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactPhone: approvedExpandedSubmission.phone,
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(duplicateEmergency);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.emergencyContactPhone");
      expect(issue?.message).toContain("Emergency contact phone cannot be the same as your personal mobile number");
    }
  });

  it("rejects additionalPhone when it duplicates the primary mobile number", () => {
    const duplicateAdditional = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        additionalPhone: approvedExpandedSubmission.phone,
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(duplicateAdditional);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.additionalPhone");
      expect(issue?.message).toContain("Additional phone number cannot be the same as your primary mobile number");
    }
  });

  it("accepts valid distinct phone numbers for tutor and family contacts", () => {
    const validPhones = {
      ...approvedExpandedSubmission,
      phone: "+8801712345678",
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        additionalPhone: "+8801812345678",
        fatherPhone: "+8801912345678",
        motherPhone: "+8801512345678",
        emergencyContactPhone: "+8801612345678",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(validPhones);
    expect(parsed.success).toBe(true);
  });


  it("rejects permanentAddress when shorter than 10 characters", () => {
    const shortAddress = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        permanentAddress: "Dhaka",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(shortAddress);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.permanentAddress");
      expect(issue?.message).toContain("Enter detailed permanent address (at least 10 characters including Village/Area, Thana, District)");
    }
  });

  it("accepts valid permanentAddress with sufficient detail", () => {
    const validAddress = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        permanentAddress: "Village Example, Thana Sadar, Rangpur",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(validAddress);
    expect(parsed.success).toBe(true);
  });

  it("rejects presentAddress when shorter than 10 characters", () => {
    const shortAddress = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        presentAddress: "Dhaka",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(shortAddress);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.presentAddress");
      expect(issue?.message).toContain("Enter detailed present address (at least 10 characters including House/Road, Area)");
    }
  });

  it("accepts valid presentAddress with sufficient detail", () => {
    const validAddress = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        presentAddress: "House 12, Road 5, Mirpur, Dhaka",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(validAddress);
    expect(parsed.success).toBe(true);
  });

  it("rejects emergencyContactName when it matches tutor name or self-reference", () => {
    const selfName = {
      ...approvedExpandedSubmission,
      name: "Shafayet Ahmed",
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactName: "Shafayet Ahmed",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(selfName);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.emergencyContactName");
      expect(issue?.message).toContain("Emergency contact cannot be yourself");
    }

    const selfWord = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactName: "Self",
      },
    };
    const parsedSelf = tutorProfileDraftSchema.safeParse(selfWord);
    expect(parsedSelf.success).toBe(false);
  });

  it("rejects emergencyContactRelation when self or dummy keyword", () => {
    const selfRelation = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactRelation: "Self",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(selfRelation);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "privateDetails.emergencyContactRelation");
      expect(issue?.message).toContain("Emergency contact relation cannot be self");
    }

    const dummyRelation = {
      ...approvedExpandedSubmission,
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactRelation: "None",
      },
    };
    const parsedDummy = tutorProfileDraftSchema.safeParse(dummyRelation);
    expect(parsedDummy.success).toBe(false);
  });

  it("accepts valid emergency contact name and relation", () => {
    const validContact = {
      ...approvedExpandedSubmission,
      name: "Shafayet Ahmed",
      privateDetails: {
        ...approvedExpandedSubmission.privateDetails,
        emergencyContactName: "Abdul Karim",
        emergencyContactRelation: "Father",
      },
    };
    const parsed = tutorProfileDraftSchema.safeParse(validContact);
    expect(parsed.success).toBe(true);
  });
it("rejects feeMin below 1,000 BDT to avoid per-class rate confusion", () => {
    const lowFee = {
      ...approvedExpandedSubmission,
      feeMin: 500,
    };
    const parsed = tutorProfileDraftSchema.safeParse(lowFee);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "feeMin");
      expect(issue?.message).toContain("Minimum monthly fee must be at least 1,000 BDT");
    }
  });

  it("rejects feeMax below 1,000 BDT", () => {
    const lowMax = {
      ...approvedExpandedSubmission,
      feeMin: 1000,
      feeMax: 800,
    };
    const parsed = tutorProfileDraftSchema.safeParse(lowMax);
    expect(parsed.success).toBe(false);
    if (!parsed.success) {
      const issue = parsed.error.issues.find(i => i.path.join(".") === "feeMax");
      expect(issue?.message).toBeDefined();
    }
  });
});
