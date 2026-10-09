import { tutorProfileCopy, type TutorProfileSubmissionErrorKey, type TutorProfileSubmissionErrors } from "./TutorProfileUx";
import { getTutorProfileStepTitleForField } from "./TutorProfileWizard";

type ServerFieldIssue = {
  path?: unknown;
  message?: unknown;
};

type TrpcValidationError = {
  data?: {
    tutorProfileFieldIssues?: unknown;
    zodFieldErrors?: unknown;
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
  currentCityId: tutorProfileCopy.fields.currentCity,
  currentLocationId: tutorProfileCopy.fields.currentLocation,
  teachingAreaIds: tutorProfileCopy.fields.teachingAreas,
  universityId: tutorProfileCopy.fields.university,
  facultyDepartmentId: tutorProfileCopy.fields.facultyDepartment,
  degreeExamTitle: tutorProfileCopy.fields.degreeExamTitle,
  studyStatus: tutorProfileCopy.fields.studyStatus,
  yearSemester: tutorProfileCopy.fields.yearSemester,
  graduationYear: tutorProfileCopy.fields.graduationYear,
  primarySubjectIds: tutorProfileCopy.fields.primarySubjects,
  additionalSubjectIds: tutorProfileCopy.fields.additionalSubjects,
  classLevelIds: tutorProfileCopy.fields.classLevels,
  curriculumIds: tutorProfileCopy.fields.curricula,
  teachingExperienceYears: tutorProfileCopy.fields.teachingExperience,
  studentTypeIds: tutorProfileCopy.fields.studentTypes,
  tuitionTypes: tutorProfileCopy.fields.tuitionType,
  preferredStudentGender: tutorProfileCopy.fields.preferredStudentGender,
  preferredTeachingDays: tutorProfileCopy.fields.teachingDays,
  preferredTimeSlots: tutorProfileCopy.fields.timeSlots,
  feeMin: tutorProfileCopy.fields.feeMin,
  feeMax: tutorProfileCopy.fields.feeMax,
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
/**
 * Whether the server rejected specific fields, whatever this module managed to
 * map. Only single-segment paths become inline errors, so an issue inside an
 * education record maps to nothing - and the caller would otherwise fall back
 * to blaming the connection for a request that arrived and was answered.
 */
export function hasTutorProfileFieldIssues(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const issues = (error as TrpcValidationError).data?.tutorProfileFieldIssues;
  return Array.isArray(issues) && issues.length > 0;
}

/** "facultyDepartmentId" -> "Faculty department", for a field this screen has no label for. */
function humanizeFieldName(name: string): string {
  const words = name.replace(/(Ids?|Key)$/, "").replace(/([a-z0-9])([A-Z])/g, "$1 $2").trim().toLowerCase();
  return words ? words.charAt(0).toUpperCase() + words.slice(1) : name;
}

const MAX_ISSUE_DETAILS = 8;

/**
 * Every reason the server gave for refusing a save, one line each, with the
 * part of the profile it belongs to - so a Tutor whose Availability will not
 * save because of Teaching areas is told so, instead of being sent to look in
 * the popup they have open. Includes problems inside an education record or a
 * private detail, which have no field of their own on this screen.
 */
export function getTutorProfileServerIssueDetails(error: unknown): string[] {
  if (!error || typeof error !== "object") return [];
  const data = (error as TrpcValidationError).data;
  const lines: string[] = [];

  const issues = data?.tutorProfileFieldIssues;
  if (Array.isArray(issues)) {
    for (const issue of issues as ServerFieldIssue[]) {
      if (!issue || !Array.isArray(issue.path) || issue.path.length === 0 || typeof issue.message !== "string" || !issue.message.trim()) continue;
      const [head, ...inner] = issue.path;
      if (typeof head !== "string") continue;
      let where: string;
      if (head === "educationRecords") {
        const record = typeof inner[0] === "number" ? `record ${inner[0] + 1}` : null;
        const field = inner.find((segment): segment is string => typeof segment === "string");
        where = ["Education", ["Education history", record, field ? humanizeFieldName(field) : null].filter(Boolean).join(", ")].join(" · ");
      } else if (head === "privateDetails") {
        const field = inner.find((segment): segment is string => typeof segment === "string");
        where = field ? humanizeFieldName(field) : "Private details";
      } else {
        const key = getClientErrorKey(head);
        const label = (key ? serverFieldLabels[key] : undefined) ?? humanizeFieldName(head);
        const section = getTutorProfileStepTitleForField(key ?? head);
        where = section ? `${section} · ${label}` : label;
      }
      lines.push(`${where}: ${issue.message.trim()}`);
    }
  }

  // A request the server's own input check turned away before the profile
  // rules ran carries its reasons here instead.
  const zodFieldErrors = data?.zodFieldErrors;
  if (lines.length === 0 && zodFieldErrors && typeof zodFieldErrors === "object") {
    for (const [field, messages] of Object.entries(zodFieldErrors as Record<string, unknown>)) {
      const first = Array.isArray(messages) ? messages.find((message): message is string => typeof message === "string" && Boolean(message.trim())) : undefined;
      if (!first) continue;
      const key = getClientErrorKey(field);
      lines.push(`${(key ? serverFieldLabels[key] : undefined) ?? humanizeFieldName(field)}: ${first.trim()}`);
    }
  }

  return Array.from(new Set(lines)).slice(0, MAX_ISSUE_DETAILS);
}

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
