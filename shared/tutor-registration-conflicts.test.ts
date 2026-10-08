import { describe, expect, it } from "vitest";
import {
  TUTOR_REGISTRATION_CONFLICTS,
  tutorRegistrationConflictField,
  tutorRegistrationConflictOf,
} from "./tutor-registration-conflicts";

describe("Tutor registration conflicts", () => {
  it("gives every cause its own sentence, so no two refusals read alike", () => {
    const sentences = Object.values(TUTOR_REGISTRATION_CONFLICTS);
    expect(new Set(sentences).size).toBe(sentences.length);
  });

  it("recognises a cause from its sentence and nothing else", () => {
    for (const [key, sentence] of Object.entries(TUTOR_REGISTRATION_CONFLICTS)) {
      expect(tutorRegistrationConflictOf(sentence)).toBe(key);
    }
    expect(tutorRegistrationConflictOf("Please try again.")).toBeNull();
  });

  it("places each cause under its field and offers sign-in only where it would work", () => {
    expect(tutorRegistrationConflictField("phone-taken")).toEqual({ field: "phone", offerSignIn: true });
    expect(tutorRegistrationConflictField("email-taken")).toEqual({ field: "email", offerSignIn: true });
    expect(tutorRegistrationConflictField("email-other-role")).toEqual({ field: "email", offerSignIn: false });
  });
});
