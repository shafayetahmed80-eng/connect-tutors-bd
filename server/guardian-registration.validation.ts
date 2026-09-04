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
    name: z.string().trim().min(2, "নাম লিখুন").max(160, "নাম ১৬০ অক্ষরের মধ্যে লিখুন"),
    gender: z.enum(["male", "female"], { message: "লিঙ্গ নির্বাচন করুন" }),
    email: z.string().trim().email("সঠিক ইমেইল লিখুন").max(320, "ইমেইল ৩২০ অক্ষরের মধ্যে লিখুন"),
    password: z.string().min(8, "পাসওয়ার্ড কমপক্ষে ৮ অক্ষরের হতে হবে").max(128, "পাসওয়ার্ড ১২৮ অক্ষরের মধ্যে রাখুন"),
    confirmPassword: z.string().min(1, "পাসওয়ার্ড নিশ্চিত করুন"),
    cityLocationId: z.string().trim().min(1, "শহর নির্বাচন করুন"),
    locationId: z.string().trim().min(1, "লোকেশন নির্বাচন করুন"),
    termsAccepted: z.boolean(),
    phone: z.string().regex(bangladeshPhonePattern, "সঠিক বাংলাদেশি ফোন নম্বর প্রয়োজন").optional(),
  })
  .superRefine((value, context) => {
    if (value.password !== value.confirmPassword) {
      context.addIssue({ code: "custom", path: ["confirmPassword"], message: "দুইটি পাসওয়ার্ড একই হতে হবে" });
    }
    if (!value.termsAccepted) {
      context.addIssue({ code: "custom", path: ["termsAccepted"], message: "Terms ও Privacy গ্রহণ করতে হবে" });
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
