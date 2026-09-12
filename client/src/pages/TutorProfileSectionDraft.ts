import type { z } from "zod";
import {
  defaultTutorProfileFieldConfig,
  type ResolvedTutorProfileField,
  type ResolvedTutorProfileFieldConfig,
} from "@shared/tutor-profile-field-registry";
import type { tutorProfileEditableDraftSchema } from "../../../server/tutor-profile.validation";
import { createProfileDraftPayload, type TutorProfileFormState, type TutorProfilePrivateDetails } from "./TutorProfileFormData";

export type TutorProfileSectionId = "a" | "c" | "d" | "f" | "e";

/** A section that owns sub-groups opens its editor one sub-group at a time. */
export type TutorProfileSectionGroupId =
  | "a-identity" | "a-family"
  | "c-university" | "c-higher-secondary" | "c-secondary"
  | "d-availability" | "d-teaching";
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
  "c-university": "University Section",
  "c-higher-secondary": "Higher Secondary",
  "c-secondary": "Secondary",
  "d-availability": "Availability",
  "d-teaching": "Teaching Expertise",
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
    label: "Education",
    description: "Your university study, then your Higher Secondary and Secondary records.",
  },
  {
    id: "d",
    label: "Tuition Related",
    description: "What, how and where you teach: subjects, learner levels, format, coverage, and fee.",
  },
  {
    id: "f",
    label: "Credential",
    description: "Your University ID and the optional certificates that support it.",
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

/**
 * Block fields whose value travels under another key in the draft.
 *
 * Secondary and Higher Secondary are one row each of `educationRecords` - the
 * form is what makes them exactly one, and no draft key of their own exists.
 * Without this the two popups collected nothing at all: their only field is
 * the block field, the draft has no value under that name, and what the Tutor
 * typed went nowhere. Both carry the whole array, exactly as the University
 * Section already does.
 */
const BLOCK_FIELD_DRAFT_KEYS: Record<string, string> = {
  secondaryRecord: "educationRecords",
  higherSecondaryRecord: "educationRecords",
};

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
      .map(field => BLOCK_FIELD_DRAFT_KEYS[field.id] ?? field.id)
      .filter(key => completeDraft[key] !== undefined)
      .map(key => [key, completeDraft[key]]),
  ) as TutorProfileSectionDraftPayload;

  if (privateDetailKeys.length > 0) {
    const privateDetails = completeDraft.privateDetails as TutorProfilePrivateDetails;
    sectionDraft.privateDetails = Object.fromEntries(
      privateDetailKeys.map(key => [key, privateDetails[key] ?? ""]),
    ) as TutorProfileSectionDraftPayload["privateDetails"];
  }

  return sectionDraft as TutorProfileSectionDraftPayload;
}
