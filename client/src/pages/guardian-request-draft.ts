import { REQUEST_SOURCE_VALUES, type RequestSource } from "@shared/request-source";
import { learningNeedsFromLegacy, normalizeLearningNeeds, type LearningNeed } from "@shared/learning-needs";

/**
 * 2: what is asked to be taught is a list of curricula, each with its classes and
 * each class with its subjects. A draft of version 1 (one curriculum, one class,
 * one list of subjects) is still read, as a list of one.
 */
export const GUARDIAN_REQUEST_DRAFT_VERSION = 2 as const;

export type GuardianRequestDraft = {
  version: typeof GUARDIAN_REQUEST_DRAFT_VERSION;
  step: 1 | 2 | 3;
  request: {
    learningNeeds: LearningNeed[];
    tuitionType: "home" | "online" | "both" | "group" | "package";
    groupCapacity: string;
    packageDurationMonths: string;
    studentCount: string;
    studentGender: "male" | "female" | "";
    addressDetails: string;
    tuitionCityLocationId: string;
    tuitionLocationId: string;
    daysPerWeek: string;
    preferredGender: "male" | "female" | "any" | "";
    salaryAmount: string;
    instituteName: string;
    heardAboutUs: RequestSource | "";
  };
  notes: string;
};

type UnknownRecord = Record<string, unknown>;

function isRecord(value: unknown): value is UnknownRecord {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function asString(value: unknown) {
  return typeof value === "string" ? value : null;
}

function asStringArray(value: unknown) {
  return Array.isArray(value) && value.every(item => typeof item === "string") ? value : null;
}

function asOneOf<T extends string>(value: unknown, options: readonly T[]) {
  return typeof value === "string" && options.includes(value as T) ? (value as T) : null;
}

/** A version 1 draft: one curriculum, one class and one list of subjects. */
function legacyLearningNeeds(request: UnknownRecord): LearningNeed[] | null {
  const category = asString(request.category);
  const curriculumType = request.curriculumType === undefined ? "" : asString(request.curriculumType);
  const classCourse = asString(request.classCourse);
  const selectedSubjects = asStringArray(request.selectedSubjects);
  if (category === null || curriculumType === null || classCourse === null || selectedSubjects === null) return null;
  // A draft saved before a class was chosen holds an empty list, not a class with nothing in it.
  if (!category && !classCourse) return [];
  return category && classCourse
    ? learningNeedsFromLegacy({ category, curriculumType, classCourse, subjects: selectedSubjects })
    : [{ category, curriculumType: curriculumType || null, classes: classCourse ? [{ classCourse, subjects: selectedSubjects }] : [] }];
}

/** The list as stored in a version 2 draft; anything that is not one is no draft. */
function asLearningNeeds(value: unknown): LearningNeed[] | null {
  if (!Array.isArray(value)) return null;
  const needs: LearningNeed[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const category = asString(entry.category);
    const curriculumType = entry.curriculumType === undefined || entry.curriculumType === null ? null : asString(entry.curriculumType);
    if (category === null || curriculumType === null && entry.curriculumType !== undefined && entry.curriculumType !== null || !Array.isArray(entry.classes)) return null;
    const classes: LearningNeed["classes"] = [];
    for (const item of entry.classes) {
      if (!isRecord(item)) return null;
      const classCourse = asString(item.classCourse);
      const subjects = asStringArray(item.subjects);
      if (classCourse === null || subjects === null) return null;
      classes.push({ classCourse, subjects });
    }
    needs.push({ category, curriculumType, classes });
  }
  // Not normalised here: a half-made choice (a curriculum with no class yet) is what a draft is for.
  return needs.length ? needs : [];
}

function normalizeDraft(value: unknown): GuardianRequestDraft | null {
  if (!isRecord(value) || (value.version !== GUARDIAN_REQUEST_DRAFT_VERSION && value.version !== 1) || !isRecord(value.request)) return null;
  const step = value.step;
  if (step !== 1 && step !== 2 && step !== 3) return null;

  const request = value.request;
  const learningNeeds = value.version === 1 ? legacyLearningNeeds(request) : asLearningNeeds(request.learningNeeds);
  const tuitionType = asOneOf(request.tuitionType, ["home", "online", "both", "group", "package"] as const);
  const groupCapacity = request.groupCapacity === undefined ? "" : asString(request.groupCapacity);
  const packageDurationMonths = request.packageDurationMonths === undefined ? "" : asString(request.packageDurationMonths);
  const studentCount = request.studentCount === undefined ? "" : asString(request.studentCount);
  const studentGender = request.studentGender === undefined ? "" : asOneOf(request.studentGender, ["male", "female", ""] as const);
  const addressDetails = request.addressDetails === undefined ? "" : asString(request.addressDetails);
  const tuitionCityLocationId = asString(request.tuitionCityLocationId);
  const tuitionLocationId = asString(request.tuitionLocationId);
  const daysPerWeek = asString(request.daysPerWeek);
  const preferredGender = asOneOf(request.preferredGender, ["male", "female", "any", ""] as const);
  const salaryAmount = asString(request.salaryAmount);
  const instituteName = asString(request.instituteName ?? "");
  const heardAboutUs = asOneOf(request.heardAboutUs ?? "", [...REQUEST_SOURCE_VALUES, ""] as const);
  const notes = asString(value.notes);

  if (
    learningNeeds === null ||
    tuitionType === null ||
    groupCapacity === null ||
    packageDurationMonths === null ||
    studentCount === null ||
    studentGender === null ||
    addressDetails === null ||
    tuitionCityLocationId === null ||
    tuitionLocationId === null ||
    daysPerWeek === null ||
    preferredGender === null ||
    salaryAmount === null ||
    instituteName === null ||
    heardAboutUs === null ||
    notes === null
  ) {
    return null;
  }

  return {
    version: GUARDIAN_REQUEST_DRAFT_VERSION,
    step,
    request: {
      learningNeeds,
      tuitionType,
      groupCapacity,
      packageDurationMonths,
      studentCount,
      studentGender,
      addressDetails,
      tuitionCityLocationId,
      tuitionLocationId,
      daysPerWeek,
      preferredGender,
      salaryAmount,
      instituteName,
      heardAboutUs,
    },
    notes,
  };
}

export function guardianRequestDraftStorageKey(guardianUserId: number) {
  return `connect-tutors:guardian-request-draft:${guardianUserId}`;
}

export function serializeGuardianRequestDraft(value: unknown) {
  const normalized = normalizeDraft(value);
  return JSON.stringify(normalized);
}

export function parseGuardianRequestDraft(value: string) {
  try {
    return normalizeDraft(JSON.parse(value));
  } catch {
    return null;
  }
}
