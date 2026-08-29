import { tutorProfileCopy, type TutorProfileSubmissionErrorKey, type TutorProfileSubmissionErrors } from "./TutorProfileUx";

type ServerFieldIssue = {
  path?: unknown;
  message?: unknown;
};

type TrpcValidationError = {
  data?: {
    tutorProfileFieldIssues?: unknown;
  };
};

const serverFieldToClientErrorKey: Partial<Record<string, TutorProfileSubmissionErrorKey>> = {
  profilePhotoKey: "profilePhotoUrl",
};

const serverFieldLabels: Partial<Record<TutorProfileSubmissionErrorKey, string>> = {
  profilePhotoUrl: tutorProfileCopy.fields.photo,
  name: tutorProfileCopy.fields.fullName,
  gender: tutorProfileCopy.fields.gender,
  dateOfBirth: tutorProfileCopy.fields.dateOfBirth,
  headline: tutorProfileCopy.fields.headline,
  phone: tutorProfileCopy.fields.phone,
  contactEmail: tutorProfileCopy.fields.email,
  currentLocationId: tutorProfileCopy.fields.currentLocation,
  teachingAreaIds: tutorProfileCopy.fields.teachingAreas,
  availableNationwide: "Available Nationwide",
  universityId: tutorProfileCopy.fields.university,
  facultyId: tutorProfileCopy.fields.faculty,
  facultyDepartmentId: tutorProfileCopy.fields.facultyDepartment,
  studyStatus: tutorProfileCopy.fields.studyStatus,
  primarySubjectIds: tutorProfileCopy.fields.primarySubjects,
  additionalSubjectIds: tutorProfileCopy.fields.additionalSubjects,
  classLevelIds: tutorProfileCopy.fields.classLevels,
  curriculumIds: tutorProfileCopy.fields.curricula,
  teachingExperienceYears: tutorProfileCopy.fields.teachingExperience,
  studentTypeIds: tutorProfileCopy.fields.studentTypes,
  tuitionType: tutorProfileCopy.fields.tuitionType,
  preferredStudentGender: tutorProfileCopy.fields.preferredStudentGender,
  preferredClassSizes: tutorProfileCopy.fields.classSizes,
  preferredTeachingDays: tutorProfileCopy.fields.teachingDays,
  preferredTimeSlots: tutorProfileCopy.fields.timeSlots,
  feeMin: tutorProfileCopy.fields.feeMin,
  feeMax: tutorProfileCopy.fields.feeMax,
  teachingLanguageIds: tutorProfileCopy.fields.teachingLanguages,
  communicationPreferences: tutorProfileCopy.fields.communicationPreferences,
};

function getClientErrorKey(path: string): TutorProfileSubmissionErrorKey | undefined {
  const key = serverFieldToClientErrorKey[path] ?? path as TutorProfileSubmissionErrorKey;
  return serverFieldLabels[key] ? key : undefined;
}

/**
 * Converts the narrow server validation contract into the same inline English
 * errors used by client-side profile validation. The server message is purposely
 * not displayed because the UI owns the consistent recovery copy.
 */
export function getTutorProfileServerValidationErrors(error: unknown): TutorProfileSubmissionErrors {
  if (!error || typeof error !== "object") return {};
  const issues = (error as TrpcValidationError).data?.tutorProfileFieldIssues;
  if (!Array.isArray(issues)) return {};

  return issues.reduce<TutorProfileSubmissionErrors>((errors, issue) => {
    const candidate = issue as ServerFieldIssue;
    if (!candidate || !Array.isArray(candidate.path) || candidate.path.length !== 1 || typeof candidate.path[0] !== "string") return errors;
    if (typeof candidate.message !== "string") return errors;

    const key = getClientErrorKey(candidate.path[0]);
    const label = key ? serverFieldLabels[key] : undefined;
    if (key && label) errors[key] = `Check ${label} and try again.`;
    return errors;
  }, {});
}
