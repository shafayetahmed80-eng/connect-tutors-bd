export const GUARDIAN_REQUEST_DRAFT_VERSION = 1 as const;

export type GuardianRequestDraft = {
  version: typeof GUARDIAN_REQUEST_DRAFT_VERSION;
  step: 1 | 2 | 3;
  request: {
    category: string;
    curriculumType: string;
    classCourse: string;
    selectedSubjects: string[];
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
    budgetKind: "range" | "discuss" | "";
    budgetMinimum: string;
    budgetMaximum: string;
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

function normalizeDraft(value: unknown): GuardianRequestDraft | null {
  if (!isRecord(value) || value.version !== GUARDIAN_REQUEST_DRAFT_VERSION || !isRecord(value.request)) return null;
  const step = value.step;
  if (step !== 1 && step !== 2 && step !== 3) return null;

  const request = value.request;
  const category = asString(request.category);
  const curriculumType = request.curriculumType === undefined ? "" : asString(request.curriculumType);
  const classCourse = asString(request.classCourse);
  const selectedSubjects = asStringArray(request.selectedSubjects);
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
  const budgetKind = asOneOf(request.budgetKind, ["range", "discuss", ""] as const);
  const budgetMinimum = asString(request.budgetMinimum);
  const budgetMaximum = asString(request.budgetMaximum);
  const notes = asString(value.notes);

  if (
    category === null ||
    curriculumType === null ||
    classCourse === null ||
    selectedSubjects === null ||
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
    budgetKind === null ||
    budgetMinimum === null ||
    budgetMaximum === null ||
    notes === null
  ) {
    return null;
  }

  return {
    version: GUARDIAN_REQUEST_DRAFT_VERSION,
    step,
    request: {
      category,
      curriculumType,
      classCourse,
      selectedSubjects,
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
      budgetKind,
      budgetMinimum,
      budgetMaximum,
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
