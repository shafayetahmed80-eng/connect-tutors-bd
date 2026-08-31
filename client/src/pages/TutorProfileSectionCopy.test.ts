import { describe, expect, it } from "vitest";

import { tutorProfileSectionCopy } from "./TutorProfileSectionCopy";

describe("tutorProfileSectionCopy", () => {
  it("uses one concise English helper for each of the five Tutor Profile sections", () => {
    expect(tutorProfileSectionCopy).toEqual({
      identity: "Your core identity, private address, and contact details.",
      family: "Private family and emergency contact details for verification.",
      education: "Your education, qualifications, subjects, learner levels, and teaching expertise.",
      teaching: "How and where you teach: format, coverage, fee, languages, and contact preferences.",
      introduction: "Optional teaching-style details, then submit your profile for review.",
    });
  });
});
