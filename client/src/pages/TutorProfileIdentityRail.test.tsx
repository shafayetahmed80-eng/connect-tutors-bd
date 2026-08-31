// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorProfileIdentityRail, formatTutorProfileLastUpdated } from "./TutorProfileIdentityRail";
import { getTutorProfileStatusCard } from "./TutorProfileStatusCard";

afterEach(() => cleanup());

const incompleteStatus = getTutorProfileStatusCard({
  profileStatus: "draft",
  completionPercentage: 48,
  completed: false,
  missingCount: 14,
  firstMissingLabel: "Profile Photo",
  isDraftDirty: false,
});

const readyStatus = getTutorProfileStatusCard({
  profileStatus: "draft",
  completionPercentage: 100,
  completed: true,
  missingCount: 0,
  firstMissingLabel: null,
  isDraftDirty: false,
});

function renderRail(overrides: Partial<React.ComponentProps<typeof TutorProfileIdentityRail>> = {}) {
  const props: React.ComponentProps<typeof TutorProfileIdentityRail> = {
    name: "Tania Sultana",
    tutorNumber: 565462,
    profileStatus: "draft",
    lastUpdatedAt: "2026-08-19T09:30:00.000Z",
    photoUrl: null,
    photoPreviewFailed: false,
    photoError: undefined,
    uploadingPhoto: false,
    photoInputRef: { current: null },
    onSelectPhoto: vi.fn(),
    onRemovePhoto: vi.fn(),
    onPhotoPreviewError: vi.fn(),
    completionPercentage: 48,
    statusCard: incompleteStatus,
    actionPending: false,
    submitting: false,
    onAction: vi.fn(),
    universityName: "Dhaka University",
    subjectName: "Physics",
    previewMode: false,
    onTogglePreview: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<TutorProfileIdentityRail {...props} />) };
}

describe("TutorProfileIdentityRail", () => {
  it("shows identity, Tutor ID, completion and the latest institute", () => {
    renderRail();
    const rail = screen.getByRole("region", { name: "Profile summary" });

    expect(within(rail).getByRole("heading", { name: "Tania Sultana" })).toBeTruthy();
    expect(within(rail).getByText("Tutor ID: 565462")).toBeTruthy();
    expect(within(rail).getByText(/^Draft · saved /)).toBeTruthy();
    expect(within(rail).getByText("Profile completed: 48%")).toBeTruthy();
    expect(within(rail).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("48");
    expect(within(rail).getByText("Dhaka University")).toBeTruthy();
    expect(within(rail).getByText("Physics")).toBeTruthy();
  });

  it("marks an unset institute and subject as missing", () => {
    renderRail({ universityName: "", subjectName: "" });
    expect(screen.getAllByText("Not given")).toHaveLength(2);
  });

  it("runs the state-aware action from the status card", () => {
    const onAction = vi.fn();
    renderRail({ onAction });

    fireEvent.click(screen.getByRole("button", { name: "Complete profile" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("switches the action label once the profile is ready to submit", () => {
    renderRail({ statusCard: readyStatus, completionPercentage: 100 });
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeTruthy();
  });

  it("hides the state-aware action while the profile is under review", () => {
    renderRail({
      completionPercentage: 100,
      statusCard: getTutorProfileStatusCard({
        profileStatus: "pending",
        completionPercentage: 100,
        completed: true,
        missingCount: 0,
        firstMissingLabel: null,
        isDraftDirty: false,
      }),
    });

    expect(screen.queryByRole("button", { name: /Complete profile|Submit for review|Save changes/ })).toBeNull();
    // The rail still identifies the tutor and its completion while under review.
    expect(screen.getByText("Profile completed: 100%")).toBeTruthy();
    expect(screen.getByRole("button", { name: "View Profile" })).toBeTruthy();
  });

  it("asks for a photo when none is set and offers replace or remove once it is", () => {
    const { unmount } = renderRail();
    expect(screen.getByText("Add photo · required")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Upload photo" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Remove photo" })).toBeNull();
    expect(screen.queryByAltText("Current Tutor profile photo")).toBeNull();
    unmount();

    const onRemovePhoto = vi.fn();
    renderRail({ photoUrl: "https://example.test/photo.jpg", onRemovePhoto });
    expect(screen.getByAltText("Current Tutor profile photo").getAttribute("src")).toBe("https://example.test/photo.jpg");
    expect(screen.getByRole("button", { name: "Replace photo" })).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Remove photo" }));
    expect(onRemovePhoto).toHaveBeenCalledOnce();
  });

  it("flags a missing photo on the upload input so the error scroll can find it", () => {
    renderRail({ photoError: "Upload a profile photo." });

    expect(screen.getByLabelText("Upload Tutor profile photo").getAttribute("aria-invalid")).toBe("true");
    expect(screen.getByRole("alert").textContent).toBe("Upload a profile photo.");
  });

  it("toggles between View Profile and Edit Information", () => {
    const onTogglePreview = vi.fn();
    const { unmount } = renderRail({ onTogglePreview });
    fireEvent.click(screen.getByRole("button", { name: "View Profile" }));
    expect(onTogglePreview).toHaveBeenCalledOnce();
    unmount();

    renderRail({ previewMode: true });
    expect(screen.getByRole("button", { name: "Edit Information" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: "View Profile" })).toBeNull();
  });

  it("formatTutorProfileLastUpdated handles empty and invalid values", () => {
    expect(formatTutorProfileLastUpdated(null)).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated("")).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated("nonsense")).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated(new Date("2026-08-18T10:30:00.000Z"))).toBe(new Date("2026-08-18T10:30:00.000Z").toLocaleString());
  });
});
