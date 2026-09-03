import { isJobIdNumber } from "@shared/job-id";

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

/**
 * A Job ID someone typed into the board's search box.
 *
 * There is one shape now: the number every job is given the moment its request
 * is made. An Admin used to be able to set a `CT-MAN-XXXXXX` by hand, which
 * meant two kinds of ID for the same kind of thing and no way to tell from a
 * number alone which a job would have.
 *
 * The search used to validate against that manual pattern alone, so searching
 * for an ordinary job's ID always failed - it rejected the very format the
 * board itself displayed.
 */
export function normalizeJobIdSearch(value: string): string {
  const normalized = value.trim();
  if (!isJobIdNumber(normalized)) throw new Error("Enter a Job ID like 6800.");
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
    : normalizeJobIdSearch(input.jobId);

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
