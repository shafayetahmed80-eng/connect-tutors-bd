import { describe, expect, it } from "vitest";
import { isTutorCvDraft } from "./tutor-cv-status";

describe("a draft Tutor CV", () => {
  it("is the CV of a profile still in draft, with changes asked for, or suspended", () => {
    expect(isTutorCvDraft("draft")).toBe(true);
    expect(isTutorCvDraft("changes_requested")).toBe(true);
    expect(isTutorCvDraft("suspended")).toBe(true);
    expect(isTutorCvDraft("")).toBe(true);
    expect(isTutorCvDraft(null)).toBe(true);
    expect(isTutorCvDraft(undefined)).toBe(true);
  });

  it("is not the CV of an approved, pending or verified profile", () => {
    expect(isTutorCvDraft("approved")).toBe(false);
    expect(isTutorCvDraft("pending")).toBe(false);
    expect(isTutorCvDraft("submitted")).toBe(false);
    expect(isTutorCvDraft("verified")).toBe(false);
    expect(isTutorCvDraft(" Approved ")).toBe(false);
  });

  it("is not a draft's once a Tutor is verified, whatever the profile says", () => {
    expect(isTutorCvDraft("draft", true)).toBe(false);
    expect(isTutorCvDraft(null, true)).toBe(false);
  });
});
