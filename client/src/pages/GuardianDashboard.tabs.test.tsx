// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
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
      // Content overrides and notice blocks are cosmetic; empty lists keep the
      // copy and layout the code ships with.
      siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
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

vi.mock("@/pages/GuardianRequestJourney", () => ({
  default: ({ embedded }: { embedded?: boolean }) => <div data-testid="guardian-request-journey">{embedded ? "Embedded hire journey" : "Standalone hire journey"}</div>,
}));

import { GuardianDashboardContent } from "./GuardianDashboard";

afterEach(cleanup);

describe("Guardian dashboard working tabs", () => {
  it("embeds Guardian-owned request tracking under Posted jobs without public job detail claims", () => {
    render(<GuardianDashboardContent section="posted-jobs" />);

    expect(screen.getByRole("heading", { name: "Posted jobs" })).toBeTruthy();
    expect(screen.getByTestId("guardian-request-tracking").textContent).toContain("Embedded private request history");
  });

  it("opens Hire a tutor as a sheet with the Posted jobs list waiting behind it", () => {
    render(<GuardianDashboardContent section="hire" />);

    // The list sits behind the sheet, so dismissing the sheet lands the
    // Guardian on the tab where the new request will appear.
    expect(screen.getByRole("heading", { name: "Posted jobs" })).toBeTruthy();
    expect(screen.getByTestId("guardian-request-tracking").textContent).toContain("Embedded private request history");

    // The journey rides inside the dialog, not the page itself.
    const dialog = screen.getByRole("dialog", { name: "Hire a tutor" });
    expect(within(dialog).getByTestId("guardian-request-journey").textContent).toBe("Embedded hire journey");
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
    expect(screen.queryByText(/mobile or email change, contact support/i)).toBeNull();
  });

  it("renders current-password settings and keeps the support contact reachable", () => {
    const { rerender } = render(<GuardianDashboardContent section="settings" />);
    expect(screen.getByLabelText("Current password")).toBeTruthy();
    // The explanation went; the number a Guardian needs to change a phone or
    // email is the one thing on that card they cannot get anywhere else.
    expect(screen.getByRole("link", { name: "01516 131 411" })).toBeTruthy();
    expect(screen.queryByText(/require support-assisted verification/i)).toBeNull();

    rerender(<GuardianDashboardContent section="how-it-works" />);
    expect(screen.getByRole("heading", { name: "How it works" })).toBeTruthy();
    expect(screen.getByText("Job Board publication")).toBeTruthy();
    expect(screen.getByText(/phone, email, exact address, student identity, and notes are never public/i)).toBeTruthy();
  });

  it("renders the cleared Dashboard home without legacy hero, stat, or request cards", () => {
    render(<GuardianDashboardContent />);

    expect(screen.getByTestId("guardian-dashboard-home")).toBeTruthy();
    expect(screen.queryByRole("region", { name: "Open requests" })).toBeNull();
    expect(screen.queryByText(/Choose your next step/i)).toBeNull();
    expect(screen.queryByText(/Welcome,/i)).toBeNull();
  });
});
