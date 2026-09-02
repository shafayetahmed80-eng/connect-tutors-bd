import { buildJobTitle } from "./job-board.contract";
import { findSiteLimit } from "@shared/site-limits";

/**
 * How long a published tuition stays on the board unless an Admin closes or
 * unpublishes it earlier.
 *
 * The Owner can change this from the Admin panel. What is here is the number
 * the site ships with, and the fallback wherever the stored settings cannot be
 * read - the projection is pure, so the caller passes the resolved value in.
 */
export const DEFAULT_JOB_EXPIRY_DAYS = findSiteLimit("jobBoard.expiryDays")!.value;
const DAY_IN_MILLISECONDS = 86_400_000;

export function calculateJobExpiry(from: Date, expiryDays: number = DEFAULT_JOB_EXPIRY_DAYS): Date {
  return new Date(from.getTime() + expiryDays * DAY_IN_MILLISECONDS);
}

export type SafeTutorRequestForPublication = {
  requestId: number;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  category: string;
  classCourse: string;
  subjects: string[];
  groupCapacity: number | null;
  /** Set only for Home, Online, Package, and compatible legacy request types. */
  studentCount: number | null;
  /** Student Gender is intentionally public only when the Guardian supplied it. */
  studentGender: "male" | "female" | null;
  daysPerWeek: number;
  preferredTutorGender: "male" | "female" | "any";
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  budgetMode: "range" | "discuss";
  budgetMinimum: number | null;
  budgetMaximum: number | null;
  publishedAt: Date;
  /** Present in callers only to demonstrate that private inputs never pass to output. */
  privateAddress?: string | null;
  addressDetails?: string | null;
  guardianPhone?: string | null;
};

export type PublishedTutorJobProjection = {
  tutorRequestId: number;
  publicJobId: string;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  category: string;
  classCourse: string;
  subjects: string;
  studentCount: number;
  studentGender: "male" | "female" | null;
  preferredTutorGender: "male" | "female" | "any";
  daysPerWeek: number;
  budgetMode: "range" | "discuss";
  budgetMinimum: number | null;
  budgetMaximum: number | null;
  country: "Bangladesh";
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  directionLabel: string | null;
  publishedAt: Date;
  expiresAt: Date;
};

/**
 * One request can have at most one published-job projection, making this
 * deterministic ID both collision-free and stable across unpublish/re-publish.
 */
export function generateAutoJobId(requestId: number): string {
  if (!Number.isInteger(requestId) || requestId <= 0) {
    throw new Error("Request ID must be a positive integer.");
  }
  const encoded = requestId.toString(36).toUpperCase();
  if (encoded.length > 6) throw new Error("Request ID is too large for the Job ID format.");
  return `CT-JOB-${encoded.padStart(6, "0")}`;
}

export function buildPublishedTutorJobProjection(input: SafeTutorRequestForPublication, expiryDays: number = DEFAULT_JOB_EXPIRY_DAYS): PublishedTutorJobProjection {
  const directionLabel = input.tuitionType === "online" ? null : input.locationLabel;
  return {
    tutorRequestId: input.requestId,
    publicJobId: generateAutoJobId(input.requestId),
    tuitionType: input.tuitionType,
    category: input.category.trim(),
    classCourse: input.classCourse.trim(),
    subjects: JSON.stringify(input.subjects.map(subject => subject.trim()).filter(Boolean)),
    studentCount: input.tuitionType === "group" ? input.groupCapacity ?? 1 : input.studentCount ?? 1,
    studentGender: input.studentGender,
    preferredTutorGender: input.preferredTutorGender,
    daysPerWeek: input.daysPerWeek,
    budgetMode: input.budgetMode,
    budgetMinimum: input.budgetMode === "range" ? input.budgetMinimum : null,
    budgetMaximum: input.budgetMode === "range" ? input.budgetMaximum : null,
    country: "Bangladesh",
    cityLocationId: input.tuitionType === "online" ? null : input.cityLocationId,
    locationId: input.tuitionType === "online" ? null : input.locationId,
    locationLabel: input.tuitionType === "online" ? null : input.locationLabel,
    directionLabel,
    publishedAt: input.publishedAt,
    expiresAt: calculateJobExpiry(input.publishedAt, expiryDays),
  };
}

/**
 * The public Job ID and source-request link never change after first publication.
 * Every other projected field is refreshed from the latest verified request when
 * an Admin re-publishes it, so the Job Board cannot retain stale job details.
 */
export function getPublishedTutorJobRefresh(projection: PublishedTutorJobProjection) {
  const { tutorRequestId: _tutorRequestId, publicJobId: _publicJobId, ...refresh } = projection;
  return { ...refresh, publicationStatus: "published" as const, deactivatedAt: null };
}

type PublishedTutorJobRow = {
  id: number;
  publicJobId: string;
  tuitionType: "home" | "online" | "both" | "group" | "package";
  category: string;
  classCourse: string;
  subjects: string;
  studentCount: number;
  studentGender: "male" | "female" | "any" | null;
  preferredTutorGender: "male" | "female" | "any";
  daysPerWeek: number;
  budgetMode: "range" | "discuss";
  budgetMinimum: number | null;
  budgetMaximum: number | null;
  country: string;
  cityLocationId: string | null;
  locationId: string | null;
  locationLabel: string | null;
  directionLabel: string | null;
  publishedAt: Date;
  expiresAt: Date;
};

function parsePublicSubjects(value: string): string[] {
  try {
    const parsed: unknown = JSON.parse(value);
    if (Array.isArray(parsed)) return parsed.filter((item): item is string => typeof item === "string" && Boolean(item.trim()));
  } catch {
    // A malformed legacy row renders a safe empty subject list instead of leaking raw data.
  }
  return [];
}

/** Deliberate public allow-list. Never spread a request or database row here. */
export function toPublicTutorJob(row: PublishedTutorJobRow) {
  const subjects = parsePublicSubjects(row.subjects);
  return {
    id: row.id,
    jobId: row.publicJobId,
    title: buildJobTitle({
      category: row.category,
      classCourse: row.classCourse,
      studentCount: row.studentCount,
      daysPerWeek: row.daysPerWeek,
    }),
    tuitionType: row.tuitionType,
    category: row.category,
    classCourse: row.classCourse,
    subjects,
    studentCount: row.studentCount,
    ...(row.studentGender === "male" || row.studentGender === "female" ? { studentGender: row.studentGender } : {}),
    preferredTutorGender: row.preferredTutorGender,
    daysPerWeek: row.daysPerWeek,
    budget: row.budgetMode === "range" && row.budgetMinimum !== null && row.budgetMaximum !== null
      ? { kind: "range" as const, minimum: row.budgetMinimum, maximum: row.budgetMaximum }
      : { kind: "discuss" as const },
    country: row.country,
    cityLocationId: row.cityLocationId,
    locationId: row.locationId,
    locationLabel: row.locationLabel,
    directionLabel: row.directionLabel,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
  };
}
