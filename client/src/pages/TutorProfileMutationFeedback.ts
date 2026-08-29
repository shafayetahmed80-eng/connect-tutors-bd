export type TutorProfileMutationFailureCategory = "pendingConflict" | "sessionExpired" | "accountRestricted" | "temporaryFailure";

export type TutorProfileMutationFailureFeedback = {
  category: TutorProfileMutationFailureCategory;
  message: string;
};

type TrpcMutationFailure = {
  data?: {
    code?: unknown;
  };
};

const feedbackByCategory: Record<TutorProfileMutationFailureCategory, TutorProfileMutationFailureFeedback> = {
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
  temporaryFailure: {
    category: "temporaryFailure",
    message: "We could not save your profile right now. Check your connection and try again.",
  },
};

/**
 * Returns UI-owned, safe recovery copy. Never render the server message because
 * it may include implementation details that are not appropriate for Tutors.
 */
export function getTutorProfileMutationFailureFeedback(error: unknown): TutorProfileMutationFailureFeedback {
  const code = error && typeof error === "object" ? (error as TrpcMutationFailure).data?.code : undefined;

  if (code === "CONFLICT") return feedbackByCategory.pendingConflict;
  if (code === "UNAUTHORIZED") return feedbackByCategory.sessionExpired;
  if (code === "FORBIDDEN") return feedbackByCategory.accountRestricted;
  return feedbackByCategory.temporaryFailure;
}
