import { TRPCError } from "@trpc/server";
import type { SiteLimitValues } from "@shared/site-limits";
import { calculateAgeInYears } from "@shared/tutor-personal-details";
import { assertMinimumLengthLimit, assertWithinLimit, assertWithinLengthLimit } from "./site-limit-guard";
import { validateIntroductionQuality } from "@shared/tutor-introduction";

/** The lists and lengths a profile save has to stay inside. */
export type TutorProfileDraftLimitInput = {
  dateOfBirth?: string;
  headline?: string;
  aboutMe?: string;
  teachingApproach?: string;
  whyChooseMe?: string;
  educationRecords?: readonly unknown[];
  primarySubjectIds?: readonly unknown[];
  additionalSubjectIds?: readonly unknown[];
  classLevelIds?: readonly unknown[];
};

/**
 * Enforces the Owner's Tutor limits on a profile draft.
 *
 * The zod schema holds each limit's *ceiling* - the highest an Owner could
 * ever set - because it is built when the module loads, long before the stored
 * numbers can be read. `tutor.subjects` and `tutor.levels` had only that
 * ceiling and nothing else, so setting "Subjects per Tutor: 5" in the Admin
 * panel changed nothing at all.
 *
 * A section popup sends only its own fields, so every check is skipped when
 * its key is absent rather than treated as an empty list.
 */
export function assertTutorProfileDraftWithinLimits(limits: SiteLimitValues, input: TutorProfileDraftLimitInput) {
  if (input.dateOfBirth !== undefined && input.dateOfBirth.trim().length > 0) {
    const parsed = new Date(`${input.dateOfBirth}T00:00:00.000Z`);
    if (parsed.getTime() > Date.now()) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: "Date of birth cannot be in the future.",
      });
    }
    const age = calculateAgeInYears(input.dateOfBirth);
    if (age !== null) {
      if (age < limits["tutor.minAgeYears"]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `You must be at least ${limits["tutor.minAgeYears"]} years old to apply as a tutor.`,
        });
      }
      if (age > limits["tutor.maxAgeYears"]) {
        throw new TRPCError({
          code: "BAD_REQUEST",
          message: `Tutor age must be ${limits["tutor.maxAgeYears"]} years or under.`,
        });
      }
    }
  }
  if (input.headline !== undefined) {
    assertWithinLengthLimit(limits, "tutor.headlineChars", input.headline.length, "Headline");
  }
  if (input.aboutMe !== undefined && input.aboutMe.trim().length > 0) {
    assertMinimumLengthLimit(limits, "tutor.aboutMeMinChars", input.aboutMe.trim().length, "About Me");
    assertWithinLengthLimit(limits, "tutor.aboutMeChars", input.aboutMe.trim().length, "About Me");
    const err = validateIntroductionQuality(input.aboutMe, "aboutMe");
    if (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err,
      });
    }
  }
  if (input.teachingApproach !== undefined && input.teachingApproach.trim().length > 0) {
    assertMinimumLengthLimit(limits, "tutor.approachMinChars", input.teachingApproach.trim().length, "Teaching Approach");
    assertWithinLengthLimit(limits, "tutor.approachChars", input.teachingApproach.trim().length, "Teaching Approach");
    const err = validateIntroductionQuality(input.teachingApproach, "teachingApproach");
    if (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err,
      });
    }
  }
  if (input.whyChooseMe !== undefined && input.whyChooseMe.trim().length > 0) {
    assertMinimumLengthLimit(limits, "tutor.whyChooseMeMinChars", input.whyChooseMe.trim().length, "Why Choose Me");
    assertWithinLengthLimit(limits, "tutor.whyChooseMeChars", input.whyChooseMe.trim().length, "Why Choose Me");
    const err = validateIntroductionQuality(input.whyChooseMe, "whyChooseMe");
    if (err) {
      throw new TRPCError({
        code: "BAD_REQUEST",
        message: err,
      });
    }
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
}
