import { describe, expect, it } from "vitest";
import { getTutorProfileStatusCard } from "./TutorProfileStatusCard";

describe("getTutorProfileStatusCard", () => {
  const completeDraft = {
    profileStatus: "draft" as const,
    completionPercentage: 100,
    completed: true,
    missingCount: 0,
    firstMissingLabel: null,
    isDraftDirty: false,
  };

  it("shows one next action for an incomplete profile without exposing submission", () => {
    expect(getTutorProfileStatusCard({
      ...completeDraft,
      completionPercentage: 62,
      completed: false,
      missingCount: 3,
      firstMissingLabel: "Teaching areas",
    })).toMatchObject({
      title: "Complete your profile",
      action: "complete",
      actionLabel: "Complete profile",
      showProgress: true,
    });
  });

  it("guides a complete saved draft to submit for review", () => {
    expect(getTutorProfileStatusCard(completeDraft)).toMatchObject({
      title: "Ready for review",
      action: "submit",
      actionLabel: "Submit for review",
    });
  });

  it("requires unsaved edits to be saved before submitting", () => {
    expect(getTutorProfileStatusCard({ ...completeDraft, isDraftDirty: true })).toMatchObject({
      action: "save",
      actionLabel: "Save changes",
    });
  });

  it("keeps pending and approved profiles read-only rather than exposing another submission action", () => {
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "pending" })).toMatchObject({
      title: "Profile under review",
      action: "none",
    });
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "approved" })).toMatchObject({
      title: "Profile approved",
      action: "none",
    });
  });

  it("uses the status card as the selected-tuition feedback anchor without auto-applying", () => {
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "approved", hasSelectedTuitionReturn: true })).toMatchObject({
      title: "Ready to apply",
      description: "Your profile is approved. Return to the selected tuition and click Apply Now yourself.",
      action: "return",
      actionLabel: "Return to selected tuition",
    });
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "pending", hasSelectedTuitionReturn: true })).toMatchObject({
      title: "Profile under review",
      description: "Admin approval is required before you can return to the selected tuition and choose Apply Now yourself.",
      action: "none",
    });
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "changes_requested", hasSelectedTuitionReturn: true })).toMatchObject({
      title: "Updates requested",
      description: "Your revised profile is ready. Submit the updates for another Admin review. Your selected tuition remains saved until approval.",
      action: "submit",
    });
  });

  it("lets Tutors resubmit requested updates only after changes are saved", () => {
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "changes_requested" })).toMatchObject({
      title: "Updates requested",
      action: "submit",
      actionLabel: "Submit updates",
    });
    expect(getTutorProfileStatusCard({ ...completeDraft, profileStatus: "changes_requested", isDraftDirty: true })).toMatchObject({
      action: "save",
      actionLabel: "Save changes",
    });
  });
});
