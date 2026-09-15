import type { TutorProfileStatus } from "../drizzle/schema";

export type TutorModerationAction = {
  from: TutorProfileStatus;
  to: Extract<TutorProfileStatus, "approved" | "changes_requested" | "suspended">;
  reason?: string;
};

export type TutorModerationValidationResult =
  | { valid: true }
  | { valid: false; reason: "MODERATION_TRANSITION_NOT_ALLOWED" | "MODERATION_REASON_REQUIRED" };

const ALLOWED_TRANSITIONS: ReadonlySet<string> = new Set([
  "pending:approved",
  "pending:changes_requested",
  "pending:suspended",
  "approved:suspended",
  // An approved profile can go back to the Tutor to correct something.
  "approved:changes_requested",
  // A profile waiting on the Tutor's corrections can still be suspended; approving it waits for the resubmission.
  "changes_requested:suspended",
  // Lifting a suspension: straight back to approved, or back to the Tutor to fix first.
  "suspended:approved",
  "suspended:changes_requested",
]);

/**
 * Restricts Admin operational changes to the approved Tutor profile lifecycle.
 * Reasons are required for outcomes that block or require work from the Tutor.
 */
export function validateTutorModerationAction(input: TutorModerationAction): TutorModerationValidationResult {
  if (!ALLOWED_TRANSITIONS.has(`${input.from}:${input.to}`)) {
    return { valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" };
  }

  if ((input.to === "changes_requested" || input.to === "suspended") && !input.reason?.trim()) {
    return { valid: false, reason: "MODERATION_REASON_REQUIRED" };
  }

  return { valid: true };
}

/**
 * What the Tutor is told when an Admin moves their profile. A suspended
 * profile coming back is a reinstatement, not a first approval.
 */
export function describeTutorModerationNotice(input: Pick<TutorModerationAction, "from" | "to">) {
  if (input.to === "approved") {
    return input.from === "suspended"
      ? { title: "Your profile has been reinstated", message: "You can be matched with tuition requests again." }
      : { title: "Your profile has been approved", message: "You can now be matched with tuition requests." };
  }
  if (input.to === "changes_requested") {
    return { title: "Changes were requested on your profile", message: "Open your profile to read what to change, then submit it again." };
  }
  return { title: "Your profile has been suspended", message: "Your coordinator can explain the next step." };
}
