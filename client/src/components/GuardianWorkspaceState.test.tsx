// @vitest-environment jsdom

import React from "react";
import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { GuardianWorkspaceSkeleton, GuardianWorkspaceState } from "./GuardianWorkspaceState";

describe("GuardianWorkspaceState", () => {
  it("exposes an accessible loading status and busy state", () => {
    render(<GuardianWorkspaceState kind="loading" />);
    const status = screen.getByRole("status");
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(screen.getByText("Loading your private workspace")).toBeTruthy();
  });

  it("renders a labeled shimmer skeleton as a busy status", () => {
    render(<GuardianWorkspaceSkeleton label="Loading Guardian profile" />);
    const status = screen.getByRole("status", { name: "Loading Guardian profile" });
    expect(status.getAttribute("aria-busy")).toBe("true");
    expect(status.querySelectorAll(".animate-pulse").length).toBe(3);
  });

  it("provides a retry action for recoverable errors", () => {
    const onRetry = vi.fn();
    render(<GuardianWorkspaceState kind="error" onRetry={onRetry} />);
    fireEvent.click(screen.getByRole("button", { name: "Try again" }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("uses an honest planned-state message without presenting fake data", () => {
    render(<GuardianWorkspaceState kind="planned" />);
    expect(screen.getByRole("heading", { name: "Coming soon" })).toBeTruthy();
    expect(screen.getByText(/privacy rules are ready/i)).toBeTruthy();
  });
});
