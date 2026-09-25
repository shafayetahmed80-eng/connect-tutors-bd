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

const mocks = vi.hoisted(() => ({ requests: [] as unknown[], send: vi.fn(), withdraw: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    tutorReviews: { mine: { useQuery: () => ({ data: [] }) }, mySummary: { useQuery: () => ({ data: undefined }) }, forTutor: { useQuery: () => ({ data: { summary: { average: null, count: 0 }, reviews: [] }, isLoading: false, isError: false }) }, save: { useMutation: () => ({ mutate: () => undefined, isPending: false }) } },
    useUtils: () => ({ tutorRequests: { appliedTutors: { invalidate: vi.fn() }, mine: { invalidate: vi.fn() } } }),
    tutorRequests: {
      mine: { useQuery: () => ({ data: mocks.requests, isLoading: false, error: null, refetch: vi.fn() }) },
      requestTuitionChange: { useMutation: () => ({ mutate: mocks.send, isPending: false }) },
      withdrawTuitionChange: { useMutation: () => ({ mutate: mocks.withdraw, isPending: false }) },
    },
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

describe("asking an Admin to cancel or remove, from the Posted jobs dialog", () => {
  const confirmed = { ...base, id: 16, status: "matched", publicationState: "published", tutorId: "tutor-175", appointmentConfirmedAt: new Date("2026-09-10T00:00:00.000Z"), appliedTutorCount: 3, tuitionRequest: null };

  it("offers Cancel Tuition on a Pending tuition, with a reason", async () => {
    mocks.requests = [{ ...base, id: 14, status: "new", publicationState: "submitted", appliedTutorCount: 0, tuitionRequest: null }];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("button", { name: /Job ID 6813/ }));
    const details = screen.getByRole("dialog");
    expect(within(details).queryByRole("button", { name: "Remove Tutor" })).toBeNull();
    await user.click(within(details).getByRole("button", { name: "Cancel Tuition" }));

    const ask = screen.getByRole("dialog", { name: "Ask to cancel Job ID 6813?" });
    await user.type(within(ask).getByRole("textbox"), "Found a tutor elsewhere");
    await user.click(within(ask).getByRole("button", { name: "Send request" }));
    expect(mocks.send).toHaveBeenCalledWith({ requestId: 14, type: "cancel_tuition", tutorId: undefined, reason: "Found a tutor elsewhere" }, expect.anything());
  });

  it("offers Remove Tutor once Confirmed, for the Tutor holding it", async () => {
    mocks.requests = [confirmed];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("tab", { name: /Confirmed/ }));
    await user.click(screen.getByRole("button", { name: /Job ID 6815/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Remove Tutor" }));

    const ask = screen.getByRole("dialog", { name: "Ask to remove the Tutor?" });
    await user.type(within(ask).getByRole("textbox"), "We stopped after the first month");
    await user.click(within(ask).getByRole("button", { name: "Send request" }));
    expect(mocks.send).toHaveBeenCalledWith({ requestId: 16, type: "remove_tutor", tutorId: "tutor-175", reason: "We stopped after the first month" }, expect.anything());
  });

  it("offers Rate Tutor once Confirmed, and not before", async () => {
    mocks.requests = [confirmed, { ...base, id: 15, status: "matched", publicationState: "published", tutorId: "tutor-175", appliedTutorCount: 3, tuitionRequest: null }];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("tab", { name: /Appointed/ }));
    await user.click(screen.getByRole("button", { name: /Job ID 6814/ }));
    expect(within(screen.getByRole("dialog")).queryByRole("button", { name: /Rate Tutor/ })).toBeNull();
    await user.click(within(screen.getByRole("dialog")).getAllByRole("button", { name: "Close" })[0]!);

    await user.click(screen.getByRole("tab", { name: /Confirmed/ }));
    await user.click(screen.getByRole("button", { name: /Job ID 6815/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Rate Tutor/ }));
    expect(screen.getByRole("dialog", { name: "Rate the Tutor" })).toBeTruthy();
  });

  it("marks a waiting request on the card, and lets the dialog withdraw it", async () => {
    mocks.requests = [{ ...confirmed, tuitionRequest: { type: "cancel_tuition", tutorId: null } }];
    const user = userEvent.setup();
    render(<GuardianRequestTracking embedded />);

    await user.click(screen.getByRole("tab", { name: /Confirmed/ }));
    const card = screen.getByRole("button", { name: /Job ID 6815/ });
    expect(within(card).getByText("Cancellation requested")).toBeTruthy();

    await user.click(card);
    const details = screen.getByRole("dialog");
    expect(within(details).queryByRole("button", { name: "Cancel Tuition" })).toBeNull();
    expect(within(details).queryByRole("button", { name: "Remove Tutor" })).toBeNull();
    await user.click(within(details).getByRole("button", { name: "Withdraw: Cancellation requested" }));
    expect(mocks.withdraw).toHaveBeenCalledWith({ requestId: 16 });
  });
});
