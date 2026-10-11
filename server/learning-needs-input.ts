import { z } from "zod";
import { siteLimitCeiling, type SiteLimitValues } from "@shared/site-limits";
import { normalizeLearningNeeds, summarizeLearningNeeds, type LearningNeed } from "@shared/learning-needs";
import { assertWithinLimit } from "./site-limit-guard";

/**
 * What a request asks to have taught, as the API takes it: curricula, the
 * classes wanted in each, and each class's own subjects.
 *
 * The ceilings are the registry's, because a schema is built once, long before
 * the Owner's numbers can be read; `assertLearningNeedsWithinLimits` enforces
 * the numbers of the day inside the mutation.
 */
export const learningNeedsInputSchema = z.array(z.object({
  category: z.string().trim().min(1).max(120),
  curriculumType: z.string().trim().max(32).optional(),
  classes: z.array(z.object({
    classCourse: z.string().trim().min(1).max(120),
    subjects: z.array(z.string().trim().min(1)).min(1).max(siteLimitCeiling("request.subjects")),
  }).strict()).min(1).max(siteLimitCeiling("request.levels")),
}).strict()).min(1).max(siteLimitCeiling("request.curricula"));

/**
 * A request sent the way it was before there were lists - one category, one
 * class, a list of subjects - from a page opened before the update, becomes a
 * list of one. The schemas are strict, so the old keys have to leave.
 */
export function withLegacyLearningNeeds(value: unknown): unknown {
  if (!value || typeof value !== "object" || Array.isArray(value)) return value;
  const input = value as Record<string, unknown>;
  if (input.learningNeeds !== undefined) return value;
  if (typeof input.category !== "string" || typeof input.classCourse !== "string" || !Array.isArray(input.subjects)) return value;
  const { category, curriculumType, classCourse, subjects, ...rest } = input;
  return {
    ...rest,
    learningNeeds: [{
      category,
      ...(typeof curriculumType === "string" && curriculumType !== "" ? { curriculumType } : {}),
      classes: [{ classCourse, subjects }],
    }],
  };
}

const englishMediumTypes = ["British", "Cambridge", "Ed-excel"] as const;

/** The rules between the parts: English Medium names its type, no other curriculum does, each curriculum once. */
export function refineLearningNeeds(needs: Array<{ category: string; curriculumType?: string; classes: Array<{ classCourse: string }> }>, ctx: z.RefinementCtx) {
  const seen = new Set<string>();
  needs.forEach((need, index) => {
    if (seen.has(need.category)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["learningNeeds", index, "category"], message: "Choose each curriculum once." });
    seen.add(need.category);
    if (need.category === "English Medium" && !englishMediumTypes.includes(need.curriculumType as typeof englishMediumTypes[number])) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["learningNeeds", index, "curriculumType"], message: "Choose a Curriculum Type for English Medium to continue." });
    }
    if (need.category !== "English Medium" && need.curriculumType !== undefined && need.curriculumType !== "") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["learningNeeds", index, "curriculumType"], message: "Curriculum Type is only available for English Medium requests." });
    }
    const classes = new Set<string>();
    need.classes.forEach((item, classIndex) => {
      if (classes.has(item.classCourse)) ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["learningNeeds", index, "classes", classIndex], message: "Choose each class once." });
      classes.add(item.classCourse);
    });
  });
  const classCount = needs.reduce((total, need) => total + need.classes.length, 0);
  if (classCount > siteLimitCeiling("request.levels")) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["learningNeeds"], message: `Choose at most ${siteLimitCeiling("request.levels")} classes.` });
  }
}

/** The Owner's numbers of the day: how many curricula, how many classes in all, how many subjects in each class. */
export function assertLearningNeedsWithinLimits(limits: SiteLimitValues, needs: LearningNeed[]) {
  const normalized = normalizeLearningNeeds(needs);
  assertWithinLimit(limits, "request.curricula", normalized.length, "curricula");
  assertWithinLimit(limits, "request.levels", normalized.reduce((total, need) => total + need.classes.length, 0), "classes");
  for (const need of normalized) {
    for (const item of need.classes) assertWithinLimit(limits, "request.subjects", item.subjects.length, "subjects");
  }
}

/** The list to store and the one-line summary the request's own columns hold, from one list sent in. */
export function learningNeedsForWrite(needs: LearningNeed[]) {
  const normalized = normalizeLearningNeeds(needs);
  const summary = summarizeLearningNeeds(normalized);
  return {
    learningNeeds: normalized,
    category: summary.category,
    curriculumType: summary.curriculumType,
    classCourse: summary.classCourse,
    subjects: JSON.stringify(summary.subjects),
    subjectNames: summary.subjects,
  };
}
