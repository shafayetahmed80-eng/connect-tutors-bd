/**
 * Fixed option lists for the Tutor Profile's personal-detail fields.
 *
 * Kept in code, not a catalog: these lists change about never, and both the
 * form control and the server validation have to agree on the same set.
 */

export const tutorNationalityOptions = ["Bangladeshi", "Others"] as const;
export type TutorNationality = (typeof tutorNationalityOptions)[number];
export const DEFAULT_TUTOR_NATIONALITY: TutorNationality = "Bangladeshi";

export const tutorReligionOptions = ["Islam", "Hinduism", "Christianity", "Buddhism", "Others"] as const;
export type TutorReligion = (typeof tutorReligionOptions)[number];

/**
 * Calculates a person's age in completed years from their ISO date-of-birth string (YYYY-MM-DD).
 * Returns null if the date format is invalid, not a real calendar date, or in the future.
 */
export function calculateAgeInYears(dateOfBirth: string, now: Date = new Date()): number | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateOfBirth)) return null;
  const birthDate = new Date(`${dateOfBirth}T00:00:00.000Z`);
  if (Number.isNaN(birthDate.getTime())) return null;
  if (birthDate.toISOString().slice(0, 10) !== dateOfBirth) return null;
  if (birthDate.getTime() > now.getTime()) return null;

  const currentYear = now.getUTCFullYear();
  const currentMonth = now.getUTCMonth();
  const currentDay = now.getUTCDate();

  const birthYear = birthDate.getUTCFullYear();
  const birthMonth = birthDate.getUTCMonth();
  const birthDay = birthDate.getUTCDate();

  let age = currentYear - birthYear;
  if (currentMonth < birthMonth || (currentMonth === birthMonth && currentDay < birthDay)) {
    age--;
  }
  return age;
}

export const MIN_PERMANENT_ADDRESS_LENGTH = 10;
export const MIN_PRESENT_ADDRESS_LENGTH = 10;

/**
 * Validates permanent address quality and minimum detail length.
 * Permanent address must contain sufficient geographic details (e.g. Village/Road, Thana/Upazila, District).
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePermanentAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_PERMANENT_ADDRESS_LENGTH) {
    return `Enter detailed permanent address (at least ${MIN_PERMANENT_ADDRESS_LENGTH} characters including Village/Area, Thana, District).`;
  }
  return null;
}

/**
 * Validates present address quality and minimum detail length.
 * Present address must contain sufficient geographic details (e.g. House/Road, Sector/Block, Area).
 * Returns an error message string if invalid, or null if valid.
 */
export function validatePresentAddress(address: string | null | undefined): string | null {
  if (address === null || address === undefined) return null;
  const trimmed = address.trim();
  if (trimmed.length === 0) return null;
  if (trimmed.length < MIN_PRESENT_ADDRESS_LENGTH) {
    return `Enter detailed present address (at least ${MIN_PRESENT_ADDRESS_LENGTH} characters including House/Road, Area).`;
  }
  return null;
}
