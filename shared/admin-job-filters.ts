/**
 * What an Admin can narrow a list of tuitions by.
 *
 * The first thirteen are the Job Board's own filters, so the Admin's list and
 * the board read a tuition the same way; the rest are what only an Admin has to
 * go on - the salary, who posted it, who the Guardian is, whether a Guardian's
 * request is waiting, how long it has sat in its stage.
 *
 * The state is what the panel holds (every value a string, a list of strings or
 * a flag, so an empty box and a missing filter are the same thing); the input
 * is what the server takes. `buildAdminJobFilterInput` is the only way from one
 * to the other.
 */

import { parseSalaryAmount } from "./salary-amount";

export type AdminJobStage = "pending" | "live" | "appointed" | "confirmed" | "cancelled";

export type AdminJobFilterState = {
  /** `yyyy-mm-dd`, as a date input gives it. */
  postedFrom: string;
  postedTo: string;
  cityId: string;
  locationIds: string[];
  tuitionTypes: string[];
  daysPerWeek: string[];
  categories: string[];
  classCourses: string[];
  subjects: string[];
  studentGender: "" | "male" | "female";
  preferredTutorGender: "" | "male" | "female" | "any";
  jobId: string;
  /** Taka, typed however an Admin writes a number: 5000, 5,000 or "5,000 Taka". */
  salaryFrom: string;
  salaryTo: string;
  postedBy: "" | "guardian" | "admin";
  /** A Guardian's name, mobile number or Guardian ID, or part of one. */
  guardian: string;
  heardAboutUs: string[];
  waitingRequest: "" | "any" | "confirm" | "remove_tutor" | "cancel_tuition";
  /** At least this many days in the stage the tuition is in, as a string. */
  daysInStage: "" | "3" | "7" | "14" | "30";
  /** Pending only: where in moderation the tuition is. */
  publicationStates: string[];
  /** Live only: how many Tutors have applied. */
  applicants: "" | "none" | "few" | "many";
  /** Live only: the Job Board listing ends within three days. */
  expiringSoon: boolean;
};

export const DEFAULT_ADMIN_JOB_FILTERS: AdminJobFilterState = {
  postedFrom: "",
  postedTo: "",
  cityId: "",
  locationIds: [],
  tuitionTypes: [],
  daysPerWeek: [],
  categories: [],
  classCourses: [],
  subjects: [],
  studentGender: "",
  preferredTutorGender: "",
  jobId: "",
  salaryFrom: "",
  salaryTo: "",
  postedBy: "",
  guardian: "",
  heardAboutUs: [],
  waitingRequest: "",
  daysInStage: "",
  publicationStates: [],
  applicants: "",
  expiringSoon: false,
};

/** The filters that mean something in one stage only, by stage. */
export const STAGE_ONLY_FILTERS = {
  pending: ["publicationStates"],
  live: ["applicants", "expiringSoon"],
} as const satisfies Partial<Record<AdminJobStage, readonly (keyof AdminJobFilterState)[]>>;

/** The two ceilings the panel enforces, as the Job Board's panel does; the server carries them as well. */
export const ADMIN_JOB_LOCATION_LIMIT = 10;
export const ADMIN_JOB_SUBJECT_LIMIT = 12;

export const adminJobPublicationStates = [
  { id: "submitted", label: "Submitted" },
  { id: "reviewing", label: "In verification" },
  { id: "changes_requested", label: "Changes requested" },
  { id: "approved", label: "Approved, not published" },
  { id: "unpublished", label: "Unpublished" },
] as const;

export const adminJobHeardAboutUsOptions = [
  { id: "friends_family", label: "Friends or family" },
  { id: "facebook", label: "Facebook" },
  { id: "websites", label: "Websites" },
  { id: "others", label: "Others" },
] as const;

export const adminJobWaitingRequestOptions = [
  { id: "any", label: "Any request" },
  { id: "confirm", label: "Confirm" },
  { id: "remove_tutor", label: "Removal" },
  { id: "cancel_tuition", label: "Cancellation" },
] as const;

export const adminJobDaysInStageOptions = [
  { id: "3", label: "3+ days" },
  { id: "7", label: "7+ days" },
  { id: "14", label: "14+ days" },
  { id: "30", label: "30+ days" },
] as const;

export const adminJobApplicantOptions = [
  { id: "none", label: "No applicants" },
  { id: "few", label: "1 to 5 applicants" },
  { id: "many", label: "6 or more" },
] as const;

/**
 * Drops what does not belong to the stage now open.
 *
 * A Pending-only choice has no meaning once the Live tab is showing, and one
 * that stays set but cannot be seen would go on narrowing the list with nothing
 * on screen to explain it.
 */
export function clearOtherStageFilters(filters: AdminJobFilterState, stage: AdminJobStage): AdminJobFilterState {
  let next = filters;
  for (const [owner, keys] of Object.entries(STAGE_ONLY_FILTERS) as Array<[AdminJobStage, readonly (keyof AdminJobFilterState)[]]>) {
    if (owner === stage) continue;
    for (const key of keys) next = { ...next, [key]: DEFAULT_ADMIN_JOB_FILTERS[key] };
  }
  return next;
}

/** How many filters are narrowing the list. */
export function countAdminJobFilters(filters: AdminJobFilterState): number {
  return Object.values(filters).filter(value => (Array.isArray(value) ? value.length > 0 : typeof value === "boolean" ? value : Boolean(value.trim()))).length;
}

function trimmed(value: string) {
  const text = value.trim();
  return text || undefined;
}

/** A salary as every other salary box in the Admin panel reads it: the digits, whatever else was typed. */
function salaryOf(value: string) {
  return parseSalaryAmount(value) ?? undefined;
}

/** The panel's state as the server wants it: an unused filter is left out, not sent empty. */
export function buildAdminJobFilterInput(filters: AdminJobFilterState) {
  const list = <T,>(values: T[]) => (values.length ? values : undefined);
  const from = trimmed(filters.postedFrom);
  const to = trimmed(filters.postedTo);
  const salaryFrom = salaryOf(filters.salaryFrom);
  const salaryTo = salaryOf(filters.salaryTo);
  const cityId = trimmed(filters.cityId);
  const guardian = trimmed(filters.guardian);
  const jobId = trimmed(filters.jobId);
  return {
    ...(from ? { postedFrom: new Date(`${from}T00:00:00`) } : {}),
    ...(to ? { postedTo: new Date(`${to}T23:59:59.999`) } : {}),
    ...(cityId ? { cityId } : {}),
    ...(list(filters.locationIds) ? { locationIds: filters.locationIds } : {}),
    ...(list(filters.tuitionTypes) ? { tuitionTypes: filters.tuitionTypes as Array<"home" | "online" | "both" | "group" | "package"> } : {}),
    ...(list(filters.daysPerWeek) ? { daysPerWeek: filters.daysPerWeek.map(Number) } : {}),
    ...(list(filters.categories) ? { categories: filters.categories } : {}),
    ...(list(filters.classCourses) ? { classCourses: filters.classCourses } : {}),
    ...(list(filters.subjects) ? { subjects: filters.subjects } : {}),
    ...(filters.studentGender ? { studentGender: filters.studentGender } : {}),
    ...(filters.preferredTutorGender ? { preferredTutorGender: filters.preferredTutorGender } : {}),
    ...(jobId ? { jobId } : {}),
    ...(salaryFrom !== undefined ? { salaryFrom } : {}),
    ...(salaryTo !== undefined ? { salaryTo } : {}),
    ...(filters.postedBy ? { postedBy: filters.postedBy } : {}),
    ...(guardian ? { guardian } : {}),
    ...(list(filters.heardAboutUs) ? { heardAboutUs: filters.heardAboutUs as Array<(typeof adminJobHeardAboutUsOptions)[number]["id"]> } : {}),
    ...(filters.waitingRequest ? { waitingRequest: filters.waitingRequest } : {}),
    ...(filters.daysInStage ? { daysInStage: Number(filters.daysInStage) } : {}),
    ...(list(filters.publicationStates) ? { publicationStates: filters.publicationStates as Array<(typeof adminJobPublicationStates)[number]["id"]> } : {}),
    ...(filters.applicants ? { applicants: filters.applicants } : {}),
    ...(filters.expiringSoon ? { expiringSoon: true as const } : {}),
  };
}

export type AdminJobFilterInput = ReturnType<typeof buildAdminJobFilterInput>;

/** Whether the two dates, when both are set, are the right way round. */
export function adminJobDatesOutOfOrder(filters: Pick<AdminJobFilterState, "postedFrom" | "postedTo">): boolean {
  return Boolean(filters.postedFrom && filters.postedTo && filters.postedFrom > filters.postedTo);
}

/** Whether the two salary boxes, when both are set, are the right way round. */
export function adminJobSalaryOutOfOrder(filters: Pick<AdminJobFilterState, "salaryFrom" | "salaryTo">): boolean {
  const from = salaryOf(filters.salaryFrom);
  const to = salaryOf(filters.salaryTo);
  return from !== undefined && to !== undefined && from > to;
}
