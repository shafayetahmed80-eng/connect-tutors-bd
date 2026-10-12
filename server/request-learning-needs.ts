import { and, asc, eq, inArray, like, or, sql, type SQL } from "drizzle-orm";
import type { AnyMySqlColumn } from "drizzle-orm/mysql-core";
import { tutorRequestLearningNeeds } from "../drizzle/schema";
import { learningNeedRows, learningNeedsFromLegacy, learningNeedsFromRows, parseSubjects, type LearningNeed } from "@shared/learning-needs";

/** Whatever carries `delete`, `insert` and `select`: the database, or a transaction on it. */
type Executor = any;

/**
 * Writes what a request asks to have taught as its curriculum-and-class rows,
 * replacing any it had. The request's own category / classCourse / subjects
 * columns are written by the caller from the same list (`summarizeLearningNeeds`).
 */
export async function replaceRequestLearningNeeds(executor: Executor, requestId: number, needs: LearningNeed[]) {
  await executor.delete(tutorRequestLearningNeeds).where(eq(tutorRequestLearningNeeds.tutorRequestId, requestId));
  await insertRequestLearningNeeds(executor, requestId, needs);
}

/**
 * The same rows for a request that was only just created and so has none to replace. It skips the delete:
 * deleting nothing still locks the gap after the newest request, and two requests made or edited at the
 * same moment then wait on each other's gap and deadlock.
 */
export async function insertRequestLearningNeeds(executor: Executor, requestId: number, needs: LearningNeed[]) {
  const rows = learningNeedRows(needs);
  if (rows.length === 0) return;
  await executor.insert(tutorRequestLearningNeeds).values(rows.map((row, index) => ({
    tutorRequestId: requestId,
    category: row.category,
    curriculumType: row.curriculumType,
    classCourse: row.classCourse,
    subjects: JSON.stringify(row.subjects),
    sortOrder: index,
  })));
}

/** What each of these requests asks to have taught, by request id. A request with no rows has no entry. */
export async function readRequestLearningNeeds(executor: Executor, requestIds: number[]): Promise<Map<number, LearningNeed[]>> {
  const result = new Map<number, LearningNeed[]>();
  if (requestIds.length === 0) return result;
  const rows = await executor
    .select({
      tutorRequestId: tutorRequestLearningNeeds.tutorRequestId,
      category: tutorRequestLearningNeeds.category,
      curriculumType: tutorRequestLearningNeeds.curriculumType,
      classCourse: tutorRequestLearningNeeds.classCourse,
      subjects: tutorRequestLearningNeeds.subjects,
    })
    .from(tutorRequestLearningNeeds)
    .where(inArray(tutorRequestLearningNeeds.tutorRequestId, requestIds))
    .orderBy(asc(tutorRequestLearningNeeds.tutorRequestId), asc(tutorRequestLearningNeeds.sortOrder), asc(tutorRequestLearningNeeds.id)) as Array<{
      tutorRequestId: number; category: string; curriculumType: string | null; classCourse: string; subjects: string;
    }>;
  const byRequest = new Map<number, typeof rows>();
  for (const row of rows) byRequest.set(row.tutorRequestId, [...(byRequest.get(row.tutorRequestId) ?? []), row]);
  for (const [requestId, group] of Array.from(byRequest.entries())) {
    result.set(requestId, learningNeedsFromRows(group.map(row => ({
      category: row.category,
      curriculumType: row.curriculumType,
      classCourse: row.classCourse,
      subjects: parseSubjects(row.subjects),
    }))));
  }
  return result;
}

/**
 * "Some curriculum-and-class the request asks for matches every filter chosen" -
 * as one condition on the request's rows, so a curriculum and a class chosen
 * together must belong to the same pair, not merely both appear somewhere in a
 * request that asks for several.
 *
 * Within a kind any one chosen value may match, as an IN does; a chosen subject
 * is a LIKE on the class's own JSON list. Nothing chosen is no condition.
 */
export function learningNeedMatchCondition(
  requestIdColumn: AnyMySqlColumn,
  filters: { categories?: string[]; classCourses?: string[]; subjects?: string[] },
): SQL | undefined {
  const parts: SQL[] = [];
  if (filters.categories?.length) parts.push(inArray(tutorRequestLearningNeeds.category, filters.categories));
  if (filters.classCourses?.length) parts.push(inArray(tutorRequestLearningNeeds.classCourse, filters.classCourses));
  if (filters.subjects?.length) {
    const anySubject = or(...filters.subjects.map(subject => like(tutorRequestLearningNeeds.subjects, `%"${subject}"%`)));
    if (anySubject) parts.push(anySubject);
  }
  if (parts.length === 0) return undefined;
  return sql`exists (select 1 from ${tutorRequestLearningNeeds} where ${and(eq(tutorRequestLearningNeeds.tutorRequestId, requestIdColumn), ...parts)})`;
}

/**
 * Each row with what its request asks to have taught. A request with no rows of
 * its own - one written before they existed and not yet backfilled, or by a path
 * that forgot - reads as its one curriculum and class, so a list never shows a
 * tuition with nothing to teach.
 */
export async function attachLearningNeeds<Row extends { id: number; category: string; classCourse: string; subjects: string; curriculumType?: string | null }>(
  executor: Executor,
  rows: Row[],
): Promise<Array<Row & { learningNeeds: LearningNeed[] }>> {
  const byRequest = await readRequestLearningNeeds(executor, rows.map(row => row.id));
  return rows.map(row => ({ ...row, learningNeeds: byRequest.get(row.id) ?? learningNeedsFromLegacy(row) }));
}
