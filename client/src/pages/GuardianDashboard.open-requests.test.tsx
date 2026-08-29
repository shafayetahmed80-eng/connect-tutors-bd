// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requestQuery: {
    data: [
      { id: 11, status: "new", nextAction: "none", category: "English Medium", classCourse: "Standard 2", createdAt: new Date("2026-08-15T00:00:00.000Z") },
      { id: 12, status: "reviewing", nextAction: "none", category: "Bangla Medium", classCourse: "Class 8", createdAt: new Date("2026-08-16T00:00:00.000Z") },
      { id: 13, status: "matched", nextAction: "decide_contact_consent", category: "English Version", classCourse: "Class 6", createdAt: new Date("2026-08-17T00:00:00.000Z") },
      { id: 14, status: "closed", nextAction: "none", category: "Admission", classCourse: "HSC", createdAt: new Date("2026-08-18T00:00:00.000Z") },
    ] as Array<Record<string, unknown>>,
    isLoading: false,
    error: null as Error | null,
    refetch: vi.fn(),
  },
  profile: { name: "Rina Akter", email: "rina@example.test", guardianId: "GDN-9H4K-2M8Q", locationId: "mirpur", accountCreatedAt: new Date("2026-08-01T00:00:00.000Z") },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Rina Akter", email: "rina@example.test", role: "guardian" } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    guardianProfile: {
      me: { useQuery: () => ({ data: mocks.profile, isLoading: false }) },
      photo: { useQuery: () => ({ data: { photoStatus: "no_photo", photoUrl: null }, isLoading: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      changePassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    locations: { list: { useQuery: () => ({ data: [] }) } },
    tutorRequests: { mine: { useQuery: () => mocks.requestQuery } },
    useUtils: () => ({ guardianProfile: { me: { invalidate: vi.fn() }, photo: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("./GuardianRequestTracking", () => ({ GuardianRequestTracking: () => <div /> }));

import { GuardianDashboardContent } from "./GuardianDashboard";

afterEach(() => {
  cleanup();
  mocks.requestQuery.data = [];
  mocks.requestQuery.isLoading = false;
  mocks.requestQuery.error = null;
});

describe("Guardian Dashboard Open Requests", () => {
  it("shows up to three current Guardian-owned requests with exactly one status-based action per request", () => {
    mocks.requestQuery.data = [
      { id: 11, status: "new", nextAction: "none", category: "English Medium", classCourse: "Standard 2", createdAt: new Date("2026-08-15T00:00:00.000Z") },
      { id: 12, status: "reviewing", nextAction: "none", category: "Bangla Medium", classCourse: "Class 8", createdAt: new Date("2026-08-16T00:00:00.000Z") },
      { id: 13, status: "matched", nextAction: "decide_contact_consent", category: "English Version", classCourse: "Class 6", createdAt: new Date("2026-08-17T00:00:00.000Z") },
      { id: 14, status: "closed", nextAction: "none", category: "Admission", classCourse: "HSC", createdAt: new Date("2026-08-18T00:00:00.000Z") },
    ];

    render(<GuardianDashboardContent />);

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
    mocks.requestQuery.data = [];
    render(<GuardianDashboardContent />);

    const list = screen.getByRole("region", { name: "Open requests" });
    expect(within(list).getByText("No open requests yet")).toBeTruthy();
    expect(within(list).getByRole("link", { name: "Hire a tutor" }).getAttribute("href")).toBe("/guardian/dashboard/hire");
  });

  it("offers a retry control instead of stale request data when the private query fails", () => {
    mocks.requestQuery.error = new Error("Request history unavailable");
    render(<GuardianDashboardContent />);

    const list = screen.getByRole("region", { name: "Open requests" });
    expect(within(list).getByText("We could not load your requests")).toBeTruthy();
    expect(within(list).getByRole("button", { name: "Try again" })).toBeTruthy();
  });
});
