import { cleanBangladeshLocalPhoneDigits, isValidBangladeshLocalPhone, BANGLADESH_COUNTRY_CODE } from "@shared/phone";

export const TUTOR_ONBOARDING_DRAFT_KEY = "connect-tutors:tutor-onboarding-draft";
export { BANGLADESH_COUNTRY_CODE };

export function normalizeBangladeshLocalMobile(value: string) {
  return cleanBangladeshLocalPhoneDigits(value);
}

export function isValidBangladeshLocalMobile(value: string) {
  return isValidBangladeshLocalPhone(value);
}

export function formatBangladeshMobile(value: string) {
  const digits = cleanBangladeshLocalPhoneDigits(value);
  return digits ? `${BANGLADESH_COUNTRY_CODE}${digits}` : "";
}

/**
 * Only the minimum identity/contact information is collected before sign in.
 * Professional fields are intentionally completed later in Tutor Dashboard > My Profile.
 */
export type TutorOnboardingDraft = {
  name: string;
  phone: string;
  contactEmail: string;
  gender: "male" | "female";
  cityId: string;
  locationId: string;
};

export function splitCommaSeparated(value: string) {
  return value.split(",").map(item => item.trim()).filter(Boolean);
}

export function saveTutorOnboardingDraft(draft: TutorOnboardingDraft) {
  sessionStorage.setItem(TUTOR_ONBOARDING_DRAFT_KEY, JSON.stringify(draft));
}

export function readTutorOnboardingDraft(): TutorOnboardingDraft | null {
  try {
    const value = sessionStorage.getItem(TUTOR_ONBOARDING_DRAFT_KEY);
    return value ? JSON.parse(value) as TutorOnboardingDraft : null;
  } catch {
    return null;
  }
}

export function clearTutorOnboardingDraft() {
  sessionStorage.removeItem(TUTOR_ONBOARDING_DRAFT_KEY);
}
