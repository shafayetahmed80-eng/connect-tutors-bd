/**
 * What an Admin can narrow the Tutor Profiles list by, beyond the two tab rows
 * (the profile status and the stage of a Tutor's job applications) and the
 * search box.
 *
 * The state is what the panel holds - every value a string or a list of
 * strings, so an empty box and a missing filter are the same thing; the input
 * is what the server takes. `buildAdminTutorFilterInput` is the only way from
 * one to the other, and it is what the list asks with and what Notify sends to.
 */

export type AdminTutorFilterState = {
  verified: "" | "verified" | "unverified";
  tuitionType: "" | "home" | "online" | "group" | "package";
  /** The City the Tutor teaches from; the areas below belong to it. */
  cityId: string;
  locationIds: string[];
  subjects: string[];
  gender: "" | "male" | "female";
  /** Whole years of teaching experience, typed. */
  experienceFrom: string;
  experienceTo: string;
  /** The Guardians' average rating, 1 to 5, typed. */
  ratingFrom: string;
  ratingTo: string;
  /** `yyyy-mm-dd`, as a date input gives it: the day the profile was opened. */
  joinedFrom: string;
  joinedTo: string;
};

export const DEFAULT_ADMIN_TUTOR_FILTERS: AdminTutorFilterState = {
  verified: "",
  tuitionType: "",
  cityId: "",
  locationIds: [],
  subjects: [],
  gender: "",
  experienceFrom: "",
  experienceTo: "",
  ratingFrom: "",
  ratingTo: "",
  joinedFrom: "",
  joinedTo: "",
};

/** The two ceilings the panel enforces, as the Job Board's panel does; the server carries them as well. */
export const ADMIN_TUTOR_LOCATION_LIMIT = 10;
export const ADMIN_TUTOR_SUBJECT_LIMIT = 12;

export const adminTutorVerifiedOptions = [
  { id: "verified", label: "Verified" },
  { id: "unverified", label: "Unverified" },
] as const;

export const adminTutorTuitionTypeOptions = [
  { id: "home", label: "Home tuition" },
  { id: "online", label: "Online tuition" },
  { id: "group", label: "Group tuition" },
  { id: "package", label: "Package tuition" },
] as const;

export const adminTutorGenderOptions = [
  { id: "male", label: "Male" },
  { id: "female", label: "Female" },
] as const;

/** How many filters are narrowing the list: counted from what the server is asked, so a box holding words that read as nothing is not one. */
export function countAdminTutorFilters(filters: AdminTutorFilterState): number {
  return Object.keys(buildAdminTutorFilterInput(filters)).length;
}

/** A whole number of years, or undefined while the box holds nothing that reads as one. */
function yearsOf(value: string): number | undefined {
  const text = value.trim();
  if (!/^\d{1,2}$/.test(text)) return undefined;
  return Number(text);
}

/** A rating, as a number with at most one decimal, or undefined while the box does not hold one. */
function ratingOf(value: string): number | undefined {
  const text = value.trim();
  if (!/^\d(\.\d)?$/.test(text)) return undefined;
  const rating = Number(text);
  return rating >= 0 && rating <= 5 ? rating : undefined;
}

function startOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T00:00:00`) : undefined;
}

/** The last moment of the day, or a Tutor who joined at noon on the last day would fall outside the range. */
function endOfDay(value: string) {
  const day = value.trim();
  return day ? new Date(`${day}T23:59:59.999`) : undefined;
}

/** The panel's state as the server wants it: an unused filter is left out, not sent empty. */
export function buildAdminTutorFilterInput(filters: AdminTutorFilterState) {
  const experienceFrom = yearsOf(filters.experienceFrom);
  const experienceTo = yearsOf(filters.experienceTo);
  const ratingFrom = ratingOf(filters.ratingFrom);
  const ratingTo = ratingOf(filters.ratingTo);
  const joinedFrom = startOfDay(filters.joinedFrom);
  const joinedTo = endOfDay(filters.joinedTo);
  const cityId = filters.cityId.trim();
  return {
    ...(filters.verified ? { verified: filters.verified } : {}),
    ...(filters.tuitionType ? { tuitionType: filters.tuitionType } : {}),
    ...(cityId ? { cityId } : {}),
    ...(filters.locationIds.length ? { locationIds: filters.locationIds } : {}),
    ...(filters.subjects.length ? { subjects: filters.subjects } : {}),
    ...(filters.gender ? { gender: filters.gender } : {}),
    ...(experienceFrom !== undefined ? { experienceFrom } : {}),
    ...(experienceTo !== undefined ? { experienceTo } : {}),
    ...(ratingFrom !== undefined ? { ratingFrom } : {}),
    ...(ratingTo !== undefined ? { ratingTo } : {}),
    ...(joinedFrom ? { joinedFrom } : {}),
    ...(joinedTo ? { joinedTo } : {}),
  };
}

export type AdminTutorFilterInput = ReturnType<typeof buildAdminTutorFilterInput>;

/** Reasons Apply has to wait: a range the wrong way round returns nothing and says nothing. */
export function adminTutorFilterAlerts(filters: AdminTutorFilterState): string[] {
  const alerts: string[] = [];
  const experienceFrom = yearsOf(filters.experienceFrom);
  const experienceTo = yearsOf(filters.experienceTo);
  if (experienceFrom !== undefined && experienceTo !== undefined && experienceFrom > experienceTo) alerts.push("The lowest experience cannot be above the highest.");
  const ratingFrom = ratingOf(filters.ratingFrom);
  const ratingTo = ratingOf(filters.ratingTo);
  if (ratingFrom !== undefined && ratingTo !== undefined && ratingFrom > ratingTo) alerts.push("The lowest rating cannot be above the highest.");
  if (filters.joinedFrom && filters.joinedTo && filters.joinedFrom > filters.joinedTo) alerts.push("The 'from' date cannot be later than the 'to' date.");
  return alerts;
}

/** What the panel may offer, read from the Tutors that exist: nothing here returns an empty list. */
export type AdminTutorFilterOptions = {
  cities: Array<{ id: string; label: string }>;
  locationsByCity: Record<string, Array<{ id: string; label: string }>>;
  subjects: string[];
};

export const EMPTY_ADMIN_TUTOR_FILTER_OPTIONS: AdminTutorFilterOptions = { cities: [], locationsByCity: {}, subjects: [] };

/**
 * Keeps a selection honest when what it depends on changes: an area belongs to
 * a City, so dropping the City takes its areas with it - otherwise a filter no
 * one can see goes on narrowing the list.
 */
export function reconcileAdminTutorFilters(filters: AdminTutorFilterState, options: Pick<AdminTutorFilterOptions, "locationsByCity">): AdminTutorFilterState {
  const allowed = new Set((filters.cityId ? options.locationsByCity[filters.cityId] ?? [] : []).map(option => option.id));
  return { ...filters, locationIds: filters.locationIds.filter(id => allowed.has(id)) };
}
