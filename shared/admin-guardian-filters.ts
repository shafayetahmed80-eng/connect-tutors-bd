/**
 * What an Admin can narrow the Guardian Profiles list by, beyond the
 * Verification tabs and the search box.
 *
 * The state is what the panel holds - every value a string, so an empty box and
 * a missing filter are the same thing; the input is what the server takes.
 * `buildAdminGuardianFilterInput` is the only way from one to the other, and it
 * is what the list asks with and what Notify sends to.
 */

export type AdminGuardianFilterState = {
  /** `yyyy-mm-dd`, as a date input gives it: the day the account was opened. */
  joinedFrom: string;
  joinedTo: string;
  /** How many tuitions the Guardian has posted: none, exactly one, or two and more. */
  tuitions: "" | "none" | "one" | "many";
  /** Whether a change request of the Guardian's waits for an Admin. */
  changeRequest: "" | "has" | "none";
  accountStatus: "" | "active" | "suspended" | "closed";
};

export const DEFAULT_ADMIN_GUARDIAN_FILTERS: AdminGuardianFilterState = {
  joinedFrom: "",
  joinedTo: "",
  tuitions: "",
  changeRequest: "",
  accountStatus: "",
};

export const adminGuardianTuitionOptions = [
  { id: "none", label: "No tuition posted" },
  { id: "one", label: "One tuition" },
  { id: "many", label: "Two or more" },
] as const;

export const adminGuardianChangeRequestOptions = [
  { id: "has", label: "Has waiting" },
  { id: "none", label: "None waiting" },
] as const;

export const adminGuardianAccountStatusOptions = [
  { id: "active", label: "Active" },
  { id: "suspended", label: "Suspended" },
  { id: "closed", label: "Closed" },
] as const;

function startOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T00:00:00`) : undefined;
}

/** The last moment of the day, or a Guardian who joined at noon on the last day would fall outside the range. */
function endOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T23:59:59.999`) : undefined;
}

/** The panel's state as the server wants it: an unused filter is left out, not sent empty. */
export function buildAdminGuardianFilterInput(filters: AdminGuardianFilterState) {
  const joinedFrom = startOfDay(filters.joinedFrom);
  const joinedTo = endOfDay(filters.joinedTo);
  return {
    ...(joinedFrom ? { joinedFrom } : {}),
    ...(joinedTo ? { joinedTo } : {}),
    ...(filters.tuitions ? { tuitions: filters.tuitions } : {}),
    ...(filters.changeRequest ? { changeRequest: filters.changeRequest } : {}),
    ...(filters.accountStatus ? { accountStatus: filters.accountStatus } : {}),
  };
}

export type AdminGuardianFilterInput = ReturnType<typeof buildAdminGuardianFilterInput>;

/** How many filters are narrowing the list. */
export function countAdminGuardianFilters(filters: AdminGuardianFilterState): number {
  return Object.keys(buildAdminGuardianFilterInput(filters)).length;
}

/** Reasons Apply has to wait: a range the wrong way round returns nothing and says nothing. */
export function adminGuardianFilterAlerts(filters: AdminGuardianFilterState): string[] {
  return filters.joinedFrom && filters.joinedTo && filters.joinedFrom > filters.joinedTo
    ? ["The 'from' date cannot be later than the 'to' date."]
    : [];
}
