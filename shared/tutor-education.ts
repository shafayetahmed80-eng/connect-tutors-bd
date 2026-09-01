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
