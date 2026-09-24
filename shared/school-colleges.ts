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

/** How many rows one paste into the bulk importer may add at once. */
export const SCHOOL_BULK_IMPORT_MAX = 1000;

const divisionByToken: Record<string, SchoolCollegeDivision> = Object.fromEntries([
  ...schoolCollegeDivisionValues.map(value => [value, value]),
  ...schoolCollegeDivisionValues.map(value => [schoolCollegeDivisionLabels[value].toLowerCase(), value]),
]);

export type BulkSchoolCollegeRow = { name: string; division: SchoolCollegeDivision };

/**
 * One school/college per line, pasted into the bulk importer. A line may end
 * with `, <Division>` to name its own division; without one, `defaultDivision`
 * is used. A line too short to be a name, or with neither a division of its
 * own nor a default, is returned in `invalidLines` instead of `rows`.
 */
export function parseBulkSchoolColleges(text: string, defaultDivision: SchoolCollegeDivision | null): { rows: BulkSchoolCollegeRow[]; invalidLines: string[] } {
  const rows: BulkSchoolCollegeRow[] = [];
  const invalidLines: string[] = [];
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line) continue;
    let namePart = line;
    let division = defaultDivision;
    const commaIndex = line.lastIndexOf(",");
    if (commaIndex !== -1) {
      const matched = divisionByToken[line.slice(commaIndex + 1).trim().toLowerCase()];
      if (matched) { namePart = line.slice(0, commaIndex); division = matched; }
    }
    const name = tidySchoolName(namePart);
    if (!division || name.length < SCHOOL_NAME_MIN) { invalidLines.push(line); continue; }
    rows.push({ name, division });
  }
  return { rows, invalidLines };
}
