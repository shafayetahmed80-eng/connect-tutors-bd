import type { TutorProfileSubmissionErrorKey, TutorProfileSubmissionErrors } from "./TutorProfileUx";

export type TutorProfileWizardStep = {
  id: "identity" | "location" | "education" | "preferences" | "review";
  title: string;
  shortTitle: string;
  sectionIds: string[];
};

export const tutorProfileWizardSteps: TutorProfileWizardStep[] = [
  {
    id: "identity",
    title: "Identity and photo",
    shortTitle: "Identity",
    sectionIds: ["profile-section-a"],
  },
  {
    id: "location",
    title: "Location",
    shortTitle: "Location",
    sectionIds: ["profile-section-b"],
  },
  {
    id: "education",
    title: "Education and expertise",
    shortTitle: "Education",
    sectionIds: ["profile-section-c"],
  },
  {
    id: "preferences",
    title: "Tuition preferences and fee",
    shortTitle: "Preferences",
    sectionIds: ["profile-section-d", "profile-section-e"],
  },
  {
    id: "review",
    title: "Communication, profile, and review",
    shortTitle: "Review",
    sectionIds: ["profile-section-f", "profile-section-g", "profile-section-h"],
  },
];

const stepIndexByField: Partial<Record<TutorProfileSubmissionErrorKey, number>> = {
  profilePhotoUrl: 0,
  name: 0,
  gender: 0,
  dateOfBirth: 0,
  headline: 0,
  phone: 0,
  contactEmail: 0,
  currentLocationId: 1,
  teachingAreaIds: 1,
  availableNationwide: 1,
  universityId: 2,
  facultyId: 2,
  facultyDepartmentId: 2,
  studyStatus: 2,
  primarySubjectIds: 2,
  additionalSubjectIds: 2,
  classLevelIds: 2,
  curriculumIds: 2,
  teachingExperienceYears: 2,
  studentTypeIds: 2,
  tuitionType: 3,
  preferredStudentGender: 3,
  preferredClassSizes: 3,
  preferredTeachingDays: 3,
  preferredTimeSlots: 3,
  feeMin: 3,
  feeMax: 3,
  teachingLanguageIds: 4,
  communicationPreferences: 4,
};

/** Returns the earliest wizard step containing an inline submission error. */
export function getTutorProfileWizardStepForErrors(errors: TutorProfileSubmissionErrors) {
  const stepIndexes = (Object.keys(errors) as TutorProfileSubmissionErrorKey[])
    .map(key => stepIndexByField[key])
    .filter((index): index is number => typeof index === "number");

  return stepIndexes.length > 0 ? Math.min(...stepIndexes) : null;
}

type ProfileSectionDocument = {
  getElementById: (sectionId: string) => { scrollIntoView: (options: ScrollIntoViewOptions) => void } | null;
};

/** Scrolls desktop Profile navigation to the selected section anchor. */
export function scrollToTutorProfileSection(sectionId: string, documentRef: ProfileSectionDocument = document) {
  documentRef.getElementById(sectionId)?.scrollIntoView({ behavior: "smooth", block: "start" });
}
