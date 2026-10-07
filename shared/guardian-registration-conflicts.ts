/**
 * Why a Guardian registration was refused because the details already belong
 * to an account. One sentence per cause, written once, so the server can send
 * it and the form can tell which field it belongs under without guessing at
 * the wording.
 */
export const GUARDIAN_REGISTRATION_CONFLICTS = {
  "email-taken": "এই ইমেইল দিয়ে আগে থেকেই একটি অ্যাকাউন্ট আছে।",
  "email-other-role": "এই ইমেইলটি অন্য ধরনের Connect Tutors অ্যাকাউন্টে ব্যবহৃত হয়েছে। অন্য একটি ইমেইল দিন।",
  "phone-taken": "এই মোবাইল নম্বর দিয়ে আগে থেকেই একটি Guardian অ্যাকাউন্ট আছে।",
} as const;

export type GuardianRegistrationConflict = keyof typeof GUARDIAN_REGISTRATION_CONFLICTS;

export function isGuardianRegistrationConflict(reason: string): reason is GuardianRegistrationConflict {
  return Object.prototype.hasOwnProperty.call(GUARDIAN_REGISTRATION_CONFLICTS, reason);
}

/** The cause a server message stands for, or null when it is some other message. */
export function guardianRegistrationConflictOf(message: string): GuardianRegistrationConflict | null {
  const match = (Object.keys(GUARDIAN_REGISTRATION_CONFLICTS) as GuardianRegistrationConflict[])
    .find((key) => GUARDIAN_REGISTRATION_CONFLICTS[key] === message);
  return match ?? null;
}

/** Which form field the conflict belongs under, and whether signing in is the way out. */
export function guardianRegistrationConflictField(conflict: GuardianRegistrationConflict): { field: "email" | "phone"; offerSignIn: boolean } {
  if (conflict === "phone-taken") return { field: "phone", offerSignIn: true };
  return { field: "email", offerSignIn: conflict === "email-taken" };
}
