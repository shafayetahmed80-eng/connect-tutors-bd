/**
 * The school and college list behind the Secondary and Higher Secondary
 * "Institute Name" box. Shared rows come from the Project Owner's list, one
 * division each; a name a Tutor creates is kept for that Tutor alone until
 * the Owner adds it to the list.
 */
export const schoolCollegeDivisionValues = ["dhaka", "chattogram", "rajshahi", "khulna", "barishal", "sylhet", "rangpur", "mymensingh"] as const;
export type SchoolCollegeDivision = (typeof schoolCollegeDivisionValues)[number];

export const schoolCollegeDivisionLabels: Record<SchoolCollegeDivision, string> = {
  dhaka: "Dhaka",
  chattogram: "Chattogram",
  rajshahi: "Rajshahi",
  khulna: "Khulna",
  barishal: "Barishal",
  sylhet: "Sylhet",
  rangpur: "Rangpur",
  mymensingh: "Mymensingh",
};

export const SCHOOL_NAME_MIN = 3;
export const SCHOOL_NAME_MAX = 200;
/** How many names one Tutor may create - enough for any real history, not for filling the table. */
export const SCHOOL_CREATE_LIMIT_PER_TUTOR = 30;
export const SCHOOL_SEARCH_LIMIT = 20;

/**
 * The key two spellings of one name share: case, "&"/"and", "Govt."/
 * "Government", "Cantt"/"Cantonment" and punctuation do not make a new school.
 */
export function normalizeSchoolName(name: string) {
  return name.toLowerCase()
    .replace(/&/g, " and ")
    .replace(/\bgovt\b\.?/g, "government")
    .replace(/\bcantt\b\.?/g, "cantonment")
    .replace(/['’`.,()\-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** A typed name tidied for storing: single spaces, no edge spaces. */
export function tidySchoolName(name: string) {
  return name.replace(/\s+/g, " ").trim();
}
