import type { z } from "zod";
import type { tutorProfileEditableDraftSchema } from "../../../server/tutor-profile.validation";
import { createProfileDraftPayload, type TutorProfileFormState, type TutorProfilePrivateDetails } from "./TutorProfileFormData";

export type TutorProfileSectionId = "a" | "c" | "d" | "e";

/**
 * The larger sections ("Personal Information" and "Education and teaching
 * expertise") open their editor one sub-group at a time.
 */
export type TutorProfileSectionGroupId = "a-identity" | "a-family" | "c-education" | "c-teaching";
export type TutorProfileEditTarget = TutorProfileSectionId | TutorProfileSectionGroupId;

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

type SubGroupDefinition = {
  id: TutorProfileSectionGroupId;
  section: TutorProfileSectionId;
  label: string;
  fieldKeys: readonly string[];
  privateDetailKeys?: readonly (keyof TutorProfilePrivateDetails)[];
};

const sectionSubGroups: readonly SubGroupDefinition[] = [
  {
    id: "a-identity",
    section: "a",
    label: "Identity and contact",
    fieldKeys: ["name", "gender", "dateOfBirth", "headline", "phone", "contactEmail"],
    privateDetailKeys: ["additionalPhone", "presentAddress", "permanentAddress", "nationality", "religion", "socialProfileLinks"],
  },
  {
    id: "a-family",
    section: "a",
    label: "Family and emergency contact",
    fieldKeys: [],
    privateDetailKeys: ["fatherName", "fatherPhone", "motherName", "motherPhone", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone", "emergencyContactAddress"],
  },
  {
    id: "c-education",
    section: "c",
    label: "Education",
    fieldKeys: ["highestEducation", "universityId", "facultyDepartmentId", "degreeExamTitle", "resultGpa", "deptId", "studyStatus", "yearSemester", "graduationYear", "educationRecords"],
  },
  {
    id: "c-teaching",
    section: "c",
    label: "Teaching expertise",
    fieldKeys: ["primarySubjectIds", "additionalSubjectIds", "classLevelIds", "curriculumIds", "teachingExperienceYears", "priorTeachingExperience", "specialExpertise", "academicAchievement"],
  },
];

/** The sub-groups a section's read-out pencils can target, or null if it has none. */
export function getTutorProfileSectionGroups(sectionId: TutorProfileSectionId) {
  const groups = sectionSubGroups.filter(group => group.section === sectionId);
  return groups.length > 0 ? groups : null;
}

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
    label: "Personal Information",
    description: "Your identity, contact and private address details, plus family and emergency contacts.",
    fieldKeys: ["name", "gender", "dateOfBirth", "headline", "phone", "contactEmail", "privateDetails"],
    privateDetailKeys: [
      "additionalPhone", "presentAddress", "permanentAddress", "nationality", "religion", "socialProfileLinks",
      "fatherName", "fatherPhone", "motherName", "motherPhone", "emergencyContactName", "emergencyContactRelation", "emergencyContactPhone", "emergencyContactAddress",
    ],
  },
  {
    id: "c",
    label: "Education and expertise",
    description: "Your education, qualifications, subjects, learner levels, and teaching expertise.",
    fieldKeys: [
      "highestEducation",
      "universityId",
      "facultyDepartmentId",
      "degreeExamTitle",
      "resultGpa",
      "deptId",
      "studyStatus",
      "yearSemester",
      "graduationYear",
      "educationRecords",
      "primarySubjectIds",
      "additionalSubjectIds",
      "classLevelIds",
      "curriculumIds",
      "teachingExperienceYears",
      "priorTeachingExperience",
      "specialExpertise",
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
  const subGroup = sectionSubGroups.find(group => group.id === target);
  const definition = tutorProfileSectionDefinitions.find(section => section.id === target);
  const fieldKeys = subGroup?.fieldKeys ?? definition?.fieldKeys;
  const privateDetailKeys = subGroup?.privateDetailKeys ?? definition?.privateDetailKeys;
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
