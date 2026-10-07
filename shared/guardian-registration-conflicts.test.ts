import { describe, expect, it } from "vitest";
import {
  GUARDIAN_REGISTRATION_CONFLICTS,
  guardianRegistrationConflictField,
  guardianRegistrationConflictOf,
  isGuardianRegistrationConflict,
} from "./guardian-registration-conflicts";

describe("Guardian registration conflicts", () => {
  it("gives every cause its own sentence, so no two refusals read alike", () => {
    const sentences = Object.values(GUARDIAN_REGISTRATION_CONFLICTS);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("recognises a cause from its sentence and nothing else", () => {
    for (const [key, sentence] of Object.entries(GUARDIAN_REGISTRATION_CONFLICTS)) {
      expect(guardianRegistrationConflictOf(sentence)).toBe(key);
    }
    expect(guardianRegistrationConflictOf("Please try again.")).toBeNull();
    expect(isGuardianRegistrationConflict("phone-taken")).toBe(true);
    expect(isGuardianRegistrationConflict("invalid-location")).toBe(false);
    expect(isGuardianRegistrationConflict("toString")).toBe(false);
  });

  it("places each cause under its field and offers sign-in only where it would work", () => {
    expect(guardianRegistrationConflictField("email-taken")).toEqual({ field: "email", offerSignIn: true });
    expect(guardianRegistrationConflictField("email-other-role")).toEqual({ field: "email", offerSignIn: false });
    expect(guardianRegistrationConflictField("phone-taken")).toEqual({ field: "phone", offerSignIn: true });
  });
});
