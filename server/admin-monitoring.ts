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
      ? { title: "আপনার প্রোফাইল পুনর্বহাল হয়েছে", message: "আপনি আবার টিউশন রিকোয়েস্টের সাথে ম্যাচ হতে পারবেন।" }
      : { title: "আপনার প্রোফাইল অনুমোদিত হয়েছে", message: "আপনি এখন টিউশন রিকোয়েস্টের সাথে ম্যাচ হতে পারবেন।" };
  }
  if (input.to === "changes_requested") {
    return { title: "আপনার প্রোফাইলে পরিবর্তন চাওয়া হয়েছে", message: "কী পরিবর্তন করতে হবে দেখতে আপনার প্রোফাইল খুলুন, তারপর আবার জমা দিন।" };
  }
  return { title: "আপনার প্রোফাইল সাসপেন্ড করা হয়েছে", message: "পরবর্তী ধাপ সম্পর্কে আপনার কোঅর্ডিনেটর জানাতে পারবেন।" };
}
