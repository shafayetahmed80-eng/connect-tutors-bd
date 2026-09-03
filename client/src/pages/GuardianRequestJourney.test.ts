import { describe, expect, it } from "vitest";
import {
  getGuardianRequestJourneyPresentation,
  getGuardianRequestStepValidation,
  guardianAccountPolicyLinks,
  guardianRequestSteps,
} from "./GuardianRequestJourney";

const completeLearningInput = {
  category: "Bangla Medium",
  classCourse: "Class 9–10",
  selectedSubjects: ["Mathematics"],
  tuitionType: "online" as const,
  tuitionCityLocationId: "",
  tuitionLocationId: "",
  studentCount: "1",
  daysPerWeek: "3",
  preferredGender: "any" as const,
  instituteName: "", heardAboutUs: "facebook" as const, salaryAmount: "5000",
};

describe("Guardian request validation feedback", () => {
  it("uses English-first named request sub-steps for the guided Guardian journey", () => {
    expect(guardianRequestSteps).toEqual(["Learning needs", "Tuition preferences", "Confirmation"]);
  });

  it("provides clear English recovery guidance for the first missing learning-need field", () => {
    expect(getGuardianRequestStepValidation({ ...completeLearningInput, category: "" }, 1)).toBe(
      "Choose a curriculum or category to continue.",
    );
  });

  it("does not ask an online tuition request for an exact physical location", () => {
    expect(getGuardianRequestStepValidation(completeLearningInput, 2)).toBeNull();
  });

  it("requires both City and area for every physical tutoring option", () => {
    expect(getGuardianRequestStepValidation({ ...completeLearningInput, tuitionType: "home" }, 2)).toBe(
      "Choose a City and a location for Home, Group, or Package Tutoring.",
    );
    expect(getGuardianRequestStepValidation({ ...completeLearningInput, tuitionType: "group" }, 2)).toBe(
      "Choose a City and a location for Home, Group, or Package Tutoring.",
    );
    expect(getGuardianRequestStepValidation({ ...completeLearningInput, tuitionType: "package" }, 2)).toBe(
      "Choose a City and a location for Home, Group, or Package Tutoring.",
    );
    expect(getGuardianRequestStepValidation({ ...completeLearningInput, tuitionType: "both" }, 2)).toBe(
      "Choose a City and a location for Home, Group, or Package Tutoring.",
    );
  });
});

describe("Guardian account policy links", () => {
  it("uses the established public Terms and Privacy destinations used across the site", () => {
    expect(guardianAccountPolicyLinks).toEqual([
      { label: "Terms of Use", href: "/terms-conditions" },
      { label: "Privacy Policy", href: "/privacy-policy" },
    ]);
  });
});

describe("Guardian request embedded dashboard mode", () => {
  it("removes public chrome when the journey is rendered inside the Guardian panel", () => {
    expect(getGuardianRequestJourneyPresentation({ embedded: true })).toEqual({
      showPublicChrome: false,
      rootClassName: "bg-transparent text-j-ink",
    });
  });

  it("keeps the public visitor journey wrapped in its site shell", () => {
    expect(getGuardianRequestJourneyPresentation({ embedded: false })).toEqual({
      showPublicChrome: true,
      rootClassName: "site-page min-h-screen bg-j-page text-j-ink",
    });
  });

});
