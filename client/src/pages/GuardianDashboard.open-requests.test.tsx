// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { GuardianOpenRequestsPanel } from "./GuardianDashboard";

afterEach(cleanup);

const requests = [
  { id: 11, status: "new", nextAction: "none", category: "English Medium", classCourse: "Standard 2", createdAt: new Date("2026-08-15T00:00:00.000Z") },
  { id: 12, status: "reviewing", nextAction: "none", category: "Bangla Medium", classCourse: "Class 8", createdAt: new Date("2026-08-16T00:00:00.000Z") },
  { id: 13, status: "matched", nextAction: "decide_contact_consent", category: "English Version", classCourse: "Class 6", createdAt: new Date("2026-08-17T00:00:00.000Z") },
  { id: 14, status: "closed", nextAction: "none", category: "Admission", classCourse: "HSC", createdAt: new Date("2026-08-18T00:00:00.000Z") },
];

describe("Guardian Dashboard Open Requests", () => {
  it("shows up to three current Guardian-owned requests with exactly one status-based action per request", () => {
    render(<GuardianOpenRequestsPanel requests={requests} isLoading={false} hasError={false} onRetry={vi.fn()} />);

    const list = screen.getByRole("region", { name: "Open requests" });
    expect(within(list).getByText(/Request #11 · Submitted/i)).toBeTruthy();
    expect(within(list).getByText(/Request #12 · Coordinator reviewing/i)).toBeTruthy();
    expect(within(list).getByText(/Request #13 · Tutor match confirmed/i)).toBeTruthy();
    expect(within(list).queryByText(/Request #14/)).toBeNull();
    expect(within(list).getAllByRole("link", { name: "Review request" })).toHaveLength(2);
    expect(within(list).getByRole("link", { name: "Decide coordination" }).getAttribute("href")).toBe("/guardian/dashboard/posted-jobs");
    expect(within(list).queryByText(/phone number/i)).toBeNull();
    expect(within(list).getAllByRole("link")).toHaveLength(3);
  });

  it("shows a focused empty state with one safe action when no Guardian request exists", () => {
    render(<GuardianOpenRequestsPanel requests={[]} isLoading={false} hasError={false} onRetry={vi.fn()} />);

    const list = screen.getByRole("region", { name: "Open requests" });
    expect(within(list).getByText("No open requests yet")).toBeTruthy();
    expect(within(list).getByRole("link", { name: "Hire a tutor" }).getAttribute("href")).toBe("/guardian/dashboard/hire");
  });

  it("offers a retry control instead of stale request data when the private query fails", () => {
    render(<GuardianOpenRequestsPanel requests={[]} isLoading={false} hasError onRetry={vi.fn()} />);

    const list = screen.getByRole("region", { name: "Open requests" });
    expect(within(list).getByText("We could not load your requests")).toBeTruthy();
    expect(within(list).getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
