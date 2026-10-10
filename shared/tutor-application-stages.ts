/**
 * The six stages a Tutor's own job applications pass through.
 *
 * A Tutor reads their applications from their side of the process: they applied,
 * they were shortlisted, they were appointed, the appointment was confirmed, the
 * fee was paid in full (Closed), or it ended. The database records the same
 * journey in three places - the interest row's status, the request's appointment
 * timestamp and its Payment Status - and this maps them onto the one word a Tutor
 * would use.
 */
export const tutorApplicationStages = [
  { key: "applied", label: "Applied Jobs" },
  { key: "shortlisted", label: "Shortlisted Jobs" },
  { key: "appointed", label: "Appointed Jobs" },
  { key: "confirmed", label: "Confirmed Jobs" },
  { key: "closed", label: "Closed Jobs" },
  { key: "cancelled", label: "Cancelled Jobs" },
] as const;

export type TutorApplicationStage = (typeof tutorApplicationStages)[number]["key"];

export function isTutorApplicationStage(value: unknown): value is TutorApplicationStage {
  return tutorApplicationStages.some(stage => stage.key === value);
}

export type TutorApplicationRecord = {
  status: "interested" | "shortlisted" | "declined" | "matched" | "withdrawn";
  /** Set only once an Admin finalises the Guardian and Tutor appointment. */
  appointmentConfirmedAt?: Date | string | null;
  /** How much of the fee is paid; Full Paid is what turns a Confirmed tuition into a Closed one. */
  paymentStatus?: string | null;
  /** Set when the tuition itself was cancelled: every application on it ends with it. */
  tuitionCancelled?: boolean | number | null;
};

export function getTutorApplicationStage(record: TutorApplicationRecord): TutorApplicationStage {
  // A cancelled tuition ends every application on it, a Confirmed or Closed one included.
  if (record.tuitionCancelled || record.status === "declined" || record.status === "withdrawn") return "cancelled";
  // Appointed and Confirmed are the same interest status either side of the
  // Admin's confirmation, which is the only thing that tells them apart; a
  // Confirmed tuition whose fee is Full Paid is Closed.
  if (record.status === "matched") {
    if (!record.appointmentConfirmedAt) return "appointed";
    return record.paymentStatus === "full_paid" ? "closed" : "confirmed";
  }
  if (record.status === "shortlisted") return "shortlisted";
  return "applied";
}

export function countTutorApplicationStages(records: readonly TutorApplicationRecord[]) {
  const counts: Record<TutorApplicationStage, number> = { applied: 0, shortlisted: 0, appointed: 0, confirmed: 0, closed: 0, cancelled: 0 };
  for (const record of records) counts[getTutorApplicationStage(record)] += 1;
  return counts;
}

export function filterTutorApplicationsByStage<T extends TutorApplicationRecord>(records: readonly T[], stage: TutorApplicationStage) {
  return records.filter(record => getTutorApplicationStage(record) === stage);
}
