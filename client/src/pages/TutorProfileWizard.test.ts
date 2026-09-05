import { describe, expect, it, vi } from "vitest";
import { getTutorProfileWizardStepForErrors, scrollToTutorProfileSection, tutorProfileWizardSteps } from "./TutorProfileWizard";

describe("Tutor Profile mobile wizard", () => {
  it("defines the four sections in the intended order", () => {
    expect(tutorProfileWizardSteps.map(step => step.title)).toEqual([
      "Personal Information",
      "Education",
      "Tuition and location",
      "Introduction and review",
    ]);
  });

  it("opens the first section that contains a submission error", () => {
    expect(getTutorProfileWizardStepForErrors({ profilePhotoUrl: "Add a profile photo.", currentLocationId: "Select your current location." })).toBe(0);
    expect(getTutorProfileWizardStepForErrors({ universityId: "Select your institute." })).toBe(1);
    expect(getTutorProfileWizardStepForErrors({ currentLocationId: "Select your current location." })).toBe(2);
    expect(getTutorProfileWizardStepForErrors({ feeMax: "Enter a maximum monthly fee." })).toBe(2);
  });

  it("sends a missing Teaching expertise field to the section it now lives in", () => {
    // These five moved out of Education into Tuition and location; step 1's
    // popup no longer holds them, so an error there must open step 2.
    for (const key of ["primarySubjectIds", "additionalSubjectIds", "classLevelIds", "curriculumIds", "teachingExperienceYears"] as const) {
      expect(getTutorProfileWizardStepForErrors({ [key]: "Required." }), key).toBe(2);
    }
    // Education keeps its own fields.
    expect(getTutorProfileWizardStepForErrors({ degreeExamTitle: "Enter your degree or exam title." })).toBe(1);
  });

  it("does not force a step change when no field error exists", () => {
    expect(getTutorProfileWizardStepForErrors({})).toBeNull();
  });

  it("scrolls the selected desktop navigation item to its Profile section anchor", () => {
    const scrollIntoView = vi.fn();
    const getElementById = vi.fn(() => ({ scrollIntoView }));

    scrollToTutorProfileSection("academic", { getElementById });

    expect(getElementById).toHaveBeenCalledWith("academic");
    expect(scrollIntoView).toHaveBeenCalledWith({ behavior: "smooth", block: "start" });
  });
});
