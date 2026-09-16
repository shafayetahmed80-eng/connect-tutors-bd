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
