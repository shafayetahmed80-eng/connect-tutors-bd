export type TutorProfileMutationFailureCategory =
  | "pendingConflict"
  | "sessionExpired"
  | "accountRestricted"
  | "notAccepted"
  | "tooManyAttempts"
  | "serverProblem"
  | "temporaryFailure";

export type TutorProfileMutationFailureFeedback = {
  category: TutorProfileMutationFailureCategory;
  message: string;
  /** The short code that finds this failure in the server's log, when the server gave one. */
  reference?: string;
};

type TrpcMutationFailure = {
  data?: {
    code?: unknown;
    supportReference?: unknown;
  };
};

const feedbackByCategory: Record<Exclude<TutorProfileMutationFailureCategory, "serverProblem">, TutorProfileMutationFailureFeedback> = {
  pendingConflict: {
    category: "pendingConflict",
    message: "Your profile is already under review. Wait for change instructions before editing it again.",
  },
  sessionExpired: {
    category: "sessionExpired",
    message: "Your session has ended. Sign in again and try once more.",
  },
  accountRestricted: {
    category: "accountRestricted",
    message: "This account cannot update a profile right now. Contact an administrator for support.",
  },
  notAccepted: {
    category: "notAccepted",
    message: "Some details were not accepted. Review them and try again.",
  },
  tooManyAttempts: {
    category: "tooManyAttempts",
    message: "Too many attempts. Wait a minute and try again.",
  },
  // Only for a request that never got an answer: no server code came back at all.
  temporaryFailure: {
    category: "temporaryFailure",
    message: "We could not reach the server. Check your connection and try again.",
  },
};

/**
 * Returns UI-owned, safe recovery copy. Never render the server message because
 * it may include implementation details that are not appropriate for Tutors;
 * the one thing taken from the server is its short support reference.
 */
export function getTutorProfileMutationFailureFeedback(error: unknown): TutorProfileMutationFailureFeedback {
  const data = error && typeof error === "object" ? (error as TrpcMutationFailure).data : undefined;
  const code = data?.code;

  if (code === "CONFLICT") return feedbackByCategory.pendingConflict;
  if (code === "UNAUTHORIZED") return feedbackByCategory.sessionExpired;
  if (code === "FORBIDDEN") return feedbackByCategory.accountRestricted;
  if (code === "BAD_REQUEST") return feedbackByCategory.notAccepted;
  if (code === "TOO_MANY_REQUESTS") return feedbackByCategory.tooManyAttempts;
  if (typeof code === "string") {
    // The request arrived and the server could not do it: that is ours to fix, not a connection to check.
    const reference = typeof data?.supportReference === "string" && /^[A-F0-9]{6}$/.test(data.supportReference) ? data.supportReference : undefined;
    return {
      category: "serverProblem",
      reference,
      message: reference
        ? `We could not save your profile because of a problem on our side (reference ${reference}). Try again in a few minutes; if it keeps happening, give support this reference.`
        : "We could not save your profile because of a problem on our side. Try again in a few minutes.",
    };
  }
  return feedbackByCategory.temporaryFailure;
}
