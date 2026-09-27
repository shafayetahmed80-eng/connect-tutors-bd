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

/** A Confirmed tuition goes back to Live only from Applied Tutors, when the Guardian did not keep its Tutor after all. */
export function canReopenConfirmedTuition(lifecycle: GuardianRequestLifecycle): boolean {
  return lifecycle === "confirmed";
}

/** The Tutor, when the Guardian keeps them. */
export function appointmentConfirmedTutorNotification(jobId: string) {
  return {
    title: `${jobId}-এ আপনার নিয়োগ নিশ্চিত হয়েছে`,
    message: "ডেমো ক্লাসের পর গার্ডিয়ান আপনার সাথেই চালিয়ে যাচ্ছেন।",
  };
}

/**
 * The Tutor holding a tuition, when an Admin cancels it. A reason is recorded,
 * but it is the Admin's own note, so the message does not repeat it.
 */
export function tuitionCancelledTutorNotification(jobId: string) {
  return {
    title: `আপনার ${jobId} টিউশনটি বাতিল হয়েছে`,
    message: "এই টিউশনটি আর হবে না। Job Board-এ অন্য টিউশন এখনো আপনার জন্য খোলা আছে।",
  };
}

/** The Tutor, when the tuition goes back to Live without them. No reason is recorded, so none is given. */
export function appointmentEndedTutorNotification(jobId: string) {
  return {
    title: `${jobId}-এ আপনার নিয়োগ শেষ হয়েছে`,
    message: "এই টিউশনটি আবার অন্য টিউটরদের জন্য খুলে দেওয়া হয়েছে। Job Board-এ অন্য টিউশন এখনো আপনার জন্য খোলা আছে।",
  };
}
