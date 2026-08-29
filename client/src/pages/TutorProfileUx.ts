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
    currentLocation: "Current Location",
    teachingAreas: "Teaching Areas",
    university: "Institute",
    faculty: "Related Faculty",
    facultyDepartment: "Related Department / Subject",
    studyStatus: "Current Study Status",
    primarySubjects: "Primary Subjects",
    additionalSubjects: "Additional Subjects",
    classLevels: "Class / Level",
    curricula: "Curriculum",
    teachingExperience: "Teaching Experience (Years)",
    studentTypes: "Student Types",
    tuitionType: "Tuition Type",
    preferredStudentGender: "Preferred Student Gender",
    classSizes: "Preferred Class Size",
    teachingDays: "Preferred Teaching Days",
    timeSlots: "Preferred Time Slots",
    feeMin: "Minimum Monthly Fee",
    feeMax: "Maximum Monthly Fee",
    teachingLanguages: "Teaching Languages",
    communicationPreferences: "Communication Preferences",
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
  currentLocationId: tutorProfileCopy.fields.currentLocation,
  teachingAreaIds: tutorProfileCopy.fields.teachingAreas,
  universityId: tutorProfileCopy.fields.university,
  facultyId: tutorProfileCopy.fields.faculty,
  facultyDepartmentId: tutorProfileCopy.fields.facultyDepartment,
  studyStatus: tutorProfileCopy.fields.studyStatus,
  primarySubjectIds: tutorProfileCopy.fields.primarySubjects,
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

function isCalendarDate(value: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const parsed = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
}

function requiredSelection(errors: TutorProfileSubmissionErrors, key: TutorProfileSubmissionErrorKey, message: string, values: string[]) {
  if (values.length === 0) errors[key] = message;
}

/** Shows immediate client-side guidance for predictable submission requirements. */
export function getTutorProfileSubmissionErrors(form: TutorProfileSubmissionPreview): TutorProfileSubmissionErrors {
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
  if (!form.currentLocationId) errors.currentLocationId = "Select your current location.";
  requiredSelection(errors, "teachingAreaIds", "Select at least one teaching area.", form.teachingAreaIds);
  if (!form.universityId) errors.universityId = "Select your institute.";
  if (!form.facultyId) errors.facultyId = "Select your related faculty.";
  if (!form.facultyDepartmentId) errors.facultyDepartmentId = "Select your related department or subject.";
  if (!form.studyStatus) errors.studyStatus = "Select your current study status.";
  requiredSelection(errors, "primarySubjectIds", "Select at least one primary subject.", form.primarySubjectIds);
  requiredSelection(errors, "classLevelIds", "Select at least one class or level.", form.classLevelIds);
  requiredSelection(errors, "curriculumIds", "Select at least one curriculum.", form.curriculumIds);
  if (!/^\d+$/.test(form.teachingExperienceYears) || Number(form.teachingExperienceYears) < 0 || Number(form.teachingExperienceYears) > 60) errors.teachingExperienceYears = "Enter teaching experience between 0 and 60 years.";
  requiredSelection(errors, "studentTypeIds", "Select at least one student type.", form.studentTypeIds);
  if (!form.tuitionType) errors.tuitionType = "Select a tuition type.";
  if (!form.preferredStudentGender) errors.preferredStudentGender = "Select a preferred student gender.";
  requiredSelection(errors, "preferredClassSizes", "Select at least one class size.", form.preferredClassSizes);
  requiredSelection(errors, "preferredTeachingDays", "Select at least one teaching day.", form.preferredTeachingDays);
  requiredSelection(errors, "preferredTimeSlots", "Select at least one time slot.", form.preferredTimeSlots);
  if (!Number.isInteger(feeMin) || (feeMin ?? 0) < 0) errors.feeMin = "Enter a minimum monthly fee.";
  if (!Number.isInteger(feeMax) || (feeMax ?? 0) < 0) errors.feeMax = "Enter a maximum monthly fee.";
  else if (feeMin !== undefined && feeMax !== undefined && feeMin > feeMax) errors.feeMax = "The maximum fee cannot be lower than the minimum fee.";
  requiredSelection(errors, "teachingLanguageIds", "Select at least one teaching language.", form.teachingLanguageIds);
  requiredSelection(errors, "communicationPreferences", "Select at least one communication preference.", form.communicationPreferences);
  if ((form.tuitionType === "online" || form.tuitionType === "both") && !form.availableNationwide) errors.availableNationwide = "Enable available nationwide when you select Online or Both.";

  return errors;
}

/** Creates a concise client-side completion cue; the server remains authoritative. */
export function getTutorProfileCompletionSummary(form: TutorProfileSubmissionPreview): TutorProfileCompletionSummary {
  const errors = getTutorProfileSubmissionErrors(form);
  const missingKeys = Object.keys(errors) as TutorProfileSubmissionErrorKey[];
  const firstMissingKey = missingKeys[0];
  const missingCount = missingKeys.length;
  const totalRequired = 26 + (form.tuitionType === "online" || form.tuitionType === "both" ? 1 : 0);
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
