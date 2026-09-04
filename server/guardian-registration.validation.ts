import { z } from "zod";
import { TERMS_VERSION } from "@shared/terms-version";

/**
 * Kept as a name the Guardian code already reads, now pointing at the one
 * shared version. A Tutor and a Guardian tick the same box and follow the
 * same two links, so two constants could only drift apart.
 */
export const GUARDIAN_TERMS_VERSION = TERMS_VERSION;

export class GuardianRegistrationError extends Error {
  constructor(public readonly reason: "duplicate" | "invalid-location" | "handoff-expired" | "storage") {
    super(reason);
    this.name = "GuardianRegistrationError";
  }
}

const bangladeshPhonePattern = /^\+8801[3-9]\d{8}$/;

export const guardianRegistrationSchema = z
  .object({
    name: z.string().trim().min(2, "Enter your full name.").max(160, "Full name must be 160 characters or fewer."),
    gender: z.enum(["male", "female"], { message: "Choose your gender to continue." }),
    email: z.string().trim().email("Enter a valid email address.").max(320, "Email address must be 320 characters or fewer."),
    password: z.string().min(8, "Password must be at least 8 characters.").max(128, "Password must be 128 characters or fewer."),
    confirmPassword: z.string().min(1, "Confirm your password."),
    cityLocationId: z.string().trim().min(1, "Choose your City to continue."),
    locationId: z.string().trim().min(1, "Choose your Location to continue."),
    termsAccepted: z.boolean(),
    phone: z.string().regex(bangladeshPhonePattern, "Enter a valid Bangladesh mobile number.").optional(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "Passwords do not match." });
    }
    if (!value.termsAccepted) {
      context.addIssue({ code: "custom", path: ["termsAccepted"], message: "Accept the Terms of Use and Privacy Policy to create your account." });
    }
  });

export type GuardianRegistrationInput = z.infer<typeof guardianRegistrationSchema>;

type LocationReference = {
  id: string;
  type: string;
  country: string;
  enabled: number;
  parentId: string | null;
};

export function isGuardianLocationWithinCity({
  cityId,
  locationId,
  references,
}: {
  cityId: string;
  locationId: string;
  references: readonly LocationReference[];
}) {
  const byId = new Map(references.map(reference => [reference.id, reference]));
  const city = byId.get(cityId);
  if (!city || city.type !== "city" || city.country !== "Bangladesh" || city.enabled !== 1) return false;

  let current = byId.get(locationId);
  if (!current || current.id === cityId || current.country !== "Bangladesh" || current.enabled !== 1) return false;

  const visited = new Set<string>();
  while (current.parentId) {
    if (visited.has(current.id)) return false;
    visited.add(current.id);
    if (current.parentId === cityId) return true;
    current = byId.get(current.parentId);
    if (!current || current.country !== "Bangladesh" || current.enabled !== 1) return false;
  }
  return false;
}
