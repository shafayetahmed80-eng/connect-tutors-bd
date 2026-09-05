export const TUTOR_ONBOARDING_DRAFT_KEY = "connect-tutors:tutor-onboarding-draft";
export const BANGLADESH_COUNTRY_CODE = "+880";

export function normalizeBangladeshLocalMobile(value: string) {
  const digits = value.replace(/\D/g, "");
  const withoutCountryCode = digits.startsWith("880") ? digits.slice(3) : digits;
  const withoutTrunkPrefix = withoutCountryCode.startsWith("0") ? withoutCountryCode.slice(1) : withoutCountryCode;
  return withoutTrunkPrefix.slice(0, 10);
}

export function isValidBangladeshLocalMobile(value: string) {
  return /^1[3-9]\d{8}$/.test(value);
}

export function formatBangladeshMobile(value: string) {
  return `${BANGLADESH_COUNTRY_CODE}${normalizeBangladeshLocalMobile(value)}`;
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
