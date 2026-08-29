import { describe, expect, it, vi } from "vitest";
import { getTutorProfileWizardStepForErrors, scrollToTutorProfileSection, tutorProfileWizardSteps } from "./TutorProfileWizard";

describe("Tutor Profile mobile wizard", () => {
  it("defines the approved five mobile steps in the intended order", () => {
    expect(tutorProfileWizardSteps.map(step => step.title)).toEqual([
      "Identity and photo",
      "Location",
      "Education and expertise",
      "Tuition preferences and fee",
      "Communication, profile, and review",
    ]);
  });

  it("opens the first mobile step that contains a submission error", () => {
    expect(getTutorProfileWizardStepForErrors({ profilePhotoUrl: "Add a profile photo.", currentLocationId: "Select your current location." })).toBe(0);
    expect(getTutorProfileWizardStepForErrors({ currentLocationId: "Select your current location." })).toBe(1);
    expect(getTutorProfileWizardStepForErrors({ universityId: "Select your institute." })).toBe(2);
    expect(getTutorProfileWizardStepForErrors({ feeMax: "Enter a maximum monthly fee." })).toBe(3);
    expect(getTutorProfileWizardStepForErrors({ communicationPreferences: "Select at least one communication preference." })).toBe(4);
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
