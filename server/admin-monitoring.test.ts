import { describe, expect, it } from "vitest";
import { validateTutorModerationAction } from "./admin-monitoring";

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
});
