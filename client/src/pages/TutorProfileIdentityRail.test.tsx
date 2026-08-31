// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorProfileIdentityRail } from "./TutorProfileIdentityRail";

afterEach(() => cleanup());

function renderRail(overrides: Partial<React.ComponentProps<typeof TutorProfileIdentityRail>> = {}) {
  const props: React.ComponentProps<typeof TutorProfileIdentityRail> = {
    name: "Tania Sultana",
    tutorNumber: 565462,
    photoUrl: null,
    photoPreviewFailed: false,
    photoError: undefined,
    uploadingPhoto: false,
    photoInputRef: { current: null },
    onSelectPhoto: vi.fn(),
    onRemovePhoto: vi.fn(),
    onPhotoPreviewError: vi.fn(),
    completionPercentage: 48,
    email: "tania@example.test",
    phone: "+8801700000000",
    address: "House 4, Dhanmondi, Dhaka",
    universityName: "Dhaka University",
    subjectName: "Physics",
    previewMode: false,
    onTogglePreview: vi.fn(),
    ...overrides,
  };
  return { props, ...render(<TutorProfileIdentityRail {...props} />) };
}

describe("TutorProfileIdentityRail", () => {
  it("shows identity, Tutor ID, completion, contact details and the latest institute", () => {
    renderRail();
    const rail = screen.getByRole("region", { name: "Profile summary" });

    expect(within(rail).getByRole("heading", { name: "Tania Sultana" })).toBeTruthy();
    expect(within(rail).getByText("Tutor ID: 565462")).toBeTruthy();
    expect(within(rail).getByText("Profile completed: 48%")).toBeTruthy();

    for (const [label, value] of [
      ["Email", "tania@example.test"],
      ["Phone Number", "+8801700000000"],
      ["Address", "House 4, Dhanmondi, Dhaka"],
      ["Institute", "Dhaka University"],
      ["Department / subject", "Physics"],
    ] as const) {
      expect(within(rail).getByText(label)).toBeTruthy();
      expect(within(rail).getByText(value)).toBeTruthy();
    }
  });

  it("carries no completion action button — the rail is identity only", () => {
    renderRail();
    expect(screen.queryByRole("button", { name: /Complete profile|Submit for review|Save changes/ })).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("marks unset contact and education details as missing", () => {
    renderRail({ email: "", phone: "", address: "", universityName: "", subjectName: "" });
    expect(screen.getAllByText("Not given")).toHaveLength(5);
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
});
