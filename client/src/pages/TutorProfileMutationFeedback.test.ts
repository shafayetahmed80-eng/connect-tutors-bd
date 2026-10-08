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

  it("says a refused request was refused, not that the connection failed", () => {
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "BAD_REQUEST" }, message: "Unknown validator implementation detail" })).toEqual({
      category: "notAccepted",
      message: "Some details were not accepted. Review them and try again.",
    });
    expect(getTutorProfileMutationFailureFeedback({ data: { code: "TOO_MANY_REQUESTS" }, message: "rate" }).category).toBe("tooManyAttempts");
  });

  it("owns a failure of the server's, and hands the Tutor its reference instead of the raw message", () => {
    const failure = getTutorProfileMutationFailureFeedback({ data: { code: "INTERNAL_SERVER_ERROR", supportReference: "A1B2C3" }, message: "SQL duplicate key: tutor_profile" });

    expect(failure.category).toBe("serverProblem");
    expect(failure.reference).toBe("A1B2C3");
    expect(failure.message).toContain("problem on our side (reference A1B2C3)");
    expect(failure.message).not.toContain("SQL");
  });

  it("still owns it when the server gave no reference, and ignores one that is not a reference", () => {
    for (const data of [{ code: "INTERNAL_SERVER_ERROR" }, { code: "INTERNAL_SERVER_ERROR", supportReference: "DROP TABLE" }]) {
      const failure = getTutorProfileMutationFailureFeedback({ data, message: "x" });
      expect(failure.category).toBe("serverProblem");
      expect(failure.reference).toBeUndefined();
      expect(failure.message).toBe("We could not save your profile because of a problem on our side. Try again in a few minutes.");
    }
  });

  it("blames the connection only when no answer came back at all", () => {
    expect(getTutorProfileMutationFailureFeedback(null)).toEqual({
      category: "temporaryFailure",
      message: "We could not reach the server. Check your connection and try again.",
    });
    expect(getTutorProfileMutationFailureFeedback(new TypeError("Failed to fetch")).category).toBe("temporaryFailure");
  });
});
