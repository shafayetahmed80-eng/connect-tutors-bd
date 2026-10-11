import { describe, expect, it } from "vitest";
import {
  checkLearningNeeds,
  learningNeedRows,
  learningNeedsFromLegacy,
  learningNeedsFromRows,
  normalizeLearningNeeds,
  parseSubjects,
  summarizeLearningNeeds,
  type LearningNeed,
} from "./learning-needs";

const twoCurricula: LearningNeed[] = [
  { category: "English Version", classes: [{ classCourse: "Class 5", subjects: ["Math", "English"] }, { classCourse: "Class 6", subjects: ["Math"] }] },
  { category: "Bangla Medium", classes: [{ classCourse: "Class 8", subjects: ["Physics", "Math"] }] },
];

describe("a request that was one curriculum, one class", () => {
  it("becomes a list of one need, with its subjects", () => {
    expect(learningNeedsFromLegacy({ category: "English Version", classCourse: "Class 8", subjects: ["Math", "Physics"] })).toEqual([
      { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 8", subjects: ["Math", "Physics"] }] },
    ]);
  });

  it("reads the stored subjects column, and keeps the English Medium type", () => {
    const needs = learningNeedsFromLegacy({ category: "English Medium", curriculumType: "Cambridge", classCourse: "Year 9", subjects: '["Biology"]' });

    expect(needs[0]).toMatchObject({ category: "English Medium", curriculumType: "Cambridge", classes: [{ classCourse: "Year 9", subjects: ["Biology"] }] });
  });

  it("round-trips through its summary: the summary of one need is the request as it was", () => {
    const summary = summarizeLearningNeeds(learningNeedsFromLegacy({ category: "Bangla Medium", classCourse: "Class 4", subjects: ["Bangla"] }));

    expect(summary).toEqual({ category: "Bangla Medium", curriculumType: null, classCourse: "Class 4", subjects: ["Bangla"] });
  });
});

describe("summarizeLearningNeeds", () => {
  it("names every curriculum and class once, in the order chosen, and every subject once", () => {
    expect(summarizeLearningNeeds(twoCurricula)).toEqual({
      category: "English Version, Bangla Medium",
      curriculumType: null,
      classCourse: "Class 5, Class 6, Class 8",
      subjects: ["Math", "English", "Physics"],
    });
  });

  it("keeps the English Medium curriculum type", () => {
    const summary = summarizeLearningNeeds([
      { category: "Bangla Medium", classes: [{ classCourse: "Class 3", subjects: ["Bangla"] }] },
      { category: "English Medium", curriculumType: "British", classes: [{ classCourse: "Year 2", subjects: ["English"] }] },
    ]);

    expect(summary.curriculumType).toBe("British");
  });

  it("names a class that two curricula share once", () => {
    const summary = summarizeLearningNeeds([
      { category: "English Version", classes: [{ classCourse: "Class 8", subjects: ["Math"] }] },
      { category: "Bangla Medium", classes: [{ classCourse: "Class 8", subjects: ["Math"] }] },
    ]);

    expect(summary.classCourse).toBe("Class 8");
  });
});

describe("learningNeedRows and learningNeedsFromRows", () => {
  it("lists one row per curriculum-and-class, each with its own subjects", () => {
    expect(learningNeedRows(twoCurricula)).toEqual([
      { category: "English Version", curriculumType: null, classCourse: "Class 5", subjects: ["Math", "English"] },
      { category: "English Version", curriculumType: null, classCourse: "Class 6", subjects: ["Math"] },
      { category: "Bangla Medium", curriculumType: null, classCourse: "Class 8", subjects: ["Physics", "Math"] },
    ]);
  });

  it("groups the rows back into the needs they came from", () => {
    expect(learningNeedsFromRows(learningNeedRows(twoCurricula))).toEqual(normalizeLearningNeeds(twoCurricula));
  });
});

describe("normalizeLearningNeeds", () => {
  it("trims, names a class once, merges the same curriculum chosen twice and drops what is empty", () => {
    const normalized = normalizeLearningNeeds([
      { category: " English Version ", classes: [{ classCourse: "Class 5 ", subjects: [" Math ", "Math", ""] }, { classCourse: "Class 5", subjects: ["English"] }] },
      { category: "English Version", classes: [{ classCourse: "Class 6", subjects: ["Math"] }] },
      { category: "  ", classes: [{ classCourse: "Class 9", subjects: ["Math"] }] },
      { category: "Madrasa Medium", classes: [] },
    ]);

    expect(normalized).toEqual([
      { category: "English Version", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Math", "English"] }, { classCourse: "Class 6", subjects: ["Math"] }] },
    ]);
  });
});

describe("parseSubjects", () => {
  it("reads the JSON we wrote and nothing else", () => {
    expect(parseSubjects('["Math"," English ",3,""]')).toEqual(["Math", "English"]);
    expect(parseSubjects('{"a":1}')).toEqual([]);
    expect(parseSubjects("nope")).toEqual([]);
    expect(parseSubjects(null)).toEqual([]);
  });
});

describe("checkLearningNeeds", () => {
  const limits = { maxCurricula: 3, maxClasses: 6, maxSubjectsPerClass: 3 };

  it("passes a list inside every limit", () => {
    expect(checkLearningNeeds(twoCurricula, limits)).toBe("none");
  });

  it("refuses a fourth curriculum", () => {
    const four = ["A", "B", "C", "D"].map(category => ({ category, classes: [{ classCourse: "Class 1", subjects: ["Math"] }] }));

    expect(checkLearningNeeds(four, limits)).toBe("too_many_curricula");
  });

  it("counts the classes across every curriculum, not within one", () => {
    const seven: LearningNeed[] = [
      { category: "A", classes: ["1", "2", "3", "4"].map(n => ({ classCourse: `Class ${n}`, subjects: ["Math"] })) },
      { category: "B", classes: ["5", "6", "7"].map(n => ({ classCourse: `Class ${n}`, subjects: ["Math"] })) },
    ];

    expect(checkLearningNeeds(seven, limits)).toBe("too_many_classes");
  });

  it("asks every class for at least one subject, and no more than the limit", () => {
    expect(checkLearningNeeds([{ category: "A", classes: [{ classCourse: "Class 1", subjects: [] }] }], limits)).toBe("class_without_subjects");
    expect(checkLearningNeeds([{ category: "A", classes: [{ classCourse: "Class 1", subjects: ["a", "b", "c", "d"] }] }], limits)).toBe("too_many_subjects");
  });
});
