export const JOB_ID_PATTERN = /^CT-MAN-[A-Z0-9]{6}$/;

export const JOB_LIFECYCLE_STATES = [
  "draft",
  "submitted",
  "reviewing",
  "changes_requested",
  "approved",
  "unpublished",
  "published",
  "matched",
  "closed",
  "cancelled",
] as const;

export type JobLifecycleState = (typeof JOB_LIFECYCLE_STATES)[number];

const ALLOWED_TRANSITIONS: Record<JobLifecycleState, readonly JobLifecycleState[]> = {
  draft: ["submitted", "cancelled"],
  submitted: ["reviewing", "cancelled"],
  reviewing: ["changes_requested", "approved", "cancelled"],
  changes_requested: ["submitted", "cancelled"],
  approved: ["unpublished", "cancelled"],
  unpublished: ["published", "cancelled"],
  published: ["closed", "cancelled"],
  matched: [],
  closed: [],
  cancelled: [],
};

export function canTransitionJobState(
  from: JobLifecycleState,
  to: JobLifecycleState,
): boolean {
  return ALLOWED_TRANSITIONS[from].includes(to);
}

export function validateManualJobId(value: string): string {
  const normalized = value.trim();
  if (!JOB_ID_PATTERN.test(normalized)) {
    throw new Error("Manual Job ID must match CT-MAN-XXXXXX.");
  }
  return normalized;
}

export function isJobExpired(expiresAt: Date | null, now = new Date()): boolean {
  return expiresAt !== null && expiresAt.getTime() <= now.getTime();
}

export type JobTitleInput = {
  category: string;
  classCourse: string;
  studentCount: number;
  daysPerWeek: number;
};

function safeTitlePart(value: string): string {
  return value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");
}

export function buildJobTitle({
  category,
  classCourse,
  studentCount,
  daysPerWeek,
}: JobTitleInput): string {
  const normalizedCategory = safeTitlePart(category);
  const normalizedClassCourse = safeTitlePart(classCourse);
  const studentLabel = studentCount === 1 ? "Student" : "Students";
  return `Need ${normalizedCategory} Tutor for ${normalizedClassCourse} ${studentLabel}-${daysPerWeek} Days/Week`;
}

export type JobBoardFilters = {
  cityId?: string;
  locationId?: string;
  tuitionType?: "home" | "online" | "both" | "group" | "package";
  page: number;
  pageSize: number;
  jobId?: string;
};

type JobBoardFilterInput = Omit<Partial<JobBoardFilters>, "page" | "pageSize"> & {
  page?: number | string;
  pageSize?: number | string;
};

function normalizePositiveInteger(value: number | string | undefined, fallback: number, maximum?: number): number {
  const normalized = value === undefined ? fallback : Number(value);
  if (!Number.isInteger(normalized) || normalized < 1 || (maximum !== undefined && normalized > maximum)) {
    throw new Error("Pagination value is invalid.");
  }
  return normalized;
}

function normalizeOptionalIdentifier(value: string | undefined, fieldName: string): string | undefined {
  if (value === undefined) return undefined;
  const normalized = value.trim();
  if (!normalized) throw new Error(`${fieldName} cannot be empty.`);
  return normalized;
}

export function normalizeJobBoardFilters(input: JobBoardFilterInput): JobBoardFilters {
  const cityId = normalizeOptionalIdentifier(input.cityId, "City");
  const locationId = normalizeOptionalIdentifier(input.locationId, "Location");
  const jobId = input.jobId === undefined
    ? undefined
    : validateManualJobId(input.jobId);

  return {
    ...(cityId ? { cityId } : {}),
    ...(locationId ? { locationId } : {}),
    ...(input.tuitionType ? { tuitionType: input.tuitionType } : {}),
    page: normalizePositiveInteger(input.page, 1),
    pageSize: normalizePositiveInteger(input.pageSize, 24, 100),
    ...(jobId ? { jobId } : {}),
  };
}

export type PaginationMeta = {
  page: number;
  pageSize: number;
  totalCount: number;
  totalPages: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
};

export function createPaginationMeta(
  totalCount: number,
  page: number,
  pageSize: number,
): PaginationMeta {
  if (!Number.isInteger(totalCount) || totalCount < 0) {
    throw new Error("Total count cannot be negative.");
  }
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  return {
    page,
    pageSize,
    totalCount,
    totalPages,
    hasPreviousPage: page > 1,
    hasNextPage: page < totalPages,
  };
}
