import type { z } from "zod";
import type { tutorProfileEditableDraftSchema } from "../../../server/tutor-profile.validation";
import { createProfileDraftPayload, type TutorProfileFormState, type TutorProfilePrivateDetails } from "./TutorProfileFormData";

export type TutorProfileSectionId = "a" | "b" | "c" | "d" | "e";

/** Section C is large, so its editor can be opened one sub-group at a time. */
export type TutorProfileSectionGroupId = "c-education" | "c-teaching";
export type TutorProfileEditTarget = TutorProfileSectionId | TutorProfileSectionGroupId;

const sectionCSubGroups = [
  {
    id: "c-education" as const,
    label: "Education",
    fieldKeys: ["highestEducation", "universityId", "facultyId", "facultyDepartmentId", "studyStatus", "graduationYear", "educationRecords"],
  },
  {
    id: "c-teaching" as const,
    label: "Teaching expertise",
    fieldKeys: ["primarySubjectIds", "additionalSubjectIds", "classLevelIds", "curriculumIds", "teachingExperienceYears", "priorTeachingExperience", "specialExpertise", "studentTypeIds", "academicAchievement"],
  },
] as const;

/** The sub-groups a section's read-out pencil can target, or null if it has none. */
export function getTutorProfileSectionGroups(sectionId: TutorProfileSectionId) {
  return sectionId === "c" ? sectionCSubGroups : null;
}

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
    label: "Education and expertise",
    description: "Your education, qualifications, subjects, learner levels, and teaching expertise.",
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
    label: "Tuition, location and communication",
    description: "How and where you teach: format, learner preferences, coverage, fee, languages, and contact preferences.",
    fieldKeys: [
      "tuitionType",
      "availableNationwide",
      "preferredStudentGender",
      "preferredClassSizes",
      "preferredTeachingDays",
      "preferredTimeSlots",
      "currentLocationId",
      "teachingAreaIds",
      "feeMin",
      "feeMax",
      "travelDistanceKm",
      "teachingLanguageIds",
      "communicationPreferences",
    ],
  },
  {
    id: "e",
    label: "Introduction and review",
    description: "Optional teaching-style details, then submit your profile for review.",
    fieldKeys: ["aboutMe", "teachingApproach", "whyChooseMe", "additionalNotes"],
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
  target: TutorProfileEditTarget,
  form: TutorProfileSectionFormState,
) {
  const subGroup = sectionCSubGroups.find(group => group.id === target);
  const definition = tutorProfileSectionDefinitions.find(section => section.id === target);
  const fieldKeys = subGroup?.fieldKeys ?? definition?.fieldKeys;
  const privateDetailKeys = definition?.privateDetailKeys;
  if (!fieldKeys) throw new Error("Unknown Tutor Profile section.");

  const completeDraft = createFullTutorProfileDraftPayload(form) as Record<string, unknown>;
  const sectionDraft = Object.fromEntries(
    fieldKeys
      .filter(fieldKey => fieldKey !== "privateDetails")
      .filter(fieldKey => completeDraft[fieldKey] !== undefined)
      .map(fieldKey => [fieldKey, completeDraft[fieldKey]]),
  ) as TutorProfileSectionDraftPayload;

  if (privateDetailKeys) {
    const privateDetails = completeDraft.privateDetails as TutorProfilePrivateDetails;
    sectionDraft.privateDetails = Object.fromEntries(
      privateDetailKeys.map(key => [key, privateDetails[key] ?? ""]),
    ) as TutorProfileSectionDraftPayload["privateDetails"];
  }

  return sectionDraft as TutorProfileSectionDraftPayload;
}
