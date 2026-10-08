/**
 * Why a Tutor registration was refused because the details already belong to
 * an account. One sentence per cause, written once, so the server sends it and
 * the form can tell which field it belongs under, and whether signing in is the
 * way out, without guessing at the wording.
 */
export const TUTOR_REGISTRATION_CONFLICTS = {
  "phone-taken": "This mobile number is already registered to a Tutor account.",
  "email-taken": "An account with this email already exists.",
  "email-other-role": "This email is already used for a different Connect Tutors account. Use another email to register as a Tutor.",
} as const;

export type TutorRegistrationConflict = keyof typeof TUTOR_REGISTRATION_CONFLICTS;

/** The cause a server message stands for, or null when it is some other message. */
export function tutorRegistrationConflictOf(message: string): TutorRegistrationConflict | null {
  const match = (Object.keys(TUTOR_REGISTRATION_CONFLICTS) as TutorRegistrationConflict[])
    .find((key) => TUTOR_REGISTRATION_CONFLICTS[key] === message);
  return match ?? null;
}

/** Which form field the conflict belongs under, and whether signing in settles it. */
export function tutorRegistrationConflictField(conflict: TutorRegistrationConflict): { field: "phone" | "email"; offerSignIn: boolean } {
  if (conflict === "phone-taken") return { field: "phone", offerSignIn: true };
  return { field: "email", offerSignIn: conflict === "email-taken" };
}
