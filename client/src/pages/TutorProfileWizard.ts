import type { TutorProfileSubmissionErrorKey, TutorProfileSubmissionErrors } from "./TutorProfileUx";

export type TutorProfileWizardStep = {
  id: "personal" | "education" | "teaching" | "introduction";
  title: string;
  shortTitle: string;
  sectionIds: string[];
};

export const tutorProfileWizardSteps: TutorProfileWizardStep[] = [
  {
    id: "personal",
    title: "Personal Information",
    shortTitle: "Personal",
    sectionIds: ["profile-section-a"],
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
  universityId: 1,
  facultyDepartmentId: 1,
  studyStatus: 1,
  primarySubjectIds: 1,
  additionalSubjectIds: 1,
  classLevelIds: 1,
  curriculumIds: 1,
  teachingExperienceYears: 1,
  studentTypeIds: 1,
  currentLocationId: 2,
  teachingAreaIds: 2,
  availableNationwide: 2,
  tuitionType: 2,
  preferredStudentGender: 2,
  preferredClassSizes: 2,
  preferredTeachingDays: 2,
  preferredTimeSlots: 2,
  feeMin: 2,
  feeMax: 2,
  teachingLanguageIds: 2,
  communicationPreferences: 2,
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
