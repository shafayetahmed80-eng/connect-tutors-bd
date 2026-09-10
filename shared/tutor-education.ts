/**
 * Controlled vocabularies for the Tutor Profile "Education" section.
 *
 * These lists are editorial: the labels are expected to change as the catalog
 * is curated. They stay as plain `varchar` in the database and are enforced by
 * Zod on the server and by the `<select>` options on the client, so widening a
 * list never needs a schema migration. Both sides import from here, so the
 * dropdown and the validator can never drift apart.
 */

/** Section-level Education Level — the Tutor's current university-level study. */
export const academicEducationLevels = ["Honours", "Masters"] as const;
export type AcademicEducationLevel = (typeof academicEducationLevels)[number];

/** Per-record Education Level inside the qualification history. */
export const qualificationEducationLevels = ["SSC", "HSC", "Honours", "Masters"] as const;
export type QualificationEducationLevel = (typeof qualificationEducationLevels)[number];

/** Per-record curriculum inside the qualification history. */
export const qualificationCurricula = ["Bangla Version", "English Version", "English Medium"] as const;
export type QualificationCurriculum = (typeof qualificationCurricula)[number];

/**
 * A school record is a public-board one - SSC or HSC - and it is a different
 * shape of fact from a university one.
 *
 * A board exam is passed in a single year and identified by a roll and a
 * registration number, so those are what the record asks for. A degree is read
 * over a span of years and may still be in progress, which is what the start
 * year, end year and "currently studying" between them describe. One record
 * type cannot ask both sets without asking half of every Tutor for something
 * that does not exist.
 */
export const schoolQualificationLevels = ["SSC", "HSC"] as const;

export function isSchoolQualification(level: string | null | undefined): boolean {
  return typeof level === "string" && (schoolQualificationLevels as readonly string[]).includes(level);
}

/** The three groups a board exam is sat under. */
export const schoolSubjectGroups = ["Science", "Arts", "Commerce"] as const;
export type SchoolSubjectGroup = (typeof schoolSubjectGroups)[number];

/**
 * The two school records every Tutor fills in, each in its own section.
 *
 * Headed "Secondary" and "Higher Secondary" rather than SSC and HSC, because a
 * Tutor who read English Medium sat O and A Levels and has neither. What they
 * sat is carried by the record's own Curriculum and Degree / Exam Title; the
 * stored level stays SSC and HSC so nothing downstream has to learn a new
 * vocabulary.
 */
export const fixedSchoolRecords = [
  { level: "SSC", heading: "Secondary" },
  { level: "HSC", heading: "Higher Secondary" },
] as const;

/**
 * What the repeatable Qualification history offers.
 *
 * Secondary and Higher Secondary have sections of their own, so the history is
 * for degrees alone - offering SSC there would invite a second, contradictory
 * copy of a record the Tutor has already filled in above.
 */
export const historyQualificationLevels = ["Honours", "Masters"] as const;

/**
 * Narrows a stored value to one of `options`, or to `""` when it predates the
 * list (or was never set). Lets the form hydrate legacy free-text answers
 * without crashing: the Tutor simply re-picks from the dropdown.
 */
export function asEducationOption<T extends string>(options: readonly T[], value: unknown): T | "" {
  return typeof value === "string" && (options as readonly string[]).includes(value) ? (value as T) : "";
}

/** Earliest study year a Tutor can claim; matches the legacy passing-year floor. */
export const MIN_STUDY_YEAR = 1950;

/** Allows in-progress degrees to name an expected end year a few intakes ahead. */
export function maxStudyYear(now: Date = new Date()) {
  return now.getUTCFullYear() + 10;
}

/** Shared four-digit study-year guard used by both the form and the schema. */
export function isStudyYear(value: number, now?: Date) {
  return Number.isInteger(value) && value >= MIN_STUDY_YEAR && value <= maxStudyYear(now);
}

/**
 * Whether one qualification-history field belongs to a record of this level.
 *
 * SSC and HSC are board exams - one passing year, a roll and a registration
 * number. Honours and Masters are read over a span and may be in progress.
 * Both the form and the submission check read this, so a field can never be
 * demanded on a record that does not draw it.
 */
export function educationRecordFieldApplies(fieldId: string, qualificationLevel: string | null | undefined): boolean {
  const school = isSchoolQualification(qualificationLevel);
  if (SCHOOL_ONLY_RECORD_FIELDS.has(fieldId)) return school;
  if (UNIVERSITY_ONLY_RECORD_FIELDS.has(fieldId)) return !school;
  return true;
}

const SCHOOL_ONLY_RECORD_FIELDS = new Set([
  "educationRecords.passingYear",
  "educationRecords.rollNumber",
  "educationRecords.registrationNumber",
]);

const UNIVERSITY_ONLY_RECORD_FIELDS = new Set([
  "educationRecords.studyStartYear",
  "educationRecords.studyEndYear",
  "educationRecords.currentlyStudying",
  "educationRecords.instituteIdCardNumber",
]);
