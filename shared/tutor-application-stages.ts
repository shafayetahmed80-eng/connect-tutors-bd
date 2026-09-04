/**
 * The five stages a Tutor's own job applications pass through.
 *
 * A Tutor reads their applications from their side of the process: they applied,
 * they were shortlisted, they were appointed, the appointment was confirmed, or
 * it ended. The database records the same journey in two places - the interest
 * row's status and the request's appointment timestamp - and this maps the pair
 * onto the one word a Tutor would use.
 */
export const tutorApplicationStages = [
  { key: "applied", label: "Applied Jobs" },
  { key: "shortlisted", label: "Shortlisted Jobs" },
  { key: "appointed", label: "Appointed Jobs" },
  { key: "confirmed", label: "Confirmed Jobs" },
  { key: "cancelled", label: "Cancelled Jobs" },
] as const;

export type TutorApplicationStage = (typeof tutorApplicationStages)[number]["key"];

export type TutorApplicationRecord = {
  status: "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
  /** Set only once an Admin finalises the Guardian and Tutor appointment. */
  appointmentConfirmedAt?: Date | string | null;
};

export function getTutorApplicationStage(record: TutorApplicationRecord): TutorApplicationStage {
  if (record.status === "declined" || record.status === "withdrawn") return "cancelled";
  // Appointed and Confirmed are the same interest status either side of the
  // Admin's confirmation, which is the only thing that tells them apart.
  if (record.status === "matched") return record.appointmentConfirmedAt ? "confirmed" : "appointed";
  if (record.status === "shortlisted") return "shortlisted";
  return "applied";
}

export function countTutorApplicationStages(records: readonly TutorApplicationRecord[]) {
  const counts: Record<TutorApplicationStage, number> = { applied: 0, shortlisted: 0, appointed: 0, confirmed: 0, cancelled: 0 };
  for (const record of records) counts[getTutorApplicationStage(record)] += 1;
  return counts;
}

export function filterTutorApplicationsByStage<T extends TutorApplicationRecord>(records: readonly T[], stage: TutorApplicationStage) {
  return records.filter(record => getTutorApplicationStage(record) === stage);
}
