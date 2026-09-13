// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const base = {
  category: "English Version",
  classCourse: "Class 8",
  subjects: JSON.stringify(["History"]),
  tuitionType: "home",
  daysPerWeek: 3,
  groupCapacity: null,
  packageDurationMonths: null,
  studentCount: 1,
  preferredGender: "female",
  studentGender: "female",
  notes: null,
  budgetAmount: 5000,
  tuitionLocationLabel: "Banasree, Dhaka",
  tutorId: null,
  appointmentConfirmedAt: null,
  cancellationReason: null,
  createdAt: new Date("2026-09-06T00:00:00.000Z"),
};

const mocks = vi.hoisted(() => ({ requests: [] as unknown[] }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tutorRequests: { mine: { useQuery: () => ({ data: mocks.requests, isLoading: false, error: null, refetch: vi.fn() }) } },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { GuardianRequestTracking } from "./GuardianRequestTracking";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Applied Tutors on the Guardian's Posted jobs board", () => {
  it("counts the applicants on a live tuition, on the card and in the dialog", async () => {
    mocks.requests = [{ ...base, id: 13, status: "new", publicationState: "published", appliedTutorCount: 7 }];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    const card = screen.getByRole("button", { name: /Job ID 6812/ });
    const link = within(card).getByRole("link", { name: /Applied Tutors/ });
    expect(link.textContent).toContain("(7)");
    expect(link.getAttribute("href")).toBe("/guardian/dashboard/applied-tutors/13");

    await user.click(card);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: /Applied Tutors/ })).toBeTruthy();
  });

  it("shows nothing to apply to while the tuition is still Pending", () => {
    // Before it reaches the Job Board no Tutor can have seen it, so there is no
    // count to show and nowhere for the link to go.
    mocks.requests = [{ ...base, id: 14, status: "new", publicationState: "submitted", appliedTutorCount: 0 }];
    render(<GuardianRequestTracking embedded />);

    expect(screen.getByRole("button", { name: /Job ID 6813/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Applied Tutors/ })).toBeNull();
  });

  it("keeps the list open once a Tutor is Appointed, and closes it once Confirmed", async () => {
    mocks.requests = [
      { ...base, id: 15, status: "matched", publicationState: "published", tutorId: "tutor-175", appliedTutorCount: 3 },
      { ...base, id: 16, status: "matched", publicationState: "published", tutorId: "tutor-175", appointmentConfirmedAt: new Date("2026-09-10T00:00:00.000Z"), appliedTutorCount: 3 },
    ];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("tab", { name: /Appointed/ }));
    const card = screen.getByRole("button", { name: /Job ID 6814/ });
    expect(within(card).getByRole("link", { name: /Applied Tutors/ }).getAttribute("href")).toBe("/guardian/dashboard/applied-tutors/15");

    await user.click(screen.getByRole("tab", { name: /Confirmed/ }));
    expect(screen.getByRole("button", { name: /Job ID 6815/ })).toBeTruthy();
    expect(screen.queryByRole("link", { name: /Applied Tutors/ })).toBeNull();
  });
});
