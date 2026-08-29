import type { z } from "zod";
import type { tutorProfileEditableDraftSchema } from "../../../server/tutor-profile.validation";
import { createProfileDraftPayload, type TutorProfileFormState, type TutorProfilePrivateDetails } from "./TutorProfileFormData";

export type TutorProfileSectionId = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";

export type TutorProfileSectionFormState = TutorProfileFormState & {
  primarySubjectIds: string[];
  additionalSubjectIds: string[];
  classLevelIds: string[];
  curriculumIds: string[];
  teachingExperienceYears: string;
  priorTeachingExperience: string;
  specialExpertise: string;
  studentTypeIds: string[];
  academicAchievement: string;
};

type SectionDefinition = {
  id: TutorProfileSectionId;
  label: string;
  description: string;
  fieldKeys: readonly string[];
  privateDetailKeys?: readonly (keyof TutorProfilePrivateDetails)[];
};

export const tutorProfileSectionDefinitions: readonly SectionDefinition[] = [
  {
    id: "a",
    label: "Identity and contact",
    description: "Your core identity, private address, and contact details.",
    fieldKeys: ["name", "gender", "dateOfBirth", "headline", "phone", "contactEmail", "privateDetails"],
    privateDetailKeys: ["additionalPhone", "presentAddress", "permanentAddress", "nationality", "religion", "socialProfileLinks"],
  },
  {
    id: "b",
    label: "Family & emergency contact",
    description: "Private family and emergency contact details for verification.",
    fieldKeys: ["privateDetails"],
    privateDetailKeys: ["fatherName", "fatherPhone", "motherName", "motherPhone", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone", "emergencyContactAddress"],
  },
  {
    id: "c",
    label: "Education history",
    description: "Your current education and qualification history.",
    fieldKeys: [
      "highestEducation",
      "universityId",
      "facultyId",
      "facultyDepartmentId",
      "studyStatus",
      "graduationYear",
      "educationRecords",
      "primarySubjectIds",
      "additionalSubjectIds",
      "classLevelIds",
      "curriculumIds",
      "teachingExperienceYears",
      "priorTeachingExperience",
      "specialExpertise",
      "studentTypeIds",
      "academicAchievement",
    ],
  },
  {
    id: "d",
    label: "Teaching expertise",
    description: "Your subjects, learner levels, curricula, and teaching experience.",
    fieldKeys: [
      "tuitionType", "availableNationwide", "preferredStudentGender", "preferredClassSizes", "preferredTeachingDays", "preferredTimeSlots",
    ],
  },
  {
    id: "e",
    label: "Location, tuition and availability",
    description: "Where and how you teach, including your fee, schedule, and learner preferences.",
    fieldKeys: ["currentLocationId", "teachingAreaIds", "feeMin", "feeMax", "travelDistanceKm"],
  },
  {
    id: "f",
    label: "Communication & introduction",
    description: "Your teaching languages, contact preferences, and Guardian-safe introduction.",
    fieldKeys: ["teachingLanguageIds", "communicationPreferences"],
  },
  {
    id: "g",
    label: "Tutor introduction",
    description: "Help Guardians understand your approach and strengths.",
    fieldKeys: ["aboutMe", "teachingApproach", "whyChooseMe", "additionalNotes"],
  },
  {
    id: "h",
    label: "Profile review",
    description: "Review your profile and submit it once for moderation.",
    fieldKeys: [],
  },
];

function selectedIds(values: string[] | undefined) {
  return (values ?? []).map(Number).filter(Number.isInteger);
}

function createFullTutorProfileDraftPayload(form: TutorProfileSectionFormState) {
  const teachingExperienceYears = form.teachingExperienceYears ? Number(form.teachingExperienceYears) : undefined;
  const primarySubjectIds = selectedIds(form.primarySubjectIds);
  const additionalSubjectIds = selectedIds(form.additionalSubjectIds);
  const classLevelIds = selectedIds(form.classLevelIds);
  const curriculumIds = selectedIds(form.curriculumIds);
  const studentTypeIds = selectedIds(form.studentTypeIds);

  return {
    ...createProfileDraftPayload(form),
    ...(primarySubjectIds.length > 0 ? { primarySubjectIds } : {}),
    ...(additionalSubjectIds.length > 0 ? { additionalSubjectIds } : {}),
    ...(classLevelIds.length > 0 ? { classLevelIds } : {}),
    ...(curriculumIds.length > 0 ? { curriculumIds } : {}),
    teachingExperienceYears: Number.isInteger(teachingExperienceYears) ? teachingExperienceYears : undefined,
    priorTeachingExperience: form.priorTeachingExperience?.trim() || undefined,
    specialExpertise: form.specialExpertise?.trim() || undefined,
    ...(studentTypeIds.length > 0 ? { studentTypeIds } : {}),
    academicAchievement: form.academicAchievement?.trim() || undefined,
  };
}

/** Exact tRPC input contract; runtime validation remains server-authoritative. */
type TutorProfileSectionDraftPayload = z.input<typeof tutorProfileEditableDraftSchema>;

export function createTutorProfileSectionDraftPayload(
  sectionId: TutorProfileSectionId,
  form: TutorProfileSectionFormState,
) {
  const definition = tutorProfileSectionDefinitions.find(section => section.id === sectionId);
  if (!definition) throw new Error("Unknown Tutor Profile section.");

  const completeDraft = createFullTutorProfileDraftPayload(form) as Record<string, unknown>;
  const sectionDraft = Object.fromEntries(
    definition.fieldKeys
      .filter(fieldKey => fieldKey !== "privateDetails")
      .filter(fieldKey => completeDraft[fieldKey] !== undefined)
      .map(fieldKey => [fieldKey, completeDraft[fieldKey]]),
  ) as TutorProfileSectionDraftPayload;

  if (definition.privateDetailKeys) {
    const privateDetails = completeDraft.privateDetails as TutorProfilePrivateDetails;
    sectionDraft.privateDetails = Object.fromEntries(
      definition.privateDetailKeys.map(key => [key, privateDetails[key] ?? ""]),
    ) as TutorProfileSectionDraftPayload["privateDetails"];
  }

  return sectionDraft as TutorProfileSectionDraftPayload;
}
