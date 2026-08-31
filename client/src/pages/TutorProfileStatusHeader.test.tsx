// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TutorProfileStatusHeader, formatTutorProfileLastUpdated } from "./TutorProfileStatusHeader";
import { getTutorProfileStatusCard } from "./TutorProfileStatusCard";

afterEach(() => cleanup());

const baseInput = {
  profileStatus: "draft" as string | null | undefined,
  completionPercentage: 48,
  completed: false,
  missingCount: 14,
  firstMissingLabel: "Profile Photo",
  isDraftDirty: false,
};

describe("TutorProfileStatusHeader", () => {
  it("renders the state-aware action from the status card and calls onAction", () => {
    const onAction = vi.fn();
    render(<TutorProfileStatusHeader
      statusCard={getTutorProfileStatusCard(baseInput)}
      completionPercentage={48}
      photoUrl={null}
      profileStatus="draft"
      lastUpdatedAt="2026-08-19T00:00:00.000Z"
      submitting={false}
      actionPending={false}
      onAction={onAction}
    />);

    const region = screen.getByRole("region", { name: "Profile status" });
    expect(within(region).getByText("Complete your profile")).toBeTruthy();
    expect(within(region).getByText("Action needed")).toBeTruthy();
    expect(within(region).getByRole("progressbar").getAttribute("aria-valuenow")).toBe("48");

    fireEvent.click(within(region).getByRole("button", { name: "Complete profile" }));
    expect(onAction).toHaveBeenCalledOnce();
  });

  it("shows the profile status and last-saved caption", () => {
    render(<TutorProfileStatusHeader
      statusCard={getTutorProfileStatusCard({ ...baseInput, completed: true, missingCount: 0, firstMissingLabel: null })}
      completionPercentage={100}
      photoUrl={null}
      profileStatus="draft"
      lastUpdatedAt="2026-08-19T09:30:00.000Z"
      submitting={false}
      actionPending={false}
      onAction={vi.fn()}
    />);

    expect(screen.getByText("Ready for review")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Submit for review" })).toBeTruthy();
    expect(screen.getByText(/^Draft · saved /)).toBeTruthy();
  });

  it("hides the action and progress for a profile that is under review", () => {
    render(<TutorProfileStatusHeader
      statusCard={getTutorProfileStatusCard({ ...baseInput, profileStatus: "pending" })}
      completionPercentage={100}
      photoUrl={null}
      profileStatus="pending"
      lastUpdatedAt={null}
      submitting={false}
      actionPending={false}
      onAction={vi.fn()}
    />);

    expect(screen.getByText("Profile under review")).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("progressbar")).toBeNull();
  });

  it("swaps the label while the action is pending", () => {
    render(<TutorProfileStatusHeader
      statusCard={getTutorProfileStatusCard({ ...baseInput, completed: true, missingCount: 0, firstMissingLabel: null })}
      completionPercentage={100}
      photoUrl={null}
      profileStatus="draft"
      lastUpdatedAt={null}
      submitting={true}
      actionPending={true}
      onAction={vi.fn()}
    />);

    const button = screen.getByRole("button");
    expect(button.textContent).toContain("Submitting…");
    expect((button as HTMLButtonElement).disabled).toBe(true);
  });

  it("formatTutorProfileLastUpdated handles empty and invalid values", () => {
    expect(formatTutorProfileLastUpdated(null)).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated("")).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated("nonsense")).toBe("not saved yet");
    expect(formatTutorProfileLastUpdated(new Date("2026-08-18T10:30:00.000Z"))).toBe(new Date("2026-08-18T10:30:00.000Z").toLocaleString());
  });
});
