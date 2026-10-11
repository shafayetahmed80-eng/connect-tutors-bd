/**
 * What a family asks to have taught: one or more curricula, each with the
 * classes wanted in it, each class with its own subjects.
 *
 * A request used to carry one curriculum ("category"), one class and one list of
 * subjects. The three are now a list of needs, so a family with two children in
 * different classes - or in different curricula - asks once. The old columns on
 * the request stay, as a readable summary of the list (see
 * `summarizeLearningNeeds`), so a card, a title, a search box and a letter read
 * a request the way they always did; the exact pairs live in
 * `tutor_request_learning_needs`, one row per curriculum-and-class, which is
 * what the filters and the Job Board's options read.
 */

export type LearningNeedClass = {
  classCourse: string;
  /** The subjects wanted in this class. Each class has its own list: the choices differ from class to class. */
  subjects: string[];
};

export type LearningNeed = {
  /** The curriculum, which the product still calls the "category" (English Version, Bangla Medium, ...). */
  category: string;
  /** English Medium only: British, Cambridge or Ed-excel. */
  curriculumType?: string | null;
  classes: LearningNeedClass[];
};

/** One curriculum-and-class pair, as stored and as filtered on. */
export type LearningNeedRow = {
  category: string;
  curriculumType: string | null;
  classCourse: string;
  subjects: string[];
};

/** Two curricula, six classes: what a real household needs, without a card too long to read. The Owner can change both from Limits. */
export const DEFAULT_MAX_CURRICULA = 3;
export const DEFAULT_MAX_CLASSES = 6;

const clean = (value: string) => value.trim().replace(/\s+/g, " ");
const unique = (values: string[]) => Array.from(new Set(values));

/** A need's classes and subjects, trimmed, each class once, each subject once within its class. */
export function normalizeLearningNeeds(needs: LearningNeed[]): LearningNeed[] {
  const merged = new Map<string, LearningNeed>();
  for (const need of needs) {
    const category = clean(need.category);
    if (!category) continue;
    const entry = merged.get(category) ?? { category, curriculumType: null, classes: [] };
    const type = need.curriculumType ? clean(need.curriculumType) : "";
    if (type && !entry.curriculumType) entry.curriculumType = type;
    for (const item of need.classes) {
      const classCourse = clean(item.classCourse);
      if (!classCourse) continue;
      const existing = entry.classes.find(candidate => candidate.classCourse === classCourse);
      const subjects = unique(item.subjects.map(clean).filter(Boolean));
      if (existing) existing.subjects = unique([...existing.subjects, ...subjects]);
      else entry.classes.push({ classCourse, subjects });
    }
    merged.set(category, entry);
  }
  return Array.from(merged.values()).filter(need => need.classes.length > 0);
}

/** The pairs behind a list of needs, in the order they were chosen. */
export function learningNeedRows(needs: LearningNeed[]): LearningNeedRow[] {
  return normalizeLearningNeeds(needs).flatMap(need =>
    need.classes.map(item => ({
      category: need.category,
      curriculumType: need.curriculumType || null,
      classCourse: item.classCourse,
      subjects: item.subjects,
    })));
}

/** The pairs grouped back into needs, by curriculum, in stored order. */
export function learningNeedsFromRows(rows: LearningNeedRow[]): LearningNeed[] {
  return normalizeLearningNeeds(rows.map(row => ({
    category: row.category,
    curriculumType: row.curriculumType,
    classes: [{ classCourse: row.classCourse, subjects: row.subjects }],
  })));
}

/** A request from before there were lists: one curriculum, one class, its subjects. */
export function learningNeedsFromLegacy(input: {
  category: string;
  curriculumType?: string | null;
  classCourse: string;
  subjects: string[] | string;
}): LearningNeed[] {
  const subjects = typeof input.subjects === "string" ? parseSubjects(input.subjects) : input.subjects;
  return normalizeLearningNeeds([{
    category: input.category,
    curriculumType: input.curriculumType ?? null,
    classes: [{ classCourse: input.classCourse, subjects }],
  }]);
}

/** The stored subjects column is JSON written by us; anything else reads as no subjects. */
export function parseSubjects(value: string | null | undefined): string[] {
  if (!value) return [];
  try {
    const parsed: unknown = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").map(clean).filter(Boolean) : [];
  } catch {
    return [];
  }
}

/**
 * The single-line view of a list of needs, for the columns a request has always
 * had: curricula and classes in the order chosen, each named once, and every
 * subject once across all of them.
 */
export function summarizeLearningNeeds(needs: LearningNeed[]) {
  const normalized = normalizeLearningNeeds(needs);
  return {
    category: normalized.map(need => need.category).join(", "),
    curriculumType: normalized.find(need => need.curriculumType)?.curriculumType ?? null,
    classCourse: unique(normalized.flatMap(need => need.classes.map(item => item.classCourse))).join(", "),
    subjects: unique(normalized.flatMap(need => need.classes.flatMap(item => item.subjects))),
  };
}

export type LearningNeedsProblem = "none" | "too_many_curricula" | "too_many_classes" | "class_without_subjects" | "too_many_subjects";

/** The first rule a list of needs breaks, or "none". Limits are the ones in force, not the defaults. */
export function checkLearningNeeds(
  needs: LearningNeed[],
  limits: { maxCurricula: number; maxClasses: number; maxSubjectsPerClass: number },
): LearningNeedsProblem {
  const normalized = normalizeLearningNeeds(needs);
  if (normalized.length > limits.maxCurricula) return "too_many_curricula";
  if (normalized.reduce((total, need) => total + need.classes.length, 0) > limits.maxClasses) return "too_many_classes";
  for (const need of normalized) {
    for (const item of need.classes) {
      if (item.subjects.length === 0) return "class_without_subjects";
      if (item.subjects.length > limits.maxSubjectsPerClass) return "too_many_subjects";
    }
  }
  return "none";
}
