import { isStudyYear } from "@shared/tutor-education";
import type { ResolvedTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";
import { offersOnlineTuitionOnly } from "@shared/tutor-profile-tuition";
import type { TutorProfileFormState } from "./TutorProfileFormData";

export const tutorProfileCopy = {
  fields: {
    photo: "Profile Photo",
    fullName: "Full Name",
    gender: "Gender",
    dateOfBirth: "Date of Birth",
    headline: "Professional Headline",
    phone: "Mobile Number",
    email: "Email Address",
    currentCity: "Current City",
    currentLocation: "Current Location",
    teachingAreas: "Teaching Areas",
    university: "Institute",
    facultyDepartment: "Related Department / Subject",
    educationLevel: "Education Level",
    degreeExamTitle: "Degree / Exam Title",
    resultGpa: "Result / GPA",
    deptId: "Dept ID",
    studyStatus: "Current Study Status",
    yearSemester: "Year/Semester",
    graduationYear: "Graduation Year",
    primarySubjects: "Primary Subjects",
    additionalSubjects: "Additional Subjects",
    classLevels: "Class / Level",
    curricula: "Curriculum",
    teachingExperience: "Teaching Experience (Years)",
    studentTypes: "Student Types",
    tuitionType: "Tuition Type",
    preferredStudentGender: "Preferred Student Gender",
    teachingDays: "Preferred Teaching Days",
    timeSlots: "Preferred Time Slots",
    feeMin: "Minimum Monthly Fee",
    feeMax: "Maximum Monthly Fee",
  },
  actions: {
    saveDraft: "Save Draft",
    submitForReview: "Submit for Review",
  },
} as const;

export type TutorProfileSubmissionPreview = TutorProfileFormState & {
  primarySubjectIds: string[];
  additionalSubjectIds: string[];
  classLevelIds: string[];
  curriculumIds: string[];
  teachingExperienceYears: string;
  studentTypeIds: string[];
};

export type TutorProfileSubmissionErrorKey = keyof TutorProfileSubmissionPreview | "profilePhotoUrl";
export type TutorProfileSubmissionErrors = Partial<Record<TutorProfileSubmissionErrorKey, string>>;

export type TutorProfileCompletionSummary = {
  completed: boolean;
  missingCount: number;
  completedCount: number;
  totalRequired: number;
  completionPercentage: number;
  message: string;
  firstMissingKey?: TutorProfileSubmissionErrorKey;
  firstMissingLabel?: string;
};

const completionFieldLabels: Partial<Record<TutorProfileSubmissionErrorKey, string>> = {
  profilePhotoUrl: tutorProfileCopy.fields.photo,
  name: tutorProfileCopy.fields.fullName,
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

/** The registry id behind a submission check, where it is not the check's own key. */
const registryIdByErrorKey: Partial<Record<TutorProfileSubmissionErrorKey, string>> = { tuitionTypes: "tuitionType" };

export function registryIdForErrorKey(key: TutorProfileSubmissionErrorKey): string {
  return registryIdByErrorKey[key] ?? key;
}

/**
 * Whether the Owner's field settings still ask for this detail. A field the
 * Owner has switched off or made optional is not asked for here either - the
 * server already judges the submission by those settings, so a check that
 * ignored them would turn a Tutor back from a profile the server would accept,
 * over a box the form no longer shows. Without settings every detail is asked for.
 */
function isDetailRequired(config: ResolvedTutorProfileFieldConfig | undefined, key: TutorProfileSubmissionErrorKey): boolean {
  const field = config?.byId.get(registryIdForErrorKey(key));
  if (!field || !field.requiredConfigurable) return true;
  return field.enabled && field.required;
}

/** The names of the details an incomplete submission is missing, in the order the checks run. */
export function describeMissingDetails(
  errors: TutorProfileSubmissionErrors,
  labelFor: (registryId: string, fallback: string) => string = (_registryId, fallback) => fallback,
): string[] {
  return (Object.keys(errors) as TutorProfileSubmissionErrorKey[]).map(key => labelFor(registryIdForErrorKey(key), completionFieldLabels[key] ?? "Required detail"));
}

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requiredSelection(errors: TutorProfileSubmissionErrors, key: TutorProfileSubmissionErrorKey, message: string, values: string[]) {
  if (values.length === 0) errors[key] = message;
}

/** Shows immediate client-side guidance for predictable submission requirements. */
export function getTutorProfileSubmissionErrors(form: TutorProfileSubmissionPreview, config?: ResolvedTutorProfileFieldConfig): TutorProfileSubmissionErrors {
  const errors: TutorProfileSubmissionErrors = {};
  const feeMin = form.feeMin.trim() ? Number(form.feeMin) : undefined;
  const feeMax = form.feeMax.trim() ? Number(form.feeMax) : undefined;

  if (!form.profilePhotoUrl) errors.profilePhotoUrl = "Add a profile photo.";
  if (form.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!form.dateOfBirth) errors.dateOfBirth = "Enter your date of birth.";
  else if (!isCalendarDate(form.dateOfBirth)) errors.dateOfBirth = "Enter a valid date of birth.";
  else if (new Date(`${form.dateOfBirth}T00:00:00.000Z`).getTime() > Date.now()) errors.dateOfBirth = "Your date of birth cannot be in the future.";
  if (form.headline.trim().length < 10) errors.headline = "Enter a headline with at least 10 characters.";
  if (!/^\+8801[3-9]\d{8}$/.test(form.phone.trim())) errors.phone = "Enter a valid Bangladesh mobile number.";
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) errors.contactEmail = "Enter a valid email address.";
  if (!form.currentCityId) errors.currentCityId = "Select your current city.";
  if (!form.currentLocationId) errors.currentLocationId = "Select your current location.";
  // An online-only Tutor has no place to teach in, so Teaching Areas is theirs to leave empty.
  if (!offersOnlineTuitionOnly(form)) requiredSelection(errors, "teachingAreaIds", "Select at least one teaching area.", form.teachingAreaIds);
  if (!form.universityId) errors.universityId = "Select your institute.";
  if (!form.facultyDepartmentId) errors.facultyDepartmentId = "Select your related department or subject.";
  if (!form.degreeExamTitle.trim()) errors.degreeExamTitle = "Enter your degree or exam title.";
  if (!form.studyStatus) errors.studyStatus = "Select your current study status.";
  // Study status decides which half of the study timeline is required.
  else if (form.studyStatus === "studying") {
    if (!form.yearSemester.trim()) errors.yearSemester = "Enter your current year or semester.";
  } else if (!isStudyYear(Number(form.graduationYear))) {
    errors.graduationYear = "Enter your graduation year.";
  }
  requiredSelection(errors, "primarySubjectIds", "Select at least one primary subject.", form.primarySubjectIds);
  requiredSelection(errors, "classLevelIds", "Select at least one class or level.", form.classLevelIds);
  requiredSelection(errors, "curriculumIds", "Select at least one curriculum.", form.curriculumIds);
  if (!/^\d+$/.test(form.teachingExperienceYears) || Number(form.teachingExperienceYears) < 0 || Number(form.teachingExperienceYears) > 60) errors.teachingExperienceYears = "Enter teaching experience between 0 and 60 years.";
  requiredSelection(errors, "tuitionTypes", "Select at least one tuition type.", form.tuitionTypes);
  if (!form.preferredStudentGender) errors.preferredStudentGender = "Select a preferred student gender.";
  requiredSelection(errors, "preferredTeachingDays", "Select at least one teaching day.", form.preferredTeachingDays);
  requiredSelection(errors, "preferredTimeSlots", "Select at least one time slot.", form.preferredTimeSlots);
  if (!Number.isInteger(feeMin) || (feeMin ?? 0) < 0) errors.feeMin = "Enter a minimum monthly fee.";
  if (!Number.isInteger(feeMax) || (feeMax ?? 0) < 0) errors.feeMax = "Enter a maximum monthly fee.";
  else if (feeMin !== undefined && feeMax !== undefined && feeMin > feeMax) errors.feeMax = "The maximum fee cannot be lower than the minimum fee.";

  for (const key of Object.keys(errors) as TutorProfileSubmissionErrorKey[]) {
    if (!isDetailRequired(config, key)) delete errors[key];
  }
  return errors;
}

/** The checks that apply to every Tutor, before the two that depend on other answers. */
const unconditionalChecks: TutorProfileSubmissionErrorKey[] = [
  "profilePhotoUrl", "name", "dateOfBirth", "headline", "phone", "contactEmail", "currentCityId", "currentLocationId",
  "universityId", "facultyDepartmentId", "degreeExamTitle", "studyStatus", "primarySubjectIds", "classLevelIds",
  "curriculumIds", "teachingExperienceYears", "tuitionTypes", "preferredStudentGender", "preferredTeachingDays",
  "preferredTimeSlots", "feeMin", "feeMax",
];

/** Creates a concise client-side completion cue; the server remains authoritative. */
export function getTutorProfileCompletionSummary(form: TutorProfileSubmissionPreview, config?: ResolvedTutorProfileFieldConfig): TutorProfileCompletionSummary {
  const errors = getTutorProfileSubmissionErrors(form, config);
  const missingKeys = Object.keys(errors) as TutorProfileSubmissionErrorKey[];
  const firstMissingKey = missingKeys[0];
  const missingCount = missingKeys.length;
  // The unconditional checks the Owner's settings still ask for, plus the two
  // gated ones: the study timeline only applies once a study status is chosen,
  // and Teaching Areas does not apply to a Tutor who offers only online tuition.
  const totalRequired = unconditionalChecks.filter(key => isDetailRequired(config, key)).length
    + (form.studyStatus ? 1 : 0)
    + (offersOnlineTuitionOnly(form) || !isDetailRequired(config, "teachingAreaIds") ? 0 : 1);
  const completedCount = totalRequired - missingCount;
  const completionPercentage = Math.round((completedCount / totalRequired) * 100);

  if (missingCount === 0) {
    return { completed: true, missingCount: 0, completedCount, totalRequired, completionPercentage, message: "All required details are complete. You can submit your profile for review." };
  }

  return {
    completed: false,
    missingCount,
    completedCount,
    totalRequired,
    completionPercentage,
    message: `${missingCount} required detail${missingCount === 1 ? "" : "s"} remaining.`,
    firstMissingKey,
    firstMissingLabel: firstMissingKey ? completionFieldLabels[firstMissingKey] ?? "Required detail" : undefined,
  };
}
