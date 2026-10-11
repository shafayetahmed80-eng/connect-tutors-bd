import { TRPCError } from "@trpc/server";
import { describe, expect, it } from "vitest";
import { defaultSiteLimits, siteLimitCeiling } from "@shared/site-limits";
import {
  assertLearningNeedsWithinLimits,
  learningNeedsForWrite,
  learningNeedsInputSchema,
  refineLearningNeeds,
  withLegacyLearningNeeds,
} from "./learning-needs-input";

const schema = learningNeedsInputSchema.superRefine((needs, ctx) => refineLearningNeeds(needs, ctx));
const one = (category: string, classes: Array<[string, string[]]>, curriculumType?: string) => ({
  category,
  ...(curriculumType !== undefined ? { curriculumType } : {}),
  classes: classes.map(([classCourse, subjects]) => ({ classCourse, subjects })),
});

describe("learningNeedsInputSchema", () => {
  it("takes several curricula, each with several classes and each class with its own subjects", () => {
    const parsed = schema.safeParse([
      one("Bangla Medium", [["Class 5", ["Bangla"]], ["Class 6", ["Math", "Science"]]]),
      one("English Medium", [["Class 9–10", ["English"]]], "Cambridge"),
    ]);

    expect(parsed.success).toBe(true);
  });

  it("asks for at least one curriculum, one class in it, and one subject in the class", () => {
    expect(schema.safeParse([]).success).toBe(false);
    expect(schema.safeParse([one("Bangla Medium", [])]).success).toBe(false);
    expect(schema.safeParse([one("Bangla Medium", [["Class 5", []]])]).success).toBe(false);
  });

  it("trims what it is given and refuses blank names", () => {
    const parsed = schema.safeParse([one("  Bangla Medium ", [[" Class 5", [" Bangla "]]])]);
    expect(parsed.success && parsed.data).toEqual([one("Bangla Medium", [["Class 5", ["Bangla"]]])]);

    expect(schema.safeParse([one("   ", [["Class 5", ["Bangla"]]])]).success).toBe(false);
    expect(schema.safeParse([one("Bangla Medium", [["  ", ["Bangla"]]])]).success).toBe(false);
  });

  it("refuses a key it does not know, so a mis-spelt field cannot slip through unread", () => {
    expect(schema.safeParse([{ ...one("Bangla Medium", [["Class 5", ["Bangla"]]]), extra: 1 }]).success).toBe(false);
  });
});

describe("refineLearningNeeds", () => {
  const issues = (needs: unknown) => {
    const result = schema.safeParse(needs);
    return result.success ? [] : result.error.issues.map(issue => issue.message);
  };

  it("makes English Medium name one of its three types, and keeps the type off every other curriculum", () => {
    expect(issues([one("English Medium", [["Class 5", ["English"]]])])).toContain("Choose a Curriculum Type for English Medium to continue.");
    expect(issues([one("English Medium", [["Class 5", ["English"]]], "International Baccalaureate")])).toContain("Choose a Curriculum Type for English Medium to continue.");
    expect(issues([one("English Medium", [["Class 5", ["English"]]], "Ed-excel")])).toEqual([]);
    expect(issues([one("Bangla Medium", [["Class 5", ["Bangla"]]], "Cambridge")])).toContain("Curriculum Type is only available for English Medium requests.");
    expect(issues([one("Bangla Medium", [["Class 5", ["Bangla"]]], "")])).toEqual([]);
  });

  it("holds each English Medium need to its own type when there is more than one curriculum", () => {
    const messages = issues([
      one("English Medium", [["Class 5", ["English"]]], "Cambridge"),
      one("Bangla Medium", [["Class 5", ["Bangla"]]], "British"),
    ]);

    expect(messages).toEqual(["Curriculum Type is only available for English Medium requests."]);
  });

  it("refuses a curriculum chosen twice and a class chosen twice in one curriculum", () => {
    expect(issues([one("Bangla Medium", [["Class 5", ["A"]]]), one("Bangla Medium", [["Class 6", ["B"]]])])).toContain("Choose each curriculum once.");
    expect(issues([one("Bangla Medium", [["Class 5", ["A"]], ["Class 5", ["B"]]])])).toContain("Choose each class once.");
  });

  it("lets the same class stand under two different curricula", () => {
    expect(issues([one("Bangla Medium", [["Class 5", ["A"]]]), one("English Version", [["Class 5", ["B"]]])])).toEqual([]);
  });

  it("counts classes across every curriculum against the registry's ceiling", () => {
    const ceiling = siteLimitCeiling("request.levels");
    const classes = (count: number, from = 0) => Array.from({ length: count }, (_, index) => [`Class ${from + index}`, ["A"]] as [string, string[]]);
    const tooMany = [one("Bangla Medium", classes(12)), one("English Version", classes(12, 12))];

    // 24 classes in all is over the ceiling even though no one curriculum is.
    expect(ceiling).toBeLessThan(24);
    expect(issues(tooMany)).toContain(`Choose at most ${ceiling} classes.`);
  });
});

describe("withLegacyLearningNeeds", () => {
  const legacy = { tuitionType: "online", category: "Bangla Medium", classCourse: "Class 5", subjects: ["Bangla", "Math"], budgetAmount: 6000 };

  it("turns the single category, class and subjects of an older page into a list of one", () => {
    expect(withLegacyLearningNeeds(legacy)).toEqual({
      tuitionType: "online",
      budgetAmount: 6000,
      learningNeeds: [{ category: "Bangla Medium", classes: [{ classCourse: "Class 5", subjects: ["Bangla", "Math"] }] }],
    });
  });

  it("carries the English Medium type across, and drops an empty one", () => {
    expect(withLegacyLearningNeeds({ ...legacy, category: "English Medium", curriculumType: "Cambridge" })).toMatchObject({
      learningNeeds: [{ category: "English Medium", curriculumType: "Cambridge" }],
    });
    const blank = withLegacyLearningNeeds({ ...legacy, curriculumType: "" }) as { learningNeeds: Array<Record<string, unknown>> };
    expect("curriculumType" in blank.learningNeeds[0]).toBe(false);
  });

  it("leaves a request that already has a list, or is not an object, exactly as it is", () => {
    const current = { learningNeeds: [one("Bangla Medium", [["Class 5", ["A"]]])] };
    expect(withLegacyLearningNeeds(current)).toBe(current);
    expect(withLegacyLearningNeeds(null)).toBeNull();
    expect(withLegacyLearningNeeds("text")).toBe("text");
    const half = { category: "Bangla Medium" };
    expect(withLegacyLearningNeeds(half)).toBe(half);
  });
});

describe("assertLearningNeedsWithinLimits", () => {
  const limits = { ...defaultSiteLimits(), "request.curricula": 2, "request.levels": 3, "request.subjects": 2 };
  const message = (run: () => void) => {
    try { run(); } catch (error) { return error instanceof TRPCError ? error.message : String(error); }
    return null;
  };

  it("lets a list the Owner's numbers allow through", () => {
    expect(message(() => assertLearningNeedsWithinLimits(limits, [
      one("Bangla Medium", [["Class 5", ["A", "B"]], ["Class 6", ["A"]]]),
      one("English Version", [["Class 5", ["A"]]]),
    ]))).toBeNull();
  });

  it("names the number that was passed - curricula, classes in all, or subjects in one class", () => {
    expect(message(() => assertLearningNeedsWithinLimits(limits, [
      one("A", [["1", ["x"]]]), one("B", [["1", ["x"]]]), one("C", [["1", ["x"]]]),
    ]))).toMatch(/at most 2 .*You chose 3/);
    expect(message(() => assertLearningNeedsWithinLimits(limits, [
      one("A", [["1", ["x"]], ["2", ["x"]]]), one("B", [["1", ["x"]], ["2", ["x"]]]),
    ]))).toMatch(/at most 3 .*You chose 4/);
    expect(message(() => assertLearningNeedsWithinLimits(limits, [one("A", [["1", ["x", "y", "z"]]])]))).toMatch(/at most 2 .*You chose 3/);
  });

  it("counts a subject once however often a class lists it", () => {
    expect(message(() => assertLearningNeedsWithinLimits(limits, [one("A", [["1", ["x", "x", "y"]]])]))).toBeNull();
  });
});

describe("learningNeedsForWrite", () => {
  it("gives the list to store and the one-line summary the request's own columns hold", () => {
    const written = learningNeedsForWrite([
      one("Bangla Medium", [["Class 5", ["Bangla", "Math"]], ["Class 6", ["Math", "Science"]]]),
      one("English Medium", [["Class 5", ["English"]]], "Cambridge"),
    ]);

    expect(written.category).toBe("Bangla Medium, English Medium");
    expect(written.classCourse).toBe("Class 5, Class 6");
    expect(written.curriculumType).toBe("Cambridge");
    expect(written.subjectNames).toEqual(["Bangla", "Math", "Science", "English"]);
    expect(JSON.parse(written.subjects)).toEqual(written.subjectNames);
    expect(written.learningNeeds).toHaveLength(2);
  });

  it("summarises a single need as the plain values the older columns always held", () => {
    const written = learningNeedsForWrite([one("Bangla Medium", [["Class 5", ["Bangla"]]])]);

    expect(written).toMatchObject({ category: "Bangla Medium", classCourse: "Class 5", curriculumType: null, subjectNames: ["Bangla"] });
  });
});
