import { describe, expect, it } from "vitest";
import { describeTutorModerationNotice, validateTutorModerationAction } from "./admin-monitoring";

describe("Tutor moderation rules", () => {
  it("permits only the approved operational status transitions", () => {
    expect(validateTutorModerationAction({ from: "pending", to: "approved" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "pending", to: "changes_requested" })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "pending", to: "suspended", reason: "Identity document needs clarification" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "approved", to: "suspended", reason: "Repeated policy breach" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "draft", to: "approved" })).toEqual({ valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" });
    expect(validateTutorModerationAction({ from: "changes_requested", to: "approved" })).toEqual({ valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" });
  });

  it("requires a meaningful trimmed reason only for changes-requested and suspension actions", () => {
    expect(validateTutorModerationAction({ from: "pending", to: "changes_requested", reason: "   " })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "pending", to: "suspended" })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "pending", to: "approved", reason: "Optional review note" })).toEqual({ valid: true });
  });

  it("lets an Admin send an approved profile back to the Tutor for changes, with a reason", () => {
    expect(validateTutorModerationAction({ from: "approved", to: "changes_requested" })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "approved", to: "changes_requested", reason: "Your University ID has expired" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "approved", to: "approved" })).toEqual({ valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" });
  });

  it("lets an Admin suspend a profile that is waiting on the Tutor's changes, with a reason", () => {
    expect(validateTutorModerationAction({ from: "changes_requested", to: "suspended" })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "changes_requested", to: "suspended", reason: "The University ID is not genuine" })).toEqual({ valid: true });
    // Approval still waits for the Tutor to resubmit.
    expect(validateTutorModerationAction({ from: "changes_requested", to: "approved" })).toEqual({ valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" });
  });

  it("lets an Admin lift a suspension, straight back to approved or back to the Tutor for changes", () => {
    expect(validateTutorModerationAction({ from: "suspended", to: "approved" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "suspended", to: "changes_requested" })).toEqual({ valid: false, reason: "MODERATION_REASON_REQUIRED" });
    expect(validateTutorModerationAction({ from: "suspended", to: "changes_requested", reason: "Upload a clearer University ID" })).toEqual({ valid: true });
    expect(validateTutorModerationAction({ from: "suspended", to: "suspended", reason: "Again" })).toEqual({ valid: false, reason: "MODERATION_TRANSITION_NOT_ALLOWED" });
  });

  it("tells a reinstated Tutor they are back, not newly approved", () => {
    expect(describeTutorModerationNotice({ from: "suspended", to: "approved" }).title).toBe("Your profile has been reinstated");
    expect(describeTutorModerationNotice({ from: "pending", to: "approved" }).title).toBe("Your profile has been approved");
    expect(describeTutorModerationNotice({ from: "suspended", to: "changes_requested" }).title).toBe("Changes were requested on your profile");
    expect(describeTutorModerationNotice({ from: "approved", to: "suspended" }).title).toBe("Your profile has been suspended");
  });
});
