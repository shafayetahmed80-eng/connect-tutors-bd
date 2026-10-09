/**
 * What an Admin can narrow the two request queues by - Guardian Requests (the
 * Shortlist, Appoint, Confirm and Cancel screens) and Change requests - beyond
 * the status tabs and the search box.
 *
 * Each state is what its panel holds - every value a string, so an empty box and
 * a missing filter are the same thing; each input is what the server takes, and
 * its `build` function is the only way from one to the other.
 */

function startOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T00:00:00`) : undefined;
}

/** The last moment of the day, or a request made at noon on the last day would fall outside the range. */
function endOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T23:59:59.999`) : undefined;
}

const datesOutOfOrder = (from: string, to: string) => Boolean(from && to && from > to);
const DATES_OUT_OF_ORDER = "The 'from' date cannot be later than the 'to' date.";

// ---------------------------------------------------------------- Guardian Requests

export type AdminGuardianRequestFilterState = {
  /** `yyyy-mm-dd`, as a date input gives it: the day the Guardian asked (or shortlisted). */
  requestedFrom: string;
  requestedTo: string;
  /** The Cancel screen holds two kinds of request. */
  requestType: "" | "remove_tutor" | "cancel_tuition";
  postedBy: "" | "guardian" | "admin";
  /** The stage the tuition is in now. */
  tuitionStage: "" | "live" | "appointed" | "confirmed" | "cancelled";
};

export const DEFAULT_ADMIN_GUARDIAN_REQUEST_FILTERS: AdminGuardianRequestFilterState = {
  requestedFrom: "",
  requestedTo: "",
  requestType: "",
  postedBy: "",
  tuitionStage: "",
};

export const adminGuardianRequestTypeOptions = [
  { id: "remove_tutor", label: "Remove Tutor" },
  { id: "cancel_tuition", label: "Cancel tuition" },
] as const;

export const adminRequestPostedByOptions = [
  { id: "guardian", label: "Guardian" },
  { id: "admin", label: "Admin" },
] as const;

export const adminRequestTuitionStageOptions = [
  { id: "live", label: "Live" },
  { id: "appointed", label: "Appointed" },
  { id: "confirmed", label: "Confirmed" },
  { id: "cancelled", label: "Cancelled" },
] as const;

export function buildAdminGuardianRequestFilterInput(filters: AdminGuardianRequestFilterState) {
  const requestedFrom = startOfDay(filters.requestedFrom);
  const requestedTo = endOfDay(filters.requestedTo);
  return {
    ...(requestedFrom ? { requestedFrom } : {}),
    ...(requestedTo ? { requestedTo } : {}),
    ...(filters.requestType ? { requestType: filters.requestType } : {}),
    ...(filters.postedBy ? { postedBy: filters.postedBy } : {}),
    ...(filters.tuitionStage ? { tuitionStage: filters.tuitionStage } : {}),
  };
}

export type AdminGuardianRequestFilterInput = ReturnType<typeof buildAdminGuardianRequestFilterInput>;

export function countAdminGuardianRequestFilters(filters: AdminGuardianRequestFilterState): number {
  return Object.keys(buildAdminGuardianRequestFilterInput(filters)).length;
}

export function adminGuardianRequestFilterAlerts(filters: AdminGuardianRequestFilterState): string[] {
  return datesOutOfOrder(filters.requestedFrom, filters.requestedTo) ? [DATES_OUT_OF_ORDER] : [];
}

// ---------------------------------------------------------------- Change requests

export type AdminChangeRequestFilterState = {
  role: "" | "guardian" | "tutor" | "admin";
  type: "" | "name" | "mobile" | "verification" | "close_account";
  /** `yyyy-mm-dd`: the day the account asked. */
  requestedFrom: string;
  requestedTo: string;
  /** Declined tab only: words from the reason the Admin gave. */
  declineReason: string;
};

export const DEFAULT_ADMIN_CHANGE_REQUEST_FILTERS: AdminChangeRequestFilterState = {
  role: "",
  type: "",
  requestedFrom: "",
  requestedTo: "",
  declineReason: "",
};

export function buildAdminChangeRequestFilterInput(filters: AdminChangeRequestFilterState) {
  const requestedFrom = startOfDay(filters.requestedFrom);
  const requestedTo = endOfDay(filters.requestedTo);
  const declineReason = filters.declineReason.trim();
  return {
    ...(filters.role ? { role: filters.role } : {}),
    ...(filters.type ? { type: filters.type } : {}),
    ...(requestedFrom ? { requestedFrom } : {}),
    ...(requestedTo ? { requestedTo } : {}),
    ...(declineReason ? { declineReason } : {}),
  };
}

export type AdminChangeRequestFilterInput = ReturnType<typeof buildAdminChangeRequestFilterInput>;

export function countAdminChangeRequestFilters(filters: AdminChangeRequestFilterState): number {
  return Object.keys(buildAdminChangeRequestFilterInput(filters)).length;
}

export function adminChangeRequestFilterAlerts(filters: AdminChangeRequestFilterState): string[] {
  return datesOutOfOrder(filters.requestedFrom, filters.requestedTo) ? [DATES_OUT_OF_ORDER] : [];
}
