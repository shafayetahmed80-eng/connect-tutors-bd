const tutorProfileFieldPathAllowlist = new Set([
  "profilePhotoKey",
  "name",
  "gender",
  "dateOfBirth",
  "headline",
  "phone",
  "contactEmail",
  "currentLocationId",
  "teachingAreaIds",
  "availableNationwide",
  "highestEducation",
  "universityId",
  "facultyDepartmentId",
  "degreeMajorId",
  "studyStatus",
  "graduationYear",
  "primarySubjectIds",
  "additionalSubjectIds",
  "classLevelIds",
  "curriculumIds",
  "teachingExperienceYears",
  "priorTeachingExperience",
  "specialExpertise",
  "studentTypeIds",
  "academicAchievement",
  "tuitionType",
  "tuitionTypes",
  "preferredStudentGender",
  "preferredClassSizes",
  "preferredTeachingDays",
  "preferredTimeSlots",
  "feeMin",
  "feeMax",
  "travelDistanceKm",
  "teachingLanguageIds",
  "communicationPreferences",
  "aboutMe",
  "teachingApproach",
  "whyChooseMe",
  "additionalNotes",
]);

export type SafeTutorProfileFieldIssue = {
  /** One segment for a field; a few more for something inside a record, e.g. ["educationRecords", 0, "passingYear"]. */
  path: Array<string | number>;
  message: string;
};

/** Containers whose inner fields the Tutor can be told about, because they are theirs to fix. */
const nestedContainers = new Set(["educationRecords", "privateDetails"]);
const MAX_NESTED_SEGMENTS = 4;

/**
 * Reduces validator output to a deliberately small client contract. Only known,
 * top-level editable Tutor Profile fields are exposed; nested paths and internal
 * implementation details are always discarded.
 */
export function getSafeTutorProfileFieldIssues(issues: unknown): SafeTutorProfileFieldIssue[] {
  if (!Array.isArray(issues)) return [];

  return issues.flatMap(issue => {
    if (!issue || typeof issue !== "object") return [];
    const candidate = issue as { path?: unknown; message?: unknown };
    if (!Array.isArray(candidate.path) || candidate.path.length === 0 || candidate.path.length > MAX_NESTED_SEGMENTS) return [];
    if (typeof candidate.message !== "string" || !candidate.message.trim()) return [];
    const [field, ...inner] = candidate.path;
    if (typeof field !== "string") return [];
    if (inner.length === 0) return tutorProfileFieldPathAllowlist.has(field) ? [{ path: [field], message: candidate.message }] : [];
    if (!nestedContainers.has(field)) return [];
    if (!inner.every(segment => (typeof segment === "string" && /^\w+$/.test(segment)) || (typeof segment === "number" && Number.isInteger(segment) && segment >= 0))) return [];
    return [{ path: [field, ...inner] as Array<string | number>, message: candidate.message }];
  });
}
