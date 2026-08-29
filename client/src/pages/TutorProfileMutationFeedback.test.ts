import { describe, expect, it } from "vitest";
import { getTutorProfileMutationFailureFeedback } from "./TutorProfileMutationFeedback";

describe("getTutorProfileMutationFailureFeedback", () => {
  it("classifies known safe tRPC failure codes without rendering the raw server message", () => {
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "CONFLICT" }, message: "Profile state transition pending_review: internal" })).toEqual({
      category: "pendingConflict",
      message: "Your profile is already under review. Wait for change instructions before editing it again.",
    });
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "UNAUTHORIZED" }, message: "JWT token invalid" })).toEqual({
      category: "sessionExpired",
      message: "Your session has ended. Sign in again and try once more.",
    });
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "FORBIDDEN" }, message: "Account disabled internally" })).toEqual({
      category: "accountRestricted",
      message: "This account cannot update a profile right now. Contact an administrator for support.",
    });
  });

  it("uses the safe temporary-failure fallback for unknown, malformed, and validation errors without mapped fields", () => {
    const expected = {
      category: "temporaryFailure",
      message: "We could not save your profile right now. Check your connection and try again.",
    };

    expect(getTutorProfileMutationFailureFeedback({ data: { code: "INTERNAL_SERVER_ERROR" }, message: "SQL duplicate key: tutor_profile" })).toEqual(expected);
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "BAD_REQUEST" }, message: "Unknown validator implementation detail" })).toEqual(expected);
    expect(getTutorProfileMutationFailureFeedback(null)).toEqual(expected);
  });
});
