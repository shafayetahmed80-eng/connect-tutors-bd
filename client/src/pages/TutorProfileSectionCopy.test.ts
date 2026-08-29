import { describe, expect, it } from "vitest";

import { tutorProfileSectionCopy } from "./TutorProfileSectionCopy";

describe("tutorProfileSectionCopy", () => {
  it("uses one concise English helper for each Tutor Profile section", () => {
    expect(tutorProfileSectionCopy).toEqual({
      identity: "Professional details for profile review.",
      location: "Your base location and teaching areas.",
      expertise: "Your education, subjects, and learner levels.",
      tuition: "Your teaching formats, learners, and availability.",
      fees: "Your monthly fee and travel preferences.",
      communication: "Your teaching and contact preferences.",
      about:
        "Optional teaching-style details. Do not add sensitive personal or student information.",
    });
  });
});
