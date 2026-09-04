export const ADMIN_REQUEST_PUBLICATION_STATES = [
  "submitted",
  "reviewing",
  "changes_requested",
  "approved",
  "unpublished",
  "published",
  "closed",
] as const;

export type AdminRequestPublicationState = (typeof ADMIN_REQUEST_PUBLICATION_STATES)[number];

export const ADMIN_REQUEST_PUBLICATION_ACTIONS = [
  "verify",
  "edit",
  "guardian_confirmed",
  "guardian_reconfirmed",
  "request_changes",
  "approve",
  "publish",
  "extend_expiry",
  "unpublish",
  "close",
] as const;

export type AdminRequestPublicationAction = (typeof ADMIN_REQUEST_PUBLICATION_ACTIONS)[number];

type PublicationValidationInput = {
  from: AdminRequestPublicationState;
  action: AdminRequestPublicationAction;
  guardianConfirmed: boolean;
  guardianReconfirmed?: boolean;
};

type PublicationValidationResult =
  | { valid: true; nextState: AdminRequestPublicationState }
  | { valid: false; reason: "INVALID_TRANSITION" | "GUARDIAN_CONFIRMATION_REQUIRED" };

const transitions: Record<AdminRequestPublicationAction, Partial<Record<AdminRequestPublicationState, AdminRequestPublicationState>>> = {
  verify: { submitted: "reviewing", changes_requested: "reviewing" },
  edit: { reviewing: "reviewing" },
  guardian_confirmed: { reviewing: "reviewing" },
  guardian_reconfirmed: { published: "published" },
  request_changes: { reviewing: "changes_requested" },
  approve: { reviewing: "approved" },
  publish: { approved: "published", unpublished: "published" },
  extend_expiry: { published: "published" },
  unpublish: { published: "unpublished" },
  close: { submitted: "closed", reviewing: "closed", changes_requested: "closed", approved: "closed", unpublished: "closed", published: "closed" },
};

/**
 * Publishing policy: an Admin must record a completed Guardian call before
 * approving or publishing. This preserves the user-approved manual process.
 */
export function validateAdminRequestPublicationAction(input: PublicationValidationInput): PublicationValidationResult {
  const nextState = transitions[input.action][input.from];
  if (!nextState) return { valid: false, reason: "INVALID_TRANSITION" };
  if ((input.action === "approve" || input.action === "publish") && !input.guardianConfirmed) {
    return { valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" };
  }
  if (input.action === "extend_expiry" && !input.guardianReconfirmed) {
    return { valid: false, reason: "GUARDIAN_CONFIRMATION_REQUIRED" };
  }
  return { valid: true, nextState };
}

type SnapshotSource = {
  category: string;
  classCourse: string;
  subjects: string;
  daysPerWeek: number;
  preferredGender: "male" | "female" | "any";
  budgetAmount: number | null;
  tuitionLocationLabel: string | null;
};

function safeSubjects(value: string): string[] {
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((subject): subject is string => typeof subject === "string").map(subject => subject.trim()).filter(Boolean).slice(0, 12)
      : [];
  } catch {
    return [];
  }
}

/** Only operational/public-job fields may appear in immutable Admin edit history. */
export function buildSafeTutorRequestPublicationSnapshot(request: SnapshotSource) {
  return {
    category: request.category.trim(),
    classCourse: request.classCourse.trim(),
    subjects: safeSubjects(request.subjects),
    daysPerWeek: request.daysPerWeek,
    tutorGenderPreference: request.preferredGender,
    budgetAmount: request.budgetAmount,
    location: request.tuitionLocationLabel?.trim() || null,
  };
}

/**
 * Which note the Job Board publishes: the Admin's edit, or the Guardian's own.
 *
 * The Guardian's note went out word for word. It is the one free-text field a
 * stranger reads, and Guardians put phone numbers, house numbers and family
 * detail in it - so an Admin has to be able to trim it before it is published.
 *
 * Three cases, and the third is the one worth naming: an Admin who clears the
 * box means "publish no note", not "fall back to what the Guardian wrote". A
 * `??` here would quietly republish the very text they just deleted.
 */
export function resolvePublishedJobNote(
  guardianNote: string | null | undefined,
  adminEdit: string | undefined,
): string | null {
  if (adminEdit === undefined) return guardianNote?.trim() || null;
  return adminEdit.trim() || null;
}
