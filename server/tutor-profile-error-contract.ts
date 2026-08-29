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
  path: [string];
  message: string;
};

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
    if (!Array.isArray(candidate.path) || candidate.path.length !== 1) return [];
    const [field] = candidate.path;
    if (typeof field !== "string" || !tutorProfileFieldPathAllowlist.has(field)) return [];
    if (typeof candidate.message !== "string" || !candidate.message.trim()) return [];
    return [{ path: [field], message: candidate.message }];
  });
}
