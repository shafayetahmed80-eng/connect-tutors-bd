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
});
