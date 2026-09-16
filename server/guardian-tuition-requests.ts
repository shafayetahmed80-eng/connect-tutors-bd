/**
 * What a Guardian may ask an Admin to do to a tuition once a Tutor is on it:
 * confirm the appointed Tutor after the demo class, take the Tutor off, or
 * cancel the whole tuition.
 *
 * The Guardian never does any of it themselves. The request waits for an
 * Admin, who approves - running the Admin's own Confirm, Remove or Cancel, so
 * nothing new happens to the tuition that an Admin could not already do - or
 * declines, which changes nothing. The rules live here, apart from the
 * queries, so they can be read and tested without a database.
 */
import type { GuardianTuitionRequestStatus, GuardianTuitionRequestType } from "../drizzle/schema";
import type { GuardianRequestLifecycle } from "./tutor-request-lifecycle";

/** The same bounds the Admin's own cancellation reason has, since an approved cancellation carries this one. */
export const GUARDIAN_REQUEST_REASON_MIN_LENGTH = 3;
export const GUARDIAN_REQUEST_REASON_MAX_LENGTH = 280;

export type GuardianTuitionRequestRefusal = "wrong_stage" | "not_holder" | "request_waiting" | "reason_required";

/** A confirmation needs no explanation; taking a Tutor off or cancelling does. */
export function guardianTuitionRequestNeedsReason(type: GuardianTuitionRequestType): boolean {
  return type !== "confirm";
}

/**
 * Whether a request still makes sense for the tuition as it stands now.
 *
 * Confirm is for an Appointed tuition's own Tutor; Remove for the Tutor
 * holding an Appointed or Confirmed one; Cancel for any tuition that is not
 * already cancelled. It is asked when the request is made, again when an
 * Admin approves it, and whenever a waiting request is shown - a tuition an
 * Admin moved on in the meantime leaves the request behind.
 */
export function guardianTuitionRequestApplies(input: {
  type: GuardianTuitionRequestType;
  lifecycle: GuardianRequestLifecycle;
  holderTutorId: string | null;
  tutorId: string | null;
}): boolean {
  if (input.type === "cancel_tuition") return input.lifecycle !== "cancelled";
  const holds = input.tutorId !== null && input.holderTutorId === input.tutorId;
  if (input.type === "confirm") return input.lifecycle === "appointed" && holds;
  return (input.lifecycle === "appointed" || input.lifecycle === "confirmed") && holds;
}

/**
 * Whether a Guardian may make this request now.
 *
 * One waiting request per tuition, so an Admin is never weighing a Confirm
 * against a Cancel from the same Guardian.
 */
export function canRequestTuitionChange(input: {
  type: GuardianTuitionRequestType;
  lifecycle: GuardianRequestLifecycle;
  holderTutorId: string | null;
  tutorId: string | null;
  reason: string | null;
  /** Whether a request that still applies is already waiting on this tuition. */
  requestWaiting: boolean;
}): { allowed: true } | { allowed: false; reason: GuardianTuitionRequestRefusal } {
  if (input.requestWaiting) return { allowed: false, reason: "request_waiting" };
  if (input.type !== "cancel_tuition") {
    const stageFits = input.type === "confirm"
      ? input.lifecycle === "appointed"
      : input.lifecycle === "appointed" || input.lifecycle === "confirmed";
    if (!stageFits) return { allowed: false, reason: "wrong_stage" };
    if (input.tutorId === null || input.holderTutorId !== input.tutorId) return { allowed: false, reason: "not_holder" };
  } else if (input.lifecycle === "cancelled") {
    return { allowed: false, reason: "wrong_stage" };
  }
  if (guardianTuitionRequestNeedsReason(input.type) && (input.reason ?? "").trim().length < GUARDIAN_REQUEST_REASON_MIN_LENGTH) {
    return { allowed: false, reason: "reason_required" };
  }
  return { allowed: true };
}

/** What an Admin's move on a tuition was, whether it answered a request or not. */
export type TuitionMove = "confirmed" | "reopened" | "cancelled";

const answeredBy: Record<GuardianTuitionRequestType, TuitionMove> = {
  confirm: "confirmed",
  remove_tutor: "reopened",
  cancel_tuition: "cancelled",
};

/**
 * What becomes of a waiting request when an Admin moves its tuition on.
 *
 * The move that was asked for answers it - whether the Admin approved the
 * request or simply did it - and any other move leaves it with nothing to
 * apply to.
 */
export function settleGuardianTuitionRequest(type: GuardianTuitionRequestType, move: TuitionMove): Extract<GuardianTuitionRequestStatus, "approved" | "closed"> {
  return answeredBy[type] === move ? "approved" : "closed";
}

/** The request types a move answers, for settling them in one update. */
export function guardianTuitionRequestTypesAnsweredBy(move: TuitionMove): GuardianTuitionRequestType[] {
  return (Object.keys(answeredBy) as GuardianTuitionRequestType[]).filter(type => answeredBy[type] === move);
}

export const guardianTuitionRequestRefusalMessages: Record<GuardianTuitionRequestRefusal | "nothing_to_withdraw" | "not_waiting" | "moved_on", string> = {
  wrong_stage: "This request is not available for the tuition as it stands now.",
  not_holder: "This Tutor is no longer on the tuition.",
  request_waiting: "You already have a request waiting on this tuition. Withdraw it first.",
  reason_required: "Write a reason of at least 3 characters.",
  nothing_to_withdraw: "There is no request waiting to be withdrawn.",
  not_waiting: "This request has already been decided or withdrawn.",
  moved_on: "The tuition has moved on since this request was made, so it was closed without a change.",
};

/** The Guardian, when an Admin declines a request. No reason is recorded, so none is given. */
export function guardianTuitionRequestDeclinedNotice(type: GuardianTuitionRequestType, jobId: string) {
  const what = type === "confirm" ? "confirm the Tutor" : type === "remove_tutor" ? "remove the Tutor" : "cancel the tuition";
  return {
    title: "Your request was not approved",
    message: `The request to ${what} on Job ID ${jobId} was declined.`,
  };
}
