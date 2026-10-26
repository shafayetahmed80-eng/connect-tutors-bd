import { educationSectionStatus, validateEducationTimelineSequence, validateResultGpa } from "@shared/tutor-education";
import { findTutorProfileFieldMeta, type ResolvedTutorProfileFieldConfig } from "@shared/tutor-profile-field-registry";
import type { SiteLimitValues } from "@shared/site-limits";
import { offersOnlineTuitionOnly } from "@shared/tutor-profile-tuition";
import { calculateAgeInYears } from "@shared/tutor-personal-details";
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
    aboutMe: "About Me",
    teachingApproach: "Teaching Approach",
    whyChooseMe: "Why Choose Me",
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
  educationRecords: "Education (at least one section)",
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
  aboutMe: tutorProfileCopy.fields.aboutMe,
  teachingApproach: tutorProfileCopy.fields.teachingApproach,
  whyChooseMe: tutorProfileCopy.fields.whyChooseMe,
};

/** The registry id behind a submission check, where it is not the check's own key. */
const registryIdByErrorKey: Partial<Record<TutorProfileSubmissionErrorKey, string>> = {
  tuitionTypes: "tuitionType",
  // Education is one check over several sections, not the Qualification History field that shares its key.
  educationRecords: "education",
};

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
  const regId = registryIdForErrorKey(key);
  const field = config?.byId.get(regId);
  if (!config) {
    const meta = findTutorProfileFieldMeta(regId);
    return meta?.requiredByDefault ?? true;
  }
  if (!field || !field.requiredConfigurable) {
    const meta = findTutorProfileFieldMeta(regId);
    return meta?.requiredByDefault ?? true;
  }
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
export function getTutorProfileSubmissionErrors(form: TutorProfileSubmissionPreview, config?: ResolvedTutorProfileFieldConfig, limits?: SiteLimitValues): TutorProfileSubmissionErrors {
  const errors: TutorProfileSubmissionErrors = {};
  const feeMin = form.feeMin.trim() ? Number(form.feeMin) : undefined;
  const feeMax = form.feeMax.trim() ? Number(form.feeMax) : undefined;

  if (!form.profilePhotoUrl) errors.profilePhotoUrl = "Add a profile photo.";
  if (form.name.trim().length < 2) errors.name = "Enter your full name.";
  if (!form.dateOfBirth) {
    errors.dateOfBirth = "Enter your date of birth.";
  } else if (!isCalendarDate(form.dateOfBirth)) {
    errors.dateOfBirth = "Enter a valid date of birth.";
  } else if (new Date(`${form.dateOfBirth}T00:00:00.000Z`).getTime() > Date.now()) {
    errors.dateOfBirth = "Your date of birth cannot be in the future.";
  } else {
    const minAge = limits?.["tutor.minAgeYears"] ?? 18;
    const maxAge = limits?.["tutor.maxAgeYears"] ?? 80;
    const age = calculateAgeInYears(form.dateOfBirth);
    if (age !== null) {
      if (age < minAge) {
        errors.dateOfBirth = `You must be at least ${minAge} years old to apply as a tutor.`;
      } else if (age > maxAge) {
        errors.dateOfBirth = `Tutor age must be ${maxAge} years or under.`;
      }
    }
  }
  if (form.headline.trim().length < 10) errors.headline = "Enter a headline with at least 10 characters.";
  if (!/^\+8801[3-9]\d{8}$/.test(form.phone.trim())) errors.phone = "Enter a valid Bangladesh mobile number.";
  if (!/^\S+@\S+\.\S+$/.test(form.contactEmail.trim())) errors.contactEmail = "Enter a valid email address.";
  if (!form.currentCityId) errors.currentCityId = "Select your current city.";
  if (!form.currentLocationId) errors.currentLocationId = "Select your current location.";
  // An online-only Tutor has no place to teach in, so Teaching Areas is theirs to leave empty.
  if (!offersOnlineTuitionOnly(form)) requiredSelection(errors, "teachingAreaIds", "Select at least one teaching area.", form.teachingAreaIds);
  // Education: any one section filled in completely is enough to apply - plenty of teachers are SSC-only.
  const education = educationStatus(form, config);
  if (education.applies && !education.met) {
    errors.educationRecords = "Complete at least one education section: Secondary, Higher Secondary or University.";
  } else {
    const timelineSeqError = validateEducationTimelineSequence(form.educationRecords, form);
    if (timelineSeqError) {
      errors.educationRecords = timelineSeqError;
    }
  }

  if (form.resultGpa) {
    const uniGpaError = validateResultGpa(form.resultGpa, "Honours");
    if (uniGpaError) errors.resultGpa = uniGpaError;
  }

  for (const record of form.educationRecords ?? []) {
    if (record.resultGpa) {
      const recGpaError = validateResultGpa(record.resultGpa, record.qualificationLevel);
      if (recGpaError) {
        errors.educationRecords = recGpaError;
        break;
      }
    }
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

  if (limits) {
    const aboutMeLen = form.aboutMe?.trim().length ?? 0;
    if (aboutMeLen > 0 && limits["tutor.aboutMeMinChars"] > 0 && aboutMeLen < limits["tutor.aboutMeMinChars"]) {
      errors.aboutMe = `Write at least ${limits["tutor.aboutMeMinChars"]} characters in About Me.`;
    } else if (aboutMeLen > limits["tutor.aboutMeChars"]) {
      errors.aboutMe = `About Me must be ${limits["tutor.aboutMeChars"]} characters or fewer.`;
    }
    const approachLen = form.teachingApproach?.trim().length ?? 0;
    if (approachLen > 0 && limits["tutor.approachMinChars"] > 0 && approachLen < limits["tutor.approachMinChars"]) {
      errors.teachingApproach = `Write at least ${limits["tutor.approachMinChars"]} characters in Teaching Approach.`;
    } else if (approachLen > limits["tutor.approachChars"]) {
      errors.teachingApproach = `Teaching Approach must be ${limits["tutor.approachChars"]} characters or fewer.`;
    }
    const whyChooseMeLen = form.whyChooseMe?.trim().length ?? 0;
    if (whyChooseMeLen > 0 && limits["tutor.whyChooseMeMinChars"] > 0 && whyChooseMeLen < limits["tutor.whyChooseMeMinChars"]) {
      errors.whyChooseMe = `Write at least ${limits["tutor.whyChooseMeMinChars"]} characters in Why Choose Me.`;
    } else if (whyChooseMeLen > limits["tutor.whyChooseMeChars"]) {
      errors.whyChooseMe = `Why Choose Me must be ${limits["tutor.whyChooseMeChars"]} characters or fewer.`;
    }
  }

  if (isDetailRequired(config, "aboutMe") && !form.aboutMe?.trim()) errors.aboutMe = "Write About Me before submitting.";
  if (isDetailRequired(config, "teachingApproach") && !form.teachingApproach?.trim()) errors.teachingApproach = "Write Teaching Approach before submitting.";
  if (isDetailRequired(config, "whyChooseMe") && !form.whyChooseMe?.trim()) errors.whyChooseMe = "Write Why Choose Me before submitting.";

  for (const key of Object.keys(errors) as TutorProfileSubmissionErrorKey[]) {
    if (!isDetailRequired(config, key)) {
      if (key === "aboutMe" && (form.aboutMe?.trim().length ?? 0) > 0) continue;
      if (key === "teachingApproach" && (form.teachingApproach?.trim().length ?? 0) > 0) continue;
      if (key === "whyChooseMe" && (form.whyChooseMe?.trim().length ?? 0) > 0) continue;
      if (key === "resultGpa" && (form.resultGpa?.trim().length ?? 0) > 0) continue;
      if (key === "educationRecords") continue;
      delete errors[key];
    }
  }
  return errors;
}

/** The checks that apply to every Tutor, before the two that depend on other answers. */
const unconditionalChecks: TutorProfileSubmissionErrorKey[] = [
  "profilePhotoUrl", "name", "dateOfBirth", "headline", "phone", "contactEmail", "currentCityId", "currentLocationId",
  "primarySubjectIds", "classLevelIds", "curriculumIds", "teachingExperienceYears", "tuitionTypes",
  "preferredStudentGender", "preferredTeachingDays", "preferredTimeSlots", "feeMin", "feeMax",
];

/** What the Education tab holds, section by section, as the form carries it. */
export function educationStatus(form: TutorProfileSubmissionPreview, config?: ResolvedTutorProfileFieldConfig) {
  return educationSectionStatus(
    { records: form.educationRecords as unknown as ReadonlyArray<Record<string, unknown>>, university: form as unknown as Record<string, unknown> },
    id => config?.byId.get(id)?.enabled ?? true,
  );
}

/** Creates a concise client-side completion cue; the server remains authoritative. */
export function getTutorProfileCompletionSummary(form: TutorProfileSubmissionPreview, config?: ResolvedTutorProfileFieldConfig, limits?: SiteLimitValues): TutorProfileCompletionSummary {
  const errors = getTutorProfileSubmissionErrors(form, config, limits);
  const missingKeys = Object.keys(errors) as TutorProfileSubmissionErrorKey[];
  const firstMissingKey = missingKeys[0];
  const missingCount = missingKeys.length;
  // The unconditional checks the Owner's settings still ask for, plus the two
  // gated ones: Education counts as one while the Owner shows any education
  // section, and Teaching Areas does not apply to a Tutor who offers only online tuition.
  const totalRequired = unconditionalChecks.filter(key => isDetailRequired(config, key)).length
    + (educationStatus(form, config).applies ? 1 : 0)
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
