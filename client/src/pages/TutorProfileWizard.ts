import type { TutorProfileSubmissionErrorKey, TutorProfileSubmissionErrors } from "./TutorProfileUx";

export type TutorProfileWizardStep = {
  id: "identity" | "family" | "education" | "teaching" | "introduction";
  title: string;
  shortTitle: string;
  sectionIds: string[];
};

export const tutorProfileWizardSteps: TutorProfileWizardStep[] = [
  {
    id: "identity",
    title: "Identity and contact",
    shortTitle: "Identity",
    sectionIds: ["profile-section-a"],
  },
  {
    id: "family",
    title: "Family and emergency contact",
    shortTitle: "Family",
    sectionIds: ["profile-section-b"],
  },
  {
    id: "education",
    title: "Education and expertise",
    shortTitle: "Education",
    sectionIds: ["profile-section-c"],
  },
  {
    id: "teaching",
    title: "Tuition, location and communication",
    shortTitle: "Teaching",
    sectionIds: ["profile-section-d"],
  },
  {
    id: "introduction",
    title: "Introduction and review",
    shortTitle: "Review",
    sectionIds: ["profile-section-e"],
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
  currentLocationId: 3,
  teachingAreaIds: 3,
  availableNationwide: 3,
  tuitionType: 3,
  preferredStudentGender: 3,
  preferredClassSizes: 3,
  preferredTeachingDays: 3,
  preferredTimeSlots: 3,
  feeMin: 3,
  feeMax: 3,
  teachingLanguageIds: 3,
  communicationPreferences: 3,
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
