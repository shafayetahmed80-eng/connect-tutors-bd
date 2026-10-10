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

/**
 * The one publication move an Admin makes: taking a tuition Live, from the Posted
 * jobs board, in a single click from wherever the request had got to.
 *
 * It used to be the last step of a review chain on the Matching workspace -
 * verify, record a Guardian call, approve, publish - which is gone. Old tuitions
 * still carry those steps in their history, so the labels for them live in
 * `@shared/tuition-history`; they are no longer actions anyone can take.
 */
export const ADMIN_REQUEST_PUBLICATION_ACTIONS = ["go_live"] as const;

export type AdminRequestPublicationAction = (typeof ADMIN_REQUEST_PUBLICATION_ACTIONS)[number];

type PublicationValidationInput = {
  from: AdminRequestPublicationState;
  action: AdminRequestPublicationAction;
};

type PublicationValidationResult =
  | { valid: true; nextState: AdminRequestPublicationState }
  | { valid: false; reason: "INVALID_TRANSITION" };

const transitions: Record<AdminRequestPublicationAction, Partial<Record<AdminRequestPublicationState, AdminRequestPublicationState>>> = {
  go_live: { submitted: "published", reviewing: "published", changes_requested: "published", approved: "published", unpublished: "published" },
};

export function validateAdminRequestPublicationAction(input: PublicationValidationInput): PublicationValidationResult {
  // An action this build no longer knows (a retired one from a stale page) is no transition, not a crash.
  const nextState = transitions[input.action]?.[input.from];
  if (!nextState) return { valid: false, reason: "INVALID_TRANSITION" };
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
