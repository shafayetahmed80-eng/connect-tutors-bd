import { BANGLADESH_COUNTRY_CODE, isValidBangladeshLocalMobile, normalizeBangladeshLocalMobile } from "@/lib/tutorOnboarding";

/**
 * Every box in the Tutor Profile that holds a Bangladesh mobile number.
 *
 * Each one stores the international `+8801…` form - the only form the server
 * accepts - and shows the Tutor just the ten local digits, so the country code
 * is not something anybody can get wrong. Registration already works this way.
 */
export const tutorProfilePhoneFields = ["phone", "additionalPhone", "fatherPhone", "motherPhone", "emergencyContactPhone"] as const;
export type TutorProfilePhoneField = (typeof tutorProfilePhoneFields)[number];

export const incompletePhoneMessage = "Enter a valid 10-digit Bangladesh mobile number after +880.";

/** Ten typed digits back into the stored form. An empty box stays empty. */
export function toStoredPhoneValue(typed: string) {
  const digits = normalizeBangladeshLocalMobile(typed);
  return digits ? `${BANGLADESH_COUNTRY_CODE}${digits}` : "";
}

/** The ten local digits to show in the box, whatever shape the stored value has. */
export function toLocalPhoneDigits(stored: string | undefined) {
  return normalizeBangladeshLocalMobile(stored ?? "");
}

/**
 * Which phone boxes in a draft hold a part-typed number.
 *
 * The server rejects anything that is not `+8801[3-9]` plus eight digits, and one
 * rejected number fails the whole save - which is what a Tutor sees as a section
 * that will not submit. Catching it here names the box instead.
 */
export function findIncompletePhoneFields(draft: {
  phone?: unknown;
  privateDetails?: Record<string, unknown>;
}): TutorProfilePhoneField[] {
  return tutorProfilePhoneFields.filter(field => {
    const value = field === "phone" ? draft.phone : draft.privateDetails?.[field];
    if (typeof value !== "string" || value.trim() === "") return false;
    return !isValidBangladeshLocalMobile(normalizeBangladeshLocalMobile(value));
  });
}
