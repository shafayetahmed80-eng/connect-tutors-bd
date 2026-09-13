/**
 * What happens to an Appointed tuition after the demo class. The Admin moves
 * it on from Posted jobs - Confirmed when the Guardian keeps the Tutor, or back
 * to Live when they do not.
 *
 * Confirmed takes the tuition off the Job Board: it is filled. Back to Live
 * removes the Tutor, so their number masks again on the Guardian's list and
 * the Guardian can ask for another applicant; the listing was never taken
 * down, so nothing needs putting back.
 */
import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

/** Only an Appointed tuition goes back to Live: that is the one with a Tutor to remove. */
export function canReopenAppointedTuition(lifecycle: GuardianRequestLifecycle): boolean {
  return lifecycle === "appointed";
}

/** The Tutor, when the Guardian keeps them. */
export function appointmentConfirmedTutorNotification(jobId: string) {
  return {
    title: `Your appointment to ${jobId} is confirmed`,
    message: "The Guardian is continuing with you after the demo class.",
  };
}

/** The Tutor, when the tuition goes back to Live without them. No reason is recorded, so none is given. */
export function appointmentEndedTutorNotification(jobId: string) {
  return {
    title: `Your appointment to ${jobId} has ended`,
    message: "The tuition is open to other Tutors again. Other tuitions on the Job Board are still open to you.",
  };
}
