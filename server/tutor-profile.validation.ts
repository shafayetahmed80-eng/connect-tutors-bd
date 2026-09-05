import { z } from "zod";
import { siteLimitCeiling } from "@shared/site-limits";
import {
  MIN_STUDY_YEAR,
  academicEducationLevels,
  maxStudyYear,
  qualificationCurricula,
  qualificationEducationLevels,
} from "@shared/tutor-education";
import { defaultTutorProfileFieldConfig, type ResolvedTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";

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
  // Optional here so an incomplete record can still be saved as a draft -
  // whether one is actually required to *submit* is decided per field by the
  // resolved Tutor Profile field config, the same as every top-level field.
  qualificationLevel: z.enum(qualificationEducationLevels).optional(),
  instituteName: z.string().trim().min(2).max(200).optional(),
  degreeExamTitle: z.string().trim().min(2).max(160).optional(),
  majorGroup: z.string().trim().min(2).max(160).optional(),
  resultGpa: optionalTrimmedText(80),
  curriculum: z.enum(qualificationCurricula).optional(),
  studyStartYear: studyYearSchema.optional(),
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

  if (value.studyEndYear !== undefined && value.studyStartYear !== undefined && value.studyEndYear < value.studyStartYear) {
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

/**
 * A registry id like `"profilePhotoUrl"` doesn't always name the schema key
 * it governs - the profile form's photo *value* is `profilePhotoKey` here.
 * Every other id matches its schema key (or its `privateDetails.`/
 * `educationRecords.` prefix) directly.
 */
const registryIdToSchemaKey: Record<string, string> = {
  profilePhotoUrl: "profilePhotoKey",
};

function isSubmissionFieldPresent(value: TutorProfileDraftInput, fieldId: string): boolean {
  if (fieldId === "universityIdDocumentStatus") return value.universityIdDocumentStatus === "uploaded";
  if (fieldId.startsWith("privateDetails.")) {
    const key = fieldId.slice("privateDetails.".length) as keyof NonNullable<TutorProfileDraftInput["privateDetails"]>;
    return value.privateDetails?.[key] !== undefined;
  }
  const schemaKey = registryIdToSchemaKey[fieldId] ?? fieldId;
  return (value as Record<string, unknown>)[schemaKey] !== undefined;
}

/**
 * Builds the submission-required check from the resolved Tutor Profile field
 * config instead of a fixed list, so an Owner's reorder/enable/required
 * overrides (see `shared/tutor-profile-field-registry.ts`) take effect.
 *
 * `yearSemester`/`graduationYear` and `educationRecords.studyEndYear` stay
 * unconditional code logic, never config-driven - their requiredness already
 * branches on another field (`studyStatus`, `currentlyStudying`), and the
 * registry marks them `requiredConfigurable: false` for exactly that reason.
 * `supportingDocument.*` overrides are accepted by the save mutation but not
 * enforced here yet - there is no "attempted but not uploaded" state to check
 * against, only "which types have been uploaded".
 */
export function buildTutorProfileSubmissionRefinement(config: ResolvedTutorProfileFieldConfig) {
  return (value: TutorProfileDraftInput, ctx: z.RefinementCtx) => {
    for (const field of Array.from(config.byId.values())) {
      // A `requiredConfigurable: false` field's requiredness already branches
      // on another field in code (below) - the generic loop must leave it
      // alone entirely, not treat `requiredByDefault` as a flat requirement.
      if (!field.requiredConfigurable) continue;
      if (!field.enabled || !field.required) continue;
      if (field.id === "educationRecords" || field.id.startsWith("educationRecords.") || field.id.startsWith("supportingDocument.")) continue;
      if (!isSubmissionFieldPresent(value, field.id)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: field.id.split("."),
          message: "This field is required before profile submission.",
        });
      }
    }

    // Study status decides which half of the study timeline the Tutor must fill:
    // an in-progress year/semester, or the year they finished. Code-owned.
    if (value.studyStatus === "studying" && value.yearSemester === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["yearSemester"], message: "This field is required before profile submission." });
    }
    if ((value.studyStatus === "graduated" || value.studyStatus === "professional") && value.graduationYear === undefined) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["graduationYear"], message: "This field is required before profile submission." });
    }

    const educationRecordsField = config.byId.get("educationRecords");
    if (educationRecordsField?.enabled && educationRecordsField.required && !value.educationRecords?.length) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["educationRecords"], message: "Add at least one education record before profile submission." });
    }

    if (value.educationRecords?.length) {
      const requiredRecordFields = Array.from(config.byId.values()).filter(
        field => field.id.startsWith("educationRecords.") && field.requiredConfigurable && field.enabled && field.required,
      );
      value.educationRecords.forEach((record, index) => {
        for (const field of requiredRecordFields) {
          const key = field.id.slice("educationRecords.".length) as keyof typeof record;
          if (record[key] === undefined) {
            ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["educationRecords", index, key], message: "This field is required before profile submission." });
          }
        }
      });
    }
  };
}

/** The submission schema at the shipped defaults - what every existing test validates against. */
export const tutorProfileSubmissionSchema = tutorProfileDraftSchema.superRefine(
  buildTutorProfileSubmissionRefinement(defaultTutorProfileFieldConfig()),
);

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

/**
 * Each unit names the single registry field it represents, so a field an
 * Owner disables drops out of both the numerator and the denominator instead
 * of permanently counting against - or for - completion. `id: null` marks a
 * unit that doesn't reduce to one field (the study timeline is whichever of
 * two fields `studyStatus` selects; the fee check spans both `feeMin` and
 * `feeMax`) - those stay unconditionally counted, same as before this config
 * awareness existed.
 */
export function calculateTutorProfileCompletion(
  profile: Record<string, unknown>,
  config: ResolvedTutorProfileFieldConfig = defaultTutorProfileFieldConfig(),
) {
  const units: Array<{ id: string | null; ok: boolean }> = [
    { id: "profilePhotoUrl", ok: hasNonEmptyString(profile.profilePhotoKey) },
    { id: "name", ok: hasNonEmptyString(profile.name) },
    { id: "gender", ok: profile.gender === "male" || profile.gender === "female" },
    { id: "dateOfBirth", ok: hasNonEmptyString(profile.dateOfBirth) },
    { id: "headline", ok: hasNonEmptyString(profile.headline) },
    { id: "phone", ok: hasNonEmptyString(profile.phone) },
    { id: "contactEmail", ok: hasNonEmptyString(profile.contactEmail) },
    { id: "currentCityId", ok: hasLocationId(profile.currentCityId) },
    { id: "currentLocationId", ok: hasLocationId(profile.currentLocationId) },
    { id: "teachingAreaIds", ok: hasSelections(profile.teachingAreaIds) },
    { id: "availableNationwide", ok: typeof profile.availableNationwide === "boolean" },
    { id: "universityId", ok: hasPositiveId(profile.universityId) },
    { id: "facultyDepartmentId", ok: hasPositiveId(profile.facultyDepartmentId) },
    { id: "degreeExamTitle", ok: hasNonEmptyString(profile.degreeExamTitle) },
    { id: "studyStatus", ok: profile.studyStatus === "studying" || profile.studyStatus === "graduated" || profile.studyStatus === "professional" },
    { id: null, ok: hasStudyTimeline(profile) },
    { id: "primarySubjectIds", ok: hasSelections(profile.primarySubjectIds) },
    { id: "classLevelIds", ok: hasSelections(profile.classLevelIds) },
    { id: "curriculumIds", ok: hasSelections(profile.curriculumIds) },
    { id: "teachingExperienceYears", ok: typeof profile.teachingExperienceYears === "number" && Number.isInteger(profile.teachingExperienceYears) && profile.teachingExperienceYears >= 0 },
    { id: "tuitionType", ok: profile.tuitionType === "home" || profile.tuitionType === "online" || profile.tuitionType === "both" },
    { id: "preferredStudentGender", ok: profile.preferredStudentGender === "male" || profile.preferredStudentGender === "female" || profile.preferredStudentGender === "both" },
    { id: "preferredClassSizes", ok: hasSelections(profile.preferredClassSizes) },
    { id: "preferredTeachingDays", ok: hasSelections(profile.preferredTeachingDays) },
    { id: "preferredTimeSlots", ok: hasSelections(profile.preferredTimeSlots) },
    { id: null, ok: typeof profile.feeMin === "number" && typeof profile.feeMax === "number" && profile.feeMin >= 0 && profile.feeMin <= profile.feeMax },
    { id: "teachingLanguageIds", ok: hasSelections(profile.teachingLanguageIds) },
    { id: "communicationPreferences", ok: hasSelections(profile.communicationPreferences) },
  ];

  const countedUnits = units.filter(unit => unit.id === null || (config.byId.get(unit.id)?.enabled ?? true));
  // Derived from the list itself so adding a unit can never leave a stale divisor.
  return Math.round((countedUnits.filter(unit => unit.ok).length / countedUnits.length) * 100);
}
