import { describe, expect, it } from "vitest";
import { TRPCError } from "@trpc/server";
import { defaultSiteLimits } from "@shared/site-limits";
import { assertTutorProfileDraftWithinLimits } from "./tutor-profile-limits";

/**
 * The guard `saveProfileDraft` runs before it writes - the real one, not a copy.
 *
 * `tutor.subjects` and `tutor.levels` used to appear only as
 * `siteLimitCeiling(...)` inside a zod schema: the highest an Owner could ever
 * set, never the number they had chosen. Setting "Subjects per Tutor: 5"
 * changed nothing at all.
 */
const ids = (count: number) => Array.from({ length: count }, (_, index) => index + 1);

describe("the Owner's Tutor limits reach a profile save", () => {
  const limits = { ...defaultSiteLimits(), "tutor.subjects": 3, "tutor.levels": 2 };

  it("counts primary and additional subjects against one budget", () => {
    // They are one answer to "what do you teach", so two lists of two are four.
    expect(() => assertTutorProfileDraftWithinLimits(limits, { primarySubjectIds: ids(2), additionalSubjectIds: ids(2) }))
      .toThrow(TRPCError);
    expect(() => assertTutorProfileDraftWithinLimits(limits, { primarySubjectIds: ids(2), additionalSubjectIds: ids(1) }))
      .not.toThrow();
  });

  it("says the Owner's number back, not the schema ceiling", () => {
    try {
      assertTutorProfileDraftWithinLimits(limits, { classLevelIds: ids(5) });
      throw new Error("expected a refusal");
    } catch (error) {
      expect((error as TRPCError).message).toContain("at most 2");
      expect((error as TRPCError).message).toContain("You chose 5");
    }
  });

  it("leaves a section that carries none of these fields alone", () => {
    // A save from the Identity popup sends no subject or level list.
    expect(() => assertTutorProfileDraftWithinLimits(limits, { headline: "Maths Tutor" })).not.toThrow();
  });

  it("passes everything through under the shipped defaults", () => {
    const shipped = defaultSiteLimits();
    expect(() => assertTutorProfileDraftWithinLimits(shipped, {
      primarySubjectIds: ids(shipped["tutor.subjects"]),
      classLevelIds: ids(shipped["tutor.levels"]),
    })).not.toThrow();
  });

  it("enforces dynamic minimum character limits on descriptive fields when provided", () => {
    const customLimits = { ...defaultSiteLimits(), "tutor.aboutMeMinChars": 30 };
    // Empty text is allowed (optional field)
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { aboutMe: "" })).not.toThrow();
    // Too short text throws
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { aboutMe: "Too short" })).toThrow(TRPCError);
    try {
      assertTutorProfileDraftWithinLimits(customLimits, { aboutMe: "Too short" });
    } catch (error) {
      expect((error as TRPCError).message).toContain("About Me must be at least 30 characters");
    }
    // Satisfying text passes
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, {
      aboutMe: "I am a dedicated teacher with 5+ years of physics tutoring experience.",
    })).not.toThrow();
  });

  it("enforces dynamic maximum character limits on descriptive fields", () => {
    const customLimits = { ...defaultSiteLimits(), "tutor.approachChars": 500 };
    const longText = "a".repeat(501);
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { teachingApproach: longText })).toThrow(TRPCError);
    try {
      assertTutorProfileDraftWithinLimits(customLimits, { teachingApproach: longText });
    } catch (error) {
      expect((error as TRPCError).message).toContain("Teaching Approach must be 500 characters or fewer");
    }
  });

  it("enforces dynamic minimum and maximum age limits for dateOfBirth", () => {
    const customLimits = { ...defaultSiteLimits(), "tutor.minAgeYears": 18, "tutor.maxAgeYears": 75 };
    const now = new Date();
    const currentYear = now.getUTCFullYear();

    // Empty date is allowed on drafts
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: "" })).not.toThrow();

    // Future date throws
    const futureDate = `${currentYear + 2}-01-01`;
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: futureDate })).toThrow(TRPCError);

    // Under minimum age (e.g. 15 years old) throws
    const underageDate = `${currentYear - 15}-01-01`;
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: underageDate })).toThrow(TRPCError);
    try {
      assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: underageDate });
    } catch (error) {
      expect((error as TRPCError).message).toContain("You must be at least 18 years old to apply as a tutor");
    }

    // Over maximum age (e.g. 85 years old) throws
    const overageDate = `${currentYear - 85}-01-01`;
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: overageDate })).toThrow(TRPCError);
    try {
      assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: overageDate });
    } catch (error) {
      expect((error as TRPCError).message).toContain("Tutor age must be 75 years or under");
    }

    // Valid age (e.g. 23 years old) passes
    const validDate = `${currentYear - 23}-05-15`;
    expect(() => assertTutorProfileDraftWithinLimits(customLimits, { dateOfBirth: validDate })).not.toThrow();
  });

  it("rejects repetitive or placeholder text in descriptive fields", () => {
    const limits = defaultSiteLimits();
    expect(() => assertTutorProfileDraftWithinLimits(limits, {
      aboutMe: "tutor tutor tutor tutor tutor tutor tutor tutor tutor tutor",
    })).toThrow(TRPCError);

    expect(() => assertTutorProfileDraftWithinLimits(limits, {
      teachingApproach: "good teacher good teacher good teacher good teacher good teacher",
    })).toThrow(TRPCError);

    expect(() => assertTutorProfileDraftWithinLimits(limits, {
      whyChooseMe: "test test test test test test test test test test",
    })).toThrow(TRPCError);
  });
});
