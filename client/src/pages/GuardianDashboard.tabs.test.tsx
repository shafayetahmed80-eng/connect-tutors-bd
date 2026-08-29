// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requests: [{ id: 41, status: "reviewing" }],
  profile: {
    name: "Rina Akter",
    email: "rina@example.test",
    guardianId: "GDN-9H4K-2M8Q",
    phone: "+8801712345678",
    gender: "female",
    cityLocationId: "dhaka",
    locationId: "mirpur",
    accountCreatedAt: new Date("2026-08-01T00:00:00.000Z"),
  },
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Rina Akter", email: "rina@example.test", role: "guardian" } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    guardianProfile: {
      me: { useQuery: () => ({ data: mocks.profile, isLoading: false }) },
      photo: { useQuery: () => ({ data: { photoStatus: "no_photo", photoUrl: null, rejectionReason: null, moderationNote: null }, isLoading: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      changePassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    locations: { list: { useQuery: () => ({ data: [{ id: "dhaka", type: "city", label: "Dhaka" }, { id: "mirpur", type: "area", parentId: "dhaka", label: "Mirpur" }] }) } },
    tutorRequests: { mine: { useQuery: () => ({ data: mocks.requests, isLoading: false }) } },
    useUtils: () => ({ guardianProfile: { me: { invalidate: vi.fn() }, photo: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("./GuardianRequestTracking", () => ({
  GuardianRequestTracking: ({ embedded }: { embedded?: boolean }) => <section data-testid="guardian-request-tracking">{embedded ? "Embedded private request history" : "Standalone request history"}</section>,
}));

import { GuardianDashboardContent } from "./GuardianDashboard";

afterEach(cleanup);

describe("Guardian dashboard working tabs", () => {
  it("embeds Guardian-owned request tracking under Posted jobs without public job detail claims", () => {
    render(<GuardianDashboardContent section="posted-jobs" />);

    expect(screen.getByRole("heading", { name: "Posted jobs" })).toBeTruthy();
    expect(screen.getByTestId("guardian-request-tracking").textContent).toContain("Embedded private request history");
    expect(screen.getByText(/never reveal your phone, email, exact address, student identity, or notes/i)).toBeTruthy();
  });

  it("shows a truthful Attendance deferral when no Tutor match is confirmed", () => {
    render(<GuardianDashboardContent section="attendance" />);

    expect(screen.getByRole("heading", { name: "Attendance" })).toBeTruthy();
    expect(screen.getByText("Available after a Tutor is confirmed")).toBeTruthy();
    expect(screen.getByText(/does not show attendance schedules, percentages, payments, or session records/i)).toBeTruthy();
  });

  it("does not invent attendance records after a confirmed match", () => {
    mocks.requests = [{ id: 42, status: "matched" }];
    render(<GuardianDashboardContent section="attendance" />);

    expect(screen.getByText("Attendance setup is not available yet")).toBeTruthy();
    expect(screen.getByText(/does not create an attendance schedule, percentage, payment record, or session log/i)).toBeTruthy();
  });

  it("renders controlled Profile fields without presenting email or phone as editable", () => {
    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByRole("heading", { name: "Profile" })).toBeTruthy();
    expect(screen.getByDisplayValue("GDN-9H4K-2M8Q")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save profile" })).toBeTruthy();
    expect(screen.getByText(/email and mobile remain protected login\/contact details/i)).toBeTruthy();
  });

  it("renders current-password settings and truthful process guidance", () => {
    const { rerender } = render(<GuardianDashboardContent section="settings" />);
    expect(screen.getByLabelText("Current password")).toBeTruthy();
    expect(screen.getByText(/phone and email changes require support-assisted verification/i)).toBeTruthy();

    rerender(<GuardianDashboardContent section="how-it-works" />);
    expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
    expect(screen.getByText("Job Board publication")).toBeTruthy();
    expect(screen.getByText(/phone, email, exact address, student identity, and notes are never public/i)).toBeTruthy();
  });

  it("maps a reviewing request to coordinator progress without claiming a match", () => {
    mocks.requests = [{ id: 41, status: "reviewing" }];
    render(<GuardianDashboardContent />);

    expect(screen.getByText(/Request #41 · Coordinator reviewing/i)).toBeTruthy();
    expect(screen.getByText(/may contact you to confirm details/i)).toBeTruthy();
  });
});
