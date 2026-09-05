import type { z } from "zod";
import {
  defaultTutorProfileFieldConfig,
  type ResolvedTutorProfileField,
  type ResolvedTutorProfileFieldConfig,
} from "@shared/tutor-profile-field-registry";
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

const subGroupLabels: Record<TutorProfileSectionGroupId, string> = {
  "a-identity": "Identity and contact",
  "a-family": "Family and emergency contact",
  "c-education": "Education",
  "c-teaching": "Teaching expertise",
};

/**
 * The sub-groups a section's read-out pencils can target, or null if it has
 * none. Derived from the resolved field config rather than a fixed list, so a
 * sub-group whose fields have all been moved or switched off stops offering an
 * editor for nothing.
 */
export function getTutorProfileSectionGroups(
  sectionId: TutorProfileSectionId,
  config: ResolvedTutorProfileFieldConfig = defaultTutorProfileFieldConfig(),
) {
  const seen: TutorProfileSectionGroupId[] = [];
  for (const field of config.bySection.get(sectionId) ?? []) {
    if (field.subGroup && !seen.includes(field.subGroup)) seen.push(field.subGroup);
  }
  return seen.length > 0 ? seen.map(id => ({ id, label: subGroupLabels[id] })) : null;
}

type SectionDefinition = {
  id: TutorProfileSectionId;
  label: string;
  description: string;
};

/** Section names and blurbs. What each one *contains* comes from the field config. */
export const tutorProfileSectionDefinitions: readonly SectionDefinition[] = [
  {
    id: "a",
    label: "Personal Information",
    description: "Your identity and contact details, plus family and emergency contacts.",
  },
  {
    id: "c",
    label: "Education and expertise",
    description: "Your education, qualifications, subjects, learner levels, and teaching expertise.",
  },
  {
    id: "d",
    label: "Tuition, location and communication",
    description: "How and where you teach: format, learner preferences, coverage, fee, languages, and contact preferences.",
  },
  {
    id: "e",
    label: "Introduction and review",
    description: "Optional teaching-style details, then submit your profile for review.",
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

const PRIVATE_DETAIL_PREFIX = "privateDetails.";

/** The fields one editor owns: a sub-group's own, or every field in a section. */
export function getTutorProfileEditTargetFields(
  target: TutorProfileEditTarget,
  config: ResolvedTutorProfileFieldConfig,
): ResolvedTutorProfileField[] {
  const sectionId = target.includes("-") ? (target.split("-")[0] as TutorProfileSectionId) : (target as TutorProfileSectionId);
  const sectionFields = config.bySection.get(sectionId) ?? [];
  return target.includes("-")
    ? sectionFields.filter(field => field.subGroup === target)
    : [...sectionFields];
}

/** Exact tRPC input contract; runtime validation remains server-authoritative. */
type TutorProfileSectionDraftPayload = z.input<typeof tutorProfileEditableDraftSchema>;

export function createTutorProfileSectionDraftPayload(
  target: TutorProfileEditTarget,
  form: TutorProfileSectionFormState,
  config: ResolvedTutorProfileFieldConfig = defaultTutorProfileFieldConfig(),
) {
  const fields = getTutorProfileEditTargetFields(target, config);
  if (fields.length === 0) throw new Error("Unknown Tutor Profile section.");

  const completeDraft = createFullTutorProfileDraftPayload(form) as Record<string, unknown>;
  const privateDetailKeys = fields
    .filter(field => field.id.startsWith(PRIVATE_DETAIL_PREFIX))
    .map(field => field.id.slice(PRIVATE_DETAIL_PREFIX.length) as keyof TutorProfilePrivateDetails);

  // Anything with a dot other than `privateDetails.` names a value inside a
  // container (one education record's own fields, one document type) - those
  // are carried by their container's key, never sent on their own.
  const sectionDraft = Object.fromEntries(
    fields
      .filter(field => !field.id.includes("."))
      .filter(field => completeDraft[field.id] !== undefined)
      .map(field => [field.id, completeDraft[field.id]]),
  ) as TutorProfileSectionDraftPayload;

  if (privateDetailKeys.length > 0) {
    const privateDetails = completeDraft.privateDetails as TutorProfilePrivateDetails;
    sectionDraft.privateDetails = Object.fromEntries(
      privateDetailKeys.map(key => [key, privateDetails[key] ?? ""]),
    ) as TutorProfileSectionDraftPayload["privateDetails"];
  }

  return sectionDraft as TutorProfileSectionDraftPayload;
}
