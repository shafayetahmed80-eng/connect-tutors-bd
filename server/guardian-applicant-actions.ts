/**
 * What a Guardian may do to an applicant: shortlist them, and ask the Admin to
 * appoint one. The rules live here, apart from the queries, so they can be read
 * - and tested - without a database.
 *
 * Both marks are the Guardian's own. `tutor_job_interests.status` is the
 * Admin's: a Guardian shortlisting a Tutor must not move them in the Admin's
 * queue, and an Admin decision must not wipe the Guardian's list.
 */
import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

export type AppointmentRequestRefusal = "not_live" | "already_requested" | "another_requested";

/**
 * Whether a Guardian may ask for this applicant to be appointed now.
 *
 * Only while the tuition is Live: once a Tutor is appointed the demo class is
 * under way, and what happens next is the Admin's call. And one request at a
 * time per tuition, so the Admin is never choosing between two of the
 * Guardian's picks.
 */
export function canRequestAppointment(input: {
  lifecycle: GuardianRequestLifecycle;
  /** The Tutor a request is already waiting on for this tuition, if any. */
  pendingTutorId: string | null;
  tutorId: string;
}): { allowed: true } | { allowed: false; reason: AppointmentRequestRefusal } {
  if (input.lifecycle !== "live") return { allowed: false, reason: "not_live" };
  if (input.pendingTutorId === input.tutorId) return { allowed: false, reason: "already_requested" };
  if (input.pendingTutorId) return { allowed: false, reason: "another_requested" };
  return { allowed: true };
}

/** A waiting request can be taken back until the Admin acts on it - that is, while the tuition is still Live. */
export function canWithdrawAppointmentRequest(input: { lifecycle: GuardianRequestLifecycle; requested: boolean }): boolean {
  return input.lifecycle === "live" && input.requested;
}

export const appointmentRefusalMessages: Record<AppointmentRequestRefusal | "nothing_to_withdraw", string> = {
  not_live: "An appointment can only be requested while the tuition is Live.",
  already_requested: "You have already asked to appoint this Tutor.",
  another_requested: "You have already asked to appoint another Tutor for this tuition. Withdraw that request first.",
  nothing_to_withdraw: "There is no appointment request waiting to be withdrawn.",
};
