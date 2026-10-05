/**
 * The Owner's switches for how the tuition flow behaves, set on the Dynamic
 * Section's Admin Control page.
 *
 * Each one is stored as a single number in `site_limits` - the same table the
 * Owner's numeric dials use, so no table of its own - under an id that is kept
 * out of the limits registry on purpose: a switch like this one has work to do
 * when it moves, so it is never saved through the plain Limits editor.
 */

/**
 * Which of a tuition's applicants a Guardian can see, open and ask about.
 * Either way the Guardian's applied count covers everyone, and an appointed
 * Tutor is always visible.
 */
export type GuardianApplicantVisibility = "all" | "shortlisted";

export const guardianApplicantVisibilityValues = ["all", "shortlisted"] as const satisfies readonly GuardianApplicantVisibility[];

/** The row id in `site_limits`. */
export const GUARDIAN_APPLICANT_VISIBILITY_ID = "control.guardianApplicantVisibility";

/** Until the Owner chooses, a Guardian sees only the Tutors an Admin shortlisted. */
export const DEFAULT_GUARDIAN_APPLICANT_VISIBILITY: GuardianApplicantVisibility = "shortlisted";

export function guardianApplicantVisibilityFromStored(value: number | null | undefined): GuardianApplicantVisibility {
  if (value === 0) return "all";
  if (value === 1) return "shortlisted";
  return DEFAULT_GUARDIAN_APPLICANT_VISIBILITY;
}

export function storedGuardianApplicantVisibility(mode: GuardianApplicantVisibility): number {
  return mode === "all" ? 0 : 1;
}

export const TUTOR_GUARDIAN_LOGIN_OTP_ENABLED_ID = "control.tutorGuardianLoginOtp";
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_ID = "control.tutorGuardianLoginOtpDays";
/**
 * Counts how many times the Owner has reset every trusted browser. A proof is
 * signed with the count current when it was given, so raising it ends them all.
 */
export const TUTOR_GUARDIAN_LOGIN_OTP_EPOCH_ID = "control.tutorGuardianLoginOtpEpoch";

/** Off until the Owner turns it on from Admin Control. */
export const DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED = false;
export const DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS = 30;
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN = 1;
export const TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX = 90;

export function tutorGuardianLoginOtpEnabledFromStored(value: number | null | undefined): boolean {
  if (value === 1) return true;
  if (value === 0) return false;
  return DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_ENABLED;
}

export function tutorGuardianLoginOtpEpochFromStored(value: number | null | undefined): number {
  return Number.isInteger(value) && (value as number) > 0 ? (value as number) : 0;
}

export function tutorGuardianLoginOtpDaysFromStored(value: number | null | undefined): number {
  if (value === null || value === undefined) return DEFAULT_TUTOR_GUARDIAN_LOGIN_OTP_DAYS;
  return Math.min(TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MAX, Math.max(TUTOR_GUARDIAN_LOGIN_OTP_DAYS_MIN, Math.round(value)));
}
