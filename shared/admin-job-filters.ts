/**
 * What an Admin can narrow a list of tuitions by.
 *
 * The first thirteen are the Job Board's own filters, so the Admin's list and
 * the board read a tuition the same way; the rest are what only an Admin has to
 * go on - the salary, who posted it, who the Guardian is, whether a Guardian's
 * request is waiting, how long it has sat in its stage - and, for the stages
 * after Live, the dates and money that stage is about.
 *
 * The state is what the panel holds (every value a string, a list of strings or
 * a flag, so an empty box and a missing filter are the same thing); the input
 * is what the server takes. `buildAdminJobFilterInput` is the only way from one
 * to the other.
 */
import { cancellationReasonLabels, cancellationReasons } from "./platform-charge";
import { jobPaymentStatusLabels, jobPaymentStatusValues } from "./job-payment-status";
import { parseSalaryAmount } from "./salary-amount";

export type AdminJobStage = "pending" | "live" | "appointed" | "confirmed" | "closed" | "cancelled";

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
  daysInStage: "" | "3" | "7" | "14" | "30" | "60" | "90";
  /** Pending only: where in moderation the tuition is. */
  publicationStates: string[];
  /** Live only: how many Tutors have applied. */
  applicants: "" | "none" | "few" | "many";
  /** Applied Tutors and Tutor Matching: whether any applicant is on the Admin's shortlist. */
  shortlisted: "" | "has" | "none";
  /**
   * Applied Tutors and Tutor Matching: which of Live, Appointed and Confirmed to
   * list. It chooses the stages the list asks for, so it is not part of the
   * filter input below.
   */
  listStages: string[];
  /** The day a Tutor was appointed; Appointed and Confirmed. */
  appointedFrom: string;
  appointedTo: string;
  /** The day the Guardian kept the Tutor; Confirmed. */
  confirmedFrom: string;
  confirmedTo: string;
  /** The day the last payment closed the tuition; Closed. */
  closedFrom: string;
  closedTo: string;
  /** The day the tuition was cancelled; Cancelled. */
  cancelledFrom: string;
  cancelledTo: string;
  /** The gender of the Tutor who holds the tuition. */
  tutorGender: "" | "male" | "female";
  /** Confirmed and Cancelled: how much of the fee is paid. (A Closed tuition is always Full Paid.) */
  paymentStatuses: string[];
  /** Confirmed and Closed: whether a Confirmation Letter has been issued. */
  letter: "" | "issued" | "not_issued";
  /** Cancelled: whether the Admin has settled what the Tutor owes or is owed. */
  settlement: "" | "not_settled" | "settled" | "refund";
  /** Cancelled: what became of a refund. */
  refundDisposition: "" | "credited" | "refunded";
  /** Cancelled: why the Admin decided the tuition ended. */
  settlementReasons: string[];
  /** Cancelled: words from the reason typed when it was cancelled. */
  cancelReason: string;
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
  shortlisted: "",
  listStages: [],
  appointedFrom: "",
  appointedTo: "",
  confirmedFrom: "",
  confirmedTo: "",
  closedFrom: "",
  closedTo: "",
  cancelledFrom: "",
  cancelledTo: "",
  tutorGender: "",
  paymentStatuses: [],
  letter: "",
  settlement: "",
  refundDisposition: "",
  settlementReasons: [],
  cancelReason: "",
};

type FilterKey = keyof AdminJobFilterState;

/**
 * The filters that mean something in some stages only, by stage.
 *
 * One that two stages share (the Appointed date, the Tutor's gender) is listed
 * under both and stays when the Admin moves between them.
 */
export const STAGE_ONLY_FILTERS: Partial<Record<AdminJobStage, readonly FilterKey[]>> = {
  pending: ["publicationStates"],
  live: ["applicants"],
  appointed: ["appointedFrom", "appointedTo", "tutorGender"],
  confirmed: ["confirmedFrom", "confirmedTo", "appointedFrom", "appointedTo", "paymentStatuses", "letter", "tutorGender"],
  closed: ["closedFrom", "closedTo", "confirmedFrom", "confirmedTo", "appointedFrom", "appointedTo", "letter", "tutorGender"],
  cancelled: ["cancelledFrom", "cancelledTo", "settlement", "refundDisposition", "settlementReasons", "cancelReason", "paymentStatuses", "tutorGender"],
};

/** The filters a stage cannot answer: a cancelled tuition has no request left to wait on. */
const STAGE_EXCLUDED_FILTERS: Partial<Record<AdminJobStage, readonly FilterKey[]>> = {
  cancelled: ["waitingRequest"],
};

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
  { id: "60", label: "60+ days" },
  { id: "90", label: "90+ days" },
] as const;

export const adminJobApplicantOptions = [
  { id: "none", label: "No applicants" },
  { id: "few", label: "1 to 5 applicants" },
  { id: "many", label: "6 or more" },
] as const;

export const adminJobShortlistedOptions = [
  { id: "has", label: "Has shortlisted" },
  { id: "none", label: "None shortlisted" },
] as const;

/** The stages a tuition can have applicants in: on the Job Board, or past it. */
export const adminJobListStageOptions = [
  { id: "live", label: "Live" },
  { id: "appointed", label: "Appointed" },
  { id: "confirmed", label: "Confirmed" },
] as const;

export const adminJobPaymentStatusOptions = jobPaymentStatusValues.map(id => ({ id, label: jobPaymentStatusLabels[id] }));

export const adminJobLetterOptions = [
  { id: "issued", label: "Issued" },
  { id: "not_issued", label: "Not issued" },
] as const;

export const adminJobSettlementOptions = [
  { id: "not_settled", label: "Not settled" },
  { id: "settled", label: "Settled" },
  { id: "refund", label: "With a refund" },
] as const;

export const adminJobRefundDispositionOptions = [
  { id: "credited", label: "Credited" },
  { id: "refunded", label: "Sent back" },
] as const;

export const adminJobSettlementReasonOptions = cancellationReasons.map(id => ({ id, label: cancellationReasonLabels[id] }));

/**
 * Drops what does not belong to the stage now open.
 *
 * A Pending-only choice has no meaning once the Live tab is showing, and one
 * that stays set but cannot be seen would go on narrowing the list with nothing
 * on screen to explain it.
 */
export function clearOtherStageFilters(filters: AdminJobFilterState, stage: AdminJobStage): AdminJobFilterState {
  const kept: readonly FilterKey[] = STAGE_ONLY_FILTERS[stage] ?? [];
  const cleared: FilterKey[] = [...(STAGE_EXCLUDED_FILTERS[stage] ?? [])];
  for (const keys of Object.values(STAGE_ONLY_FILTERS)) {
    for (const key of keys ?? []) if (!kept.includes(key) && !cleared.includes(key)) cleared.push(key);
  }
  let next = filters;
  for (const key of cleared) next = { ...next, [key]: DEFAULT_ADMIN_JOB_FILTERS[key] };
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

/** The first moment of a day typed into a date box, or undefined while the box is empty. */
function startOfDay(value: string) {
  const day = trimmed(value);
  return day ? new Date(`${day}T00:00:00`) : undefined;
}

/** The last moment of it, or a tuition posted at noon on the last day would fall outside its own range. */
function endOfDay(value: string) {
  const day = trimmed(value);
  return day ? new Date(`${day}T23:59:59.999`) : undefined;
}

/** The panel's state as the server wants it: an unused filter is left out, not sent empty. */
export function buildAdminJobFilterInput(filters: AdminJobFilterState) {
  const list = <T,>(values: T[]) => (values.length ? values : undefined);
  const postedFrom = startOfDay(filters.postedFrom);
  const postedTo = endOfDay(filters.postedTo);
  const appointedFrom = startOfDay(filters.appointedFrom);
  const appointedTo = endOfDay(filters.appointedTo);
  const confirmedFrom = startOfDay(filters.confirmedFrom);
  const confirmedTo = endOfDay(filters.confirmedTo);
  const closedFrom = startOfDay(filters.closedFrom);
  const closedTo = endOfDay(filters.closedTo);
  const cancelledFrom = startOfDay(filters.cancelledFrom);
  const cancelledTo = endOfDay(filters.cancelledTo);
  const salaryFrom = salaryOf(filters.salaryFrom);
  const salaryTo = salaryOf(filters.salaryTo);
  const cityId = trimmed(filters.cityId);
  const guardian = trimmed(filters.guardian);
  const jobId = trimmed(filters.jobId);
  const cancelReason = trimmed(filters.cancelReason);
  return {
    ...(postedFrom ? { postedFrom } : {}),
    ...(postedTo ? { postedTo } : {}),
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
    ...(filters.shortlisted ? { shortlisted: filters.shortlisted } : {}),
    ...(appointedFrom ? { appointedFrom } : {}),
    ...(appointedTo ? { appointedTo } : {}),
    ...(confirmedFrom ? { confirmedFrom } : {}),
    ...(confirmedTo ? { confirmedTo } : {}),
    ...(closedFrom ? { closedFrom } : {}),
    ...(closedTo ? { closedTo } : {}),
    ...(cancelledFrom ? { cancelledFrom } : {}),
    ...(cancelledTo ? { cancelledTo } : {}),
    ...(filters.tutorGender ? { tutorGender: filters.tutorGender } : {}),
    ...(list(filters.paymentStatuses) ? { paymentStatuses: filters.paymentStatuses as Array<(typeof jobPaymentStatusValues)[number]> } : {}),
    ...(filters.letter ? { letter: filters.letter } : {}),
    ...(filters.settlement ? { settlement: filters.settlement } : {}),
    ...(filters.refundDisposition ? { refundDisposition: filters.refundDisposition } : {}),
    ...(list(filters.settlementReasons) ? { settlementReasons: filters.settlementReasons as Array<(typeof cancellationReasons)[number]> } : {}),
    ...(cancelReason ? { cancelReason } : {}),
  };
}

export type AdminJobFilterInput = ReturnType<typeof buildAdminJobFilterInput>;

const dateRanges = [
  ["postedFrom", "postedTo"],
  ["appointedFrom", "appointedTo"],
  ["confirmedFrom", "confirmedTo"],
  ["closedFrom", "closedTo"],
  ["cancelledFrom", "cancelledTo"],
] as const;

/** Whether any of the date ranges, where both ends are set, is the wrong way round. */
export function adminJobDatesOutOfOrder(filters: Partial<Pick<AdminJobFilterState, (typeof dateRanges)[number][number]>>): boolean {
  return dateRanges.some(([from, to]) => Boolean(filters[from] && filters[to] && filters[from]! > filters[to]!));
}

/** Whether the two salary boxes, when both are set, are the right way round. */
export function adminJobSalaryOutOfOrder(filters: Pick<AdminJobFilterState, "salaryFrom" | "salaryTo">): boolean {
  const from = salaryOf(filters.salaryFrom);
  const to = salaryOf(filters.salaryTo);
  return from !== undefined && to !== undefined && from > to;
}
