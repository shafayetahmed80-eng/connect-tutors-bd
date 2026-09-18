/**
 * An Admin's own profile - the Admin panel's counterpart of the Guardian
 * profile, with the Guardian-only parts (Guardian ID, verification, social
 * links, "how did you hear about us") left out and a designation in place of
 * a profession. Every field is optional; the email and User ID are read-only.
 */
import { tutorNationalityOptions, tutorReligionOptions } from "./tutor-personal-details";

/** The same lists a Tutor and a Guardian pick from. */
export const adminReligionOptions = tutorReligionOptions;
export const adminNationalityOptions = tutorNationalityOptions;

/** Column widths from migration 0083, shared by the zod input and the form. */
export const ADMIN_PROFILE_LIMITS = {
  name: 120,
  phone: 16,
  additionalPhone: 16,
  addressDetails: 255,
  designation: 120,
  emergencyContactName: 120,
  emergencyContactPhone: 16,
  emergencyContactRelation: 60,
  emergencyContactAddress: 255,
  emergencyContactProfession: 120,
} as const;

/** The three images an Admin profile holds, each at its own upload address. */
export const adminProfileImageKinds = ["photo", "nid-front", "nid-back"] as const;
export type AdminProfileImageKind = (typeof adminProfileImageKinds)[number];

export function isAdminProfileImageKind(value: unknown): value is AdminProfileImageKind {
  return typeof value === "string" && (adminProfileImageKinds as readonly string[]).includes(value);
}

/** What the completion figure counts: every field an Admin can fill, and both NID sides. */
export type AdminProfileCompletionSource = {
  phone: string | null;
  additionalPhone: string | null;
  gender: string | null;
  religion: string | null;
  nationality: string | null;
  cityLocationId: string | null;
  locationId: string | null;
  addressDetails: string | null;
  designation: string | null;
  emergencyContactName: string | null;
  emergencyContactPhone: string | null;
  emergencyContactRelation: string | null;
  emergencyContactAddress: string | null;
  emergencyContactProfession: string | null;
  nidFrontUploaded: boolean;
  nidBackUploaded: boolean;
};

const completionTextFields = [
  "phone", "additionalPhone", "gender", "religion", "nationality", "cityLocationId", "locationId", "addressDetails", "designation",
  "emergencyContactName", "emergencyContactPhone", "emergencyContactRelation", "emergencyContactAddress", "emergencyContactProfession",
] as const satisfies readonly (keyof AdminProfileCompletionSource)[];

export function adminProfileCompletion(profile: AdminProfileCompletionSource): number {
  const filled = completionTextFields.filter(key => Boolean(profile[key]?.trim())).length
    + (profile.nidFrontUploaded ? 1 : 0) + (profile.nidBackUploaded ? 1 : 0);
  return Math.round((filled / (completionTextFields.length + 2)) * 100);
}
