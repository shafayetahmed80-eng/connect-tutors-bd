import { z } from "zod";
import { siteLimitCeiling } from "@shared/site-limits";
import {
  MIN_STUDY_YEAR,
  academicEducationLevels,
  maxStudyYear,
  qualificationCurricula,
  qualificationEducationLevels,
} from "@shared/tutor-education";

const bangladeshPhoneSchema = z
  .string()
  .trim()
  .regex(/^\+8801[3-9]\d{8}$/, "Enter a valid Bangladesh mobile number.");

const profileDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Use YYYY-MM-DD format.")
  .superRefine((value, ctx) => {
    const parsed = new Date(`${value}T00:00:00.000Z`);
    const isCalendarDate = !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;

    if (!isCalendarDate) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Enter a real calendar date." });
      return;
    }

    if (parsed.getTime() > Date.now()) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Date of birth cannot be in the future." });
    }
  });

const positiveIdSchema = z.number().int().positive();
const locationIdSchema = z.string().trim().min(1).max(80);

function uniqueIdList(maximum: number) {
  return z.array(positiveIdSchema).min(1).max(maximum).superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selections must not contain duplicates." });
    }
  });
}

function optionalUniqueIdList(maximum: number) {
  return uniqueIdList(maximum).optional();
}

function uniqueLocationIdList(maximum: number) {
  return z.array(locationIdSchema).min(1).max(maximum).superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selections must not contain duplicates." });
    }
  });
}

function optionalUniqueLocationIdList(maximum: number) {
  return uniqueLocationIdList(maximum).optional();
}

function uniqueEnumList<T extends readonly [string, ...string[]]>(options: T, maximum: number) {
  return z.array(z.enum(options)).min(1).max(maximum).superRefine((values, ctx) => {
    if (new Set(values).size !== values.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "Selections must not contain duplicates." });
    }
  });
}

function optionalTrimmedText(maximum: number) {
  return z.preprocess(value => {
    if (typeof value === "string" && value.trim() === "") return undefined;
    return value;
  }, z.string().trim().max(maximum).optional());
}

const optionalBangladeshPhoneSchema = z.preprocess(value => {
  if (typeof value === "string" && value.trim() === "") return undefined;
  return value;
}, bangladeshPhoneSchema.optional());

const privateDetailsSchema = z.object({
  additionalPhone: optionalBangladeshPhoneSchema,
  presentAddress: optionalTrimmedText(500),
  permanentAddress: optionalTrimmedText(500),
  nationality: optionalTrimmedText(80),
  religion: optionalTrimmedText(80),
  socialProfileLinks: optionalTrimmedText(1000),
  fatherName: optionalTrimmedText(160),
  fatherPhone: optionalBangladeshPhoneSchema,
  motherName: optionalTrimmedText(160),
  motherPhone: optionalBangladeshPhoneSchema,
  emergencyContactName: optionalTrimmedText(160),
  emergencyContactRelation: optionalTrimmedText(80),
  emergencyContactPhone: optionalBangladeshPhoneSchema,
  emergencyContactAddress: optionalTrimmedText(500),
}).strict();

const studyYearSchema = z.number().int().min(MIN_STUDY_YEAR).max(maxStudyYear());

const educationRecordSchema = z.object({
  qualificationLevel: z.enum(qualificationEducationLevels),
  instituteName: z.string().trim().min(2).max(200),
  degreeExamTitle: z.string().trim().min(2).max(160),
  majorGroup: z.string().trim().min(2).max(160),
  resultGpa: optionalTrimmedText(80),
  curriculum: z.enum(qualificationCurricula),
  studyStartYear: studyYearSchema,
  studyEndYear: studyYearSchema.optional(),
  currentlyStudying: z.boolean(),
  instituteIdCardNumber: optionalTrimmedText(160),
}).strict().superRefine((value, ctx) => {
  if (!value.currentlyStudying && value.studyEndYear === undefined) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studyEndYear"],
      message: "Study end year is required unless Currently Studying is selected.",
    });
  }

  if (value.studyEndYear !== undefined && value.studyEndYear < value.studyStartYear) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["studyEndYear"],
      message: "Study end year cannot be earlier than the study start year.",
    });
  }
});

const profileShape = {
  profilePhotoKey: z.string().trim().min(1).max(512).optional(),
  name: z.string().trim().min(2, "Enter your full name.").max(160).optional(),
  gender: z.enum(["male", "female"]).optional(),
  dateOfBirth: profileDateSchema.optional(),
  headline: z.string().trim().min(10, "Headline must be at least 10 characters.").max(siteLimitCeiling("tutor.headlineChars")).optional(),

  phone: bangladeshPhoneSchema.optional(),
  contactEmail: z.string().trim().email("Enter a valid email address.").max(320).optional(),
  currentCityId: locationIdSchema.optional(),
  currentLocationId: locationIdSchema.optional(),
  teachingAreaIds: optionalUniqueLocationIdList(15),
  availableNationwide: z.boolean().optional(),

  highestEducation: z.enum(academicEducationLevels).optional(),
  universityId: positiveIdSchema.optional(),
  facultyDepartmentId: positiveIdSchema.optional(),
  degreeMajorId: positiveIdSchema.optional(),
  degreeExamTitle: optionalTrimmedText(160),
  resultGpa: optionalTrimmedText(80),
  deptId: optionalTrimmedText(80),
  studyStatus: z.enum(["studying", "graduated", "professional"]).optional(),
  /** Collected while studying; `graduationYear` takes over once they finish. */
  yearSemester: optionalTrimmedText(80),
  graduationYear: studyYearSchema.optional(),

  primarySubjectIds: optionalUniqueIdList(12),
  additionalSubjectIds: optionalUniqueIdList(12),
  classLevelIds: optionalUniqueIdList(20),
  curriculumIds: optionalUniqueIdList(8),
  teachingExperienceYears: z.number().int().min(0).max(60).optional(),
  priorTeachingExperience: optionalTrimmedText(2000),
  specialExpertise: optionalTrimmedText(500),
  studentTypeIds: optionalUniqueIdList(8),
  academicAchievement: optionalTrimmedText(1000),

  tuitionType: z.enum(["home", "online", "both"]).optional(),
  preferredStudentGender: z.enum(["male", "female", "both"]).optional(),
  preferredClassSizes: uniqueEnumList(["one_to_one", "small_group", "group"], 3).optional(),
  preferredTeachingDays: uniqueEnumList(
    ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
    7,
  ).optional(),
  preferredTimeSlots: uniqueEnumList(["morning", "afternoon", "evening", "flexible"], 4).optional(),
  feeMin: z.number().int().min(0).max(500000).optional(),
  feeMax: z.number().int().min(0).max(500000).optional(),
  travelDistanceKm: z.number().int().min(1).max(100).optional(),

  teachingLanguageIds: optionalUniqueIdList(8),
  communicationPreferences: uniqueEnumList(["phone", "whatsapp", "platform_message"], 3).optional(),

  aboutMe: optionalTrimmedText(2000),
  teachingApproach: optionalTrimmedText(2000),
  whyChooseMe: optionalTrimmedText(2000),
  additionalNotes: optionalTrimmedText(2000),

  /** Private to Tutor and authorised Admin reviewers; NID remains excluded until encrypted storage is delivered. */
  privateDetails: privateDetailsSchema.optional(),
  educationRecords: z.array(educationRecordSchema).max(siteLimitCeiling("tutor.educationRecords")).optional(),
  /** The upload route owns the object key. The profile form may only report a safe state. */
  universityIdDocumentStatus: z.enum(["not_uploaded", "uploaded"]).optional(),
} satisfies z.ZodRawShape;

const {
  profilePhotoKey: _internalProfilePhotoKey,
  universityIdDocumentStatus: _internalUniversityIdDocumentStatus,
  ...editableProfileShape
} = profileShape;

function addCrossFieldIssues(
  value: z.infer<z.ZodObject<typeof profileShape>>,
  ctx: z.RefinementCtx,
) {
  const primaryIds = value.primarySubjectIds ?? [];
  const additionalIds = value.additionalSubjectIds ?? [];
  const overlap = additionalIds.some(id => primaryIds.includes(id));

  if (overlap) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["additionalSubjectIds"],
      message: "A subject cannot be both primary and additional.",
    });
  }

  if ((value.tuitionType === "online" || value.tuitionType === "both") && value.availableNationwide !== true) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["availableNationwide"],
      message: "Online or both tuition requires nationwide availability.",
    });
  }

  if (value.feeMin !== undefined && value.feeMax !== undefined && value.feeMin > value.feeMax) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      path: ["feeMax"],
      message: "Maximum fee must be greater than or equal to minimum fee.",
    });
  }
}

export const tutorProfileDraftSchema = z.object(profileShape).strict().superRefine(addCrossFieldIssues);
/** Client profile edits cannot set a storage key; only the protected upload route may do so. */
export const tutorProfileEditableDraftSchema = z.object(editableProfileShape).strict().superRefine(addCrossFieldIssues);

const submissionRequiredKeys = [
  "profilePhotoKey",
  "name",
  "gender",
  "dateOfBirth",
  "headline",
  "phone",
  "contactEmail",
  "currentCityId",
  "currentLocationId",
  "teachingAreaIds",
  "availableNationwide",
  "universityId",
  "facultyDepartmentId",
  "degreeExamTitle",
  "studyStatus",
  "primarySubjectIds",
  "classLevelIds",
  "curriculumIds",
  "teachingExperienceYears",
  "tuitionType",
  "preferredStudentGender",
  "preferredClassSizes",
  "preferredTeachingDays",
  "preferredTimeSlots",
  "feeMin",
  "feeMax",
  "teachingLanguageIds",
  "communicationPreferences",
] as const;

export const tutorProfileSubmissionSchema = tutorProfileDraftSchema.superRefine((value, ctx) => {
  for (const key of submissionRequiredKeys) {
    if (value[key] === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: [key],
        message: "This field is required before profile submission.",
      });
    }
  }

  const privateDetails = value.privateDetails;
  if (!privateDetails) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["privateDetails"], message: "Private identity information is required before profile submission." });
  } else {
    for (const field of ["nationality", "religion", "fatherName", "fatherPhone"] as const) {
      if (privateDetails[field] === undefined) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["privateDetails", field], message: "This field is required before profile submission." });
      }
    }
  }

  // Study status decides which half of the study timeline the Tutor must fill:
  // an in-progress year/semester, or the year they finished.
  if (value.studyStatus === "studying" && value.yearSemester === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["yearSemester"], message: "This field is required before profile submission." });
  }

  if ((value.studyStatus === "graduated" || value.studyStatus === "professional") && value.graduationYear === undefined) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graduationYear"], message: "This field is required before profile submission." });
  }

  if (!value.educationRecords?.length) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["educationRecords"], message: "Add at least one education record before profile submission." });
  }

  if (value.universityIdDocumentStatus !== "uploaded") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["universityIdDocumentStatus"], message: "Upload your University ID image before profile submission." });
  }
});

export type TutorProfileDraftInput = z.infer<typeof tutorProfileDraftSchema>;
export type TutorProfileEditableDraftInput = z.infer<typeof tutorProfileEditableDraftSchema>;
export type TutorProfileSubmissionInput = z.infer<typeof tutorProfileSubmissionSchema>;

export type TutorProfileCatalogReferences = {
  activeLocationIds: ReadonlySet<string>;
  activeUniversityIds: ReadonlySet<number>;
  activeFacultyDepartmentIds: ReadonlySet<number>;
  activeDegreeMajorFacultyDepartmentIds: ReadonlyMap<number, number>;
  activeSubjectIds: ReadonlySet<number>;
  activeClassLevelIds: ReadonlySet<number>;
  activeCurriculumIds: ReadonlySet<number>;
  activeStudentTypeIds: ReadonlySet<number>;
  activeLanguageIds: ReadonlySet<number>;
};

export type TutorProfileCatalogReferenceIssue = {
  path: string[];
  message: string;
};

type CatalogReferenceProfile = Pick<
  TutorProfileDraftInput,
  | "currentCityId"
  | "currentLocationId"
  | "teachingAreaIds"
  | "universityId"
  | "facultyDepartmentId"
  | "degreeMajorId"
  | "primarySubjectIds"
  | "additionalSubjectIds"
  | "classLevelIds"
  | "curriculumIds"
  | "studentTypeIds"
  | "teachingLanguageIds"
>;

function addMissingCatalogIdIssues<T>(
  issues: TutorProfileCatalogReferenceIssue[],
  path: string,
  ids: readonly T[] | undefined,
  activeIds: ReadonlySet<T>,
  label: string,
) {
  if (!ids) return;

  for (const id of ids) {
    if (!activeIds.has(id)) {
      issues.push({
        path: [path],
        message: `The selected ${label} is unavailable. Please choose an active option.`,
      });
      return;
    }
  }
}

/**
 * Validates catalog-backed values after structural Zod parsing and before a
 * profile update is persisted. The references must contain active records only;
 * callers derive them from the catalog database in the same request scope.
 */
export function validateTutorProfileCatalogReferences(
  profile: CatalogReferenceProfile,
  references: TutorProfileCatalogReferences,
): TutorProfileCatalogReferenceIssue[] {
  const issues: TutorProfileCatalogReferenceIssue[] = [];

  if (profile.currentCityId !== undefined && !references.activeLocationIds.has(profile.currentCityId)) {
    issues.push({
      path: ["currentCityId"],
      message: "The selected current city is unavailable. Please choose an active option.",
    });
  }

  if (profile.currentLocationId !== undefined && !references.activeLocationIds.has(profile.currentLocationId)) {
    issues.push({
      path: ["currentLocationId"],
      message: "The selected current location is unavailable. Please choose an active option.",
    });
  }

  addMissingCatalogIdIssues(issues, "teachingAreaIds", profile.teachingAreaIds, references.activeLocationIds, "teaching area");

  if (profile.universityId !== undefined && !references.activeUniversityIds.has(profile.universityId)) {
    issues.push({
      path: ["universityId"],
      message: "The selected university is unavailable. Please choose an active option.",
    });
  }

  if (profile.facultyDepartmentId !== undefined && !references.activeFacultyDepartmentIds.has(profile.facultyDepartmentId)) {
    issues.push({
      path: ["facultyDepartmentId"],
      message: "The selected department or subject is unavailable. Please choose an active option.",
    });
  }

  if (profile.degreeMajorId !== undefined) {
    const parentFacultyDepartmentId = references.activeDegreeMajorFacultyDepartmentIds.get(profile.degreeMajorId);
    if (parentFacultyDepartmentId === undefined) {
      issues.push({
        path: ["degreeMajorId"],
        message: "The selected degree or major is unavailable. Please choose an active option.",
      });
    } else if (
      profile.facultyDepartmentId !== undefined &&
      parentFacultyDepartmentId !== profile.facultyDepartmentId
    ) {
      issues.push({
        path: ["degreeMajorId"],
        message: "The selected degree or major does not belong to the selected faculty or department.",
      });
    }
  }

  addMissingCatalogIdIssues(issues, "primarySubjectIds", profile.primarySubjectIds, references.activeSubjectIds, "primary subject");
  addMissingCatalogIdIssues(issues, "additionalSubjectIds", profile.additionalSubjectIds, references.activeSubjectIds, "additional subject");
  addMissingCatalogIdIssues(issues, "classLevelIds", profile.classLevelIds, references.activeClassLevelIds, "class level");
  addMissingCatalogIdIssues(issues, "curriculumIds", profile.curriculumIds, references.activeCurriculumIds, "curriculum");
  addMissingCatalogIdIssues(issues, "studentTypeIds", profile.studentTypeIds, references.activeStudentTypeIds, "student type");
  addMissingCatalogIdIssues(issues, "teachingLanguageIds", profile.teachingLanguageIds, references.activeLanguageIds, "teaching language");

  return issues;
}

function hasNonEmptyString(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasPositiveId(value: unknown) {
  return typeof value === "number" && Number.isInteger(value) && value > 0;
}

function hasLocationId(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

function hasSelections(value: unknown) {
  return Array.isArray(value) && value.length > 0;
}

/** Study status decides which timeline field counts toward completion. */
function hasStudyTimeline(profile: Record<string, unknown>) {
  if (profile.studyStatus === "studying") return hasNonEmptyString(profile.yearSemester);
  if (profile.studyStatus === "graduated" || profile.studyStatus === "professional") {
    return typeof profile.graduationYear === "number" && Number.isInteger(profile.graduationYear);
  }
  return false;
}

export function calculateTutorProfileCompletion(profile: Record<string, unknown>) {
  const completedUnits = [
    hasNonEmptyString(profile.profilePhotoKey),
    hasNonEmptyString(profile.name),
    profile.gender === "male" || profile.gender === "female",
    hasNonEmptyString(profile.dateOfBirth),
    hasNonEmptyString(profile.headline),
    hasNonEmptyString(profile.phone),
    hasNonEmptyString(profile.contactEmail),
    hasLocationId(profile.currentCityId),
    hasLocationId(profile.currentLocationId),
    hasSelections(profile.teachingAreaIds),
    typeof profile.availableNationwide === "boolean",
    hasPositiveId(profile.universityId),
    hasPositiveId(profile.facultyDepartmentId),
    hasNonEmptyString(profile.degreeExamTitle),
    profile.studyStatus === "studying" || profile.studyStatus === "graduated" || profile.studyStatus === "professional",
    hasStudyTimeline(profile),
    hasSelections(profile.primarySubjectIds),
    hasSelections(profile.classLevelIds),
    hasSelections(profile.curriculumIds),
    typeof profile.teachingExperienceYears === "number" && Number.isInteger(profile.teachingExperienceYears) && profile.teachingExperienceYears >= 0,
    profile.tuitionType === "home" || profile.tuitionType === "online" || profile.tuitionType === "both",
    profile.preferredStudentGender === "male" || profile.preferredStudentGender === "female" || profile.preferredStudentGender === "both",
    hasSelections(profile.preferredClassSizes),
    hasSelections(profile.preferredTeachingDays),
    hasSelections(profile.preferredTimeSlots),
    typeof profile.feeMin === "number" && typeof profile.feeMax === "number" && profile.feeMin >= 0 && profile.feeMin <= profile.feeMax,
    hasSelections(profile.teachingLanguageIds),
    hasSelections(profile.communicationPreferences),
  ];

  // Derived from the list itself so adding a unit can never leave a stale divisor.
  return Math.round((completedUnits.filter(Boolean).length / completedUnits.length) * 100);
}
