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
