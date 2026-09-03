/**
 * How a Guardian found Connect Tutors BD, and where the student studies.
 *
 * Both travel with a tuition request but neither reaches the Job Board: the
 * referral answer is ours to count, not a Tutor's to read, and naming the
 * student's institute alongside a city and an area narrows an address further
 * than the Guardian agreed to. `server/job-board-projection.ts` keeps the
 * public allow-list; nothing here is in it.
 */

export const REQUEST_SOURCE_VALUES = ["friends_family", "facebook", "websites", "others"] as const;

export type RequestSource = (typeof REQUEST_SOURCE_VALUES)[number];

const SOURCE_LABELS: Record<RequestSource, string> = {
  friends_family: "Friends & Family",
  facebook: "Facebook",
  websites: "Websites",
  others: "Others",
};

export function isRequestSource(value: unknown): value is RequestSource {
  return typeof value === "string" && (REQUEST_SOURCE_VALUES as readonly string[]).includes(value);
}

/** The stored value written for a reader; an unknown or empty value reads "Not set". */
export function formatRequestSource(value: unknown): string {
  return isRequestSource(value) ? SOURCE_LABELS[value] : "Not set";
}

export const INSTITUTE_NAME_MAX_LENGTH = 120;
export const INSTITUTE_NAME_PLACEHOLDER = "Ex. Dhaka College";

/**
 * Free text, not a pick from `academic_institutes`. One school will therefore
 * arrive spelled several ways; that is the Guardian's convenience bought at the
 * cost of countable data, and it is a deliberate choice.
 */
export function normalizeInstituteName(value: unknown): string {
  return typeof value === "string" ? value.trim().replace(/\s+/g, " ") : "";
}

/** Blank stays blank - the field is optional, and "" would be a false answer. */
export function formatInstituteName(value: unknown): string {
  const name = normalizeInstituteName(value);
  return name || "Not set";
}
