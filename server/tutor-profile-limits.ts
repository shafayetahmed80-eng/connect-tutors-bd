import type { SiteLimitValues } from "@shared/site-limits";
import { assertWithinLimit, assertWithinLengthLimit } from "./site-limit-guard";

/** The lists and lengths a profile save has to stay inside. */
export type TutorProfileDraftLimitInput = {
  headline?: string;
  educationRecords?: readonly unknown[];
  primarySubjectIds?: readonly unknown[];
  additionalSubjectIds?: readonly unknown[];
  classLevelIds?: readonly unknown[];
  teachingLanguageIds?: readonly unknown[];
};

/**
 * Enforces the Owner's Tutor limits on a profile draft.
 *
 * The zod schema holds each limit's *ceiling* - the highest an Owner could
 * ever set - because it is built when the module loads, long before the stored
 * numbers can be read. `tutor.subjects`, `tutor.levels` and `tutor.languages`
 * had only that ceiling and nothing else, so setting "Subjects per Tutor: 5"
 * in the Admin panel changed nothing at all.
 *
 * A section popup sends only its own fields, so every check is skipped when
 * its key is absent rather than treated as an empty list.
 */
export function assertTutorProfileDraftWithinLimits(limits: SiteLimitValues, input: TutorProfileDraftLimitInput) {
  if (input.headline !== undefined) {
    assertWithinLengthLimit(limits, "tutor.headlineChars", input.headline.length, "Headline");
  }
  if (input.educationRecords !== undefined) {
    assertWithinLimit(limits, "tutor.educationRecords", input.educationRecords.length, "records");
  }
  // Primary and additional subjects are one answer to "what do you teach", so
  // the Owner's number caps the pair rather than each list on its own.
  if (input.primarySubjectIds !== undefined || input.additionalSubjectIds !== undefined) {
    assertWithinLimit(limits, "tutor.subjects", (input.primarySubjectIds?.length ?? 0) + (input.additionalSubjectIds?.length ?? 0), "subjects");
  }
  if (input.classLevelIds !== undefined) {
    assertWithinLimit(limits, "tutor.levels", input.classLevelIds.length, "class levels");
  }
  if (input.teachingLanguageIds !== undefined) {
    assertWithinLimit(limits, "tutor.languages", input.teachingLanguageIds.length, "languages");
  }
}
