import { buildJobTitle } from "./job-board.contract";
import { findSiteLimit } from "@shared/site-limits";
import { jobIdForRequest } from "@shared/job-id";

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
  budgetAmount: number | null;
  notes: string | null;
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
  budgetAmount: number | null;
  notes: string | null;
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
 *
 * It used to read `CT-JOB-000002` and now reads `6800`. The same number is
 * shown on a Pending request before it is published, so a Guardian and a Tutor
 * can be talking about the same job without either having to translate.
 */
export const generateAutoJobId = jobIdForRequest;

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
    budgetAmount: input.budgetAmount,
    notes: input.notes,
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
  budgetAmount: number | null;
  notes: string | null;
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
    // One number, or null on the two requests that predate the change. The
    // Job Board writes it as "5,000 Taka" or "Not set".
    budgetAmount: row.budgetAmount,
    // Public because nothing reaches this board unreviewed: an Admin reads the
    // request and publishes it deliberately, and can edit the note first. That
    // review is the safeguard, so it has to be real - the Admin's publication
    // editor shows and edits this field for exactly that reason.
    notes: row.notes,
    country: row.country,
    cityLocationId: row.cityLocationId,
    locationId: row.locationId,
    locationLabel: row.locationLabel,
    directionLabel: row.directionLabel,
    publishedAt: row.publishedAt,
    expiresAt: row.expiresAt,
  };
}
