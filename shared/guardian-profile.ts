/**
 * The editable Guardian profile: the field set the user specified, plus the
 * option lists it reuses. There is no submit-for-review workflow and no
 * posting gate - every field here is optional, the profile is always editable,
 * and an Admin flips `verificationStatus` independently.
 */
import { REQUEST_SOURCE_VALUES } from "./request-source";
import { tutorNationalityOptions, tutorReligionOptions } from "./tutor-personal-details";

/** Reused so a Guardian and a Tutor pick Religion / Nationality from the same list. */
export const guardianReligionOptions = tutorReligionOptions;
export const guardianNationalityOptions = tutorNationalityOptions;

/** Same four sources the tuition request offers, surfaced on the profile too. */
export const guardianHeardAboutUsValues = REQUEST_SOURCE_VALUES;

/**
 * Column widths from migration 0067, so the zod input and the form share one
 * source of truth and neither can send a value the database would refuse.
 */
export const GUARDIAN_PROFILE_LIMITS = {
  additionalPhone: 16,
  religion: 40,
  nationality: 60,
  socialLinks: 500,
  addressDetails: 255,
  profession: 120,
  emergencyContactName: 120,
  emergencyContactPhone: 16,
  emergencyContactRelation: 60,
  emergencyContactAddress: 255,
  emergencyContactProfession: 120,
  heardAboutUs: 60,
  verificationRejectionReason: 280,
} as const;

export const guardianVerificationStatusValues = ["unverified", "verified", "rejected"] as const;
export type GuardianVerificationStatus = (typeof guardianVerificationStatusValues)[number];

export const guardianNidSides = ["front", "back"] as const;
export type GuardianNidSide = (typeof guardianNidSides)[number];

export function isGuardianNidSide(value: unknown): value is GuardianNidSide {
  return value === "front" || value === "back";
}
