import { describe, expect, it, vi } from "vitest";
import { getTutorProfileWizardStepForErrors, scrollToTutorProfileSection, tutorProfileWizardSteps } from "./TutorProfileWizard";

describe("Tutor Profile mobile wizard", () => {
  it("defines the four sections in the intended order", () => {
    expect(tutorProfileWizardSteps.map(step => step.title)).toEqual([
      "Personal Information",
      "Education and expertise",
      "Tuition, location and communication",
      "Introduction and review",
    ]);
  });

  it("opens the first section that contains a submission error", () => {
    expect(getTutorProfileWizardStepForErrors({ profilePhotoUrl: "Add a profile photo.", currentLocationId: "Select your current location." })).toBe(0);
    expect(getTutorProfileWizardStepForErrors({ universityId: "Select your institute." })).toBe(1);
    expect(getTutorProfileWizardStepForErrors({ currentLocationId: "Select your current location." })).toBe(2);
    expect(getTutorProfileWizardStepForErrors({ feeMax: "Enter a maximum monthly fee." })).toBe(2);
    expect(getTutorProfileWizardStepForErrors({ communicationPreferences: "Select at least one communication preference." })).toBe(2);
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
