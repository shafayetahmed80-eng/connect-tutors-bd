/**
 * The one headline a job is known by, shared so the Guardian panel and the
 * public Job Board cannot describe the same tuition differently.
 */
export type JobTitleInput = {
  category: string;
  classCourse: string;
  studentCount: number;
  daysPerWeek: number;
};

function safeTitlePart(value: string): string {
  return value.trim().replace(/[\r\n]+/g, " ").replace(/\s+/g, " ");
}

export function buildJobTitle({
  category,
  classCourse,
  studentCount,
  daysPerWeek,
}: JobTitleInput): string {
  const normalizedCategory = safeTitlePart(category);
  const normalizedClassCourse = safeTitlePart(classCourse);
  const studentLabel = studentCount === 1 ? "Student" : "Students";
  // Two separate facts - who is being taught, and how often - so the hyphen and
  // the slash are spaced to read as a break rather than as a compound word.
  // "O Level Student-4 Days/Week" ran them together into something that had to
  // be picked apart.
  return `Need ${normalizedCategory} Tutor for ${normalizedClassCourse} ${studentLabel} - ${daysPerWeek} Days / Week`;
}
