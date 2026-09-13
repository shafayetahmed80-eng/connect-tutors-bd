/**
 * An Admin appointing one applicant to a Live tuition - either by approving the
 * Guardian's request, or by "Mark matched" in the Tutor Apply queue. Both take
 * this one path, so the tuition, the Tutor and the Guardian hear about an
 * appointment the same way whichever button made it.
 *
 * Appointed is the demo-class stage, not the end: the tuition stays on the Job
 * Board, and whether the Guardian keeps the Tutor is decided afterwards.
 */
import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

export type AdminAppointmentRefusal = "not_live" | "not_requested" | "tutor_unavailable" | "invalid_transition";

export function canAppointApplicant(input: {
  lifecycle: GuardianRequestLifecycle;
  /** The application's own status, which the Admin owns. */
  interestStatus: string;
  tutorApproved: boolean;
  /** Whether the Guardian has asked for this applicant. */
  requested: boolean;
  /** Approving a Guardian's request needs one; "Mark matched" does not. */
  requireRequest: boolean;
}): { allowed: true } | { allowed: false; reason: AdminAppointmentRefusal } {
  // Live only: an Appointed tuition already has its Tutor, one at a time.
  if (input.lifecycle !== "live") return { allowed: false, reason: "not_live" };
  if (input.requireRequest && !input.requested) return { allowed: false, reason: "not_requested" };
  if (!input.tutorApproved) return { allowed: false, reason: "tutor_unavailable" };
  if (input.interestStatus !== "interested" && input.interestStatus !== "shortlisted") return { allowed: false, reason: "invalid_transition" };
  return { allowed: true };
}

/** A waiting request can be declined while the tuition is still Live. */
export function canDeclineAppointmentRequest(input: { lifecycle: GuardianRequestLifecycle; requested: boolean }): boolean {
  return input.lifecycle === "live" && input.requested;
}

/**
 * What the appointed Tutor is told. The Guardian's name and number go with it:
 * appointment is the point at which the two are put in touch for the demo class.
 */
export function appointedTutorNotification(input: { jobId: string; guardianName: string | null; guardianPhone: string | null }) {
  const contact = [input.guardianName?.trim(), input.guardianPhone?.trim()].filter(Boolean).join(", ");
  return {
    title: `You were appointed to ${input.jobId}`.slice(0, 120),
    message: (contact ? `Arrange the demo class with the Guardian: ${contact}.` : "Arrange the demo class with the Guardian.").slice(0, 360),
  };
}

export const adminAppointmentRefusalMessages: Record<AdminAppointmentRefusal, string> = {
  not_live: "An applicant can only be appointed while the tuition is Live.",
  not_requested: "There is no appointment request waiting for this applicant.",
  tutor_unavailable: "This Tutor's profile is not approved, so they cannot be appointed.",
  invalid_transition: "This applicant can no longer be appointed.",
};
