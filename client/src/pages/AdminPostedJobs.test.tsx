// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  publish: vi.fn(),
  confirm: vi.fn(),
  reopen: vi.fn(),
  data: {
    items: [
      {
        id: 13,
        guardianUserId: 10,
        guardianName: "Sojib Rahman",
        guardianPhone: "+8801674936203",
        guardianId: "GD-11A2",
        tuitionType: "home",
        category: "English Version",
        classCourse: "Class 8",
        subjects: JSON.stringify(["History", "Home Economics"]),
        daysPerWeek: 3,
        preferredGender: "female",
        studentGender: "female",
        studentCount: 1,
        groupCapacity: null,
        packageDurationMonths: null,
        budgetAmount: 5000,
        tuitionLocationLabel: "Banasree, Dhaka",
        locationText: "Banasree",
        addressDetails: "House 4, Road 2",
        instituteName: "City College",
        heardAboutUs: "facebook",
        notes: "Evening slots only",
        status: "new",
        publicationState: "submitted",
        tutorId: null,
        appointmentConfirmedAt: null,
        cancellationReason: null,
        contactConsent: "not_required",
        createdAt: new Date("2026-09-06T00:00:00.000Z"),
        appliedTutorCount: 7,
      },
    ],
    counts: { pending: 4, live: 9, appointed: 0, confirmed: 0, cancelled: 0 },
    total: 4,
    page: 1,
    pageSize: 12,
    totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listPostedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
      moderateTutorRequestPublication: {
        useMutation: () => ({ mutate: mocks.publish, isPending: false }),
      },
      confirmTutorRequestAppointment: {
        useMutation: () => ({ mutate: mocks.confirm, isPending: false }),
      },
      reopenAppointedTuition: {
        useMutation: () => ({ mutate: mocks.reopen, isPending: false }),
      },
    },
    useUtils: () => ({ admin: { listPostedJobs: { invalidate: vi.fn() } } }),
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminPostedJobsContent } from "./AdminPostedJobs";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  Object.assign(mocks.data.items[0], { publicationState: "submitted", status: "new", tutorId: null, appointmentRequested: false });
});

describe("Admin Posted jobs board", () => {
  it("mirrors the Guardian's five stages with counts across every Guardian", () => {
    render(<AdminPostedJobsContent />);

    for (const label of ["Pending", "Live", "Appointed", "Confirmed", "Cancelled"]) {
      expect(screen.getByRole("tab", { name: new RegExp(label) })).toBeTruthy();
    }
    // Zero-padded, exactly like the Guardian tab.
    expect(screen.getByRole("tab", { name: /Pending/ }).textContent).toContain("04");
    expect(screen.getByRole("tab", { name: /Live/ }).textContent).toContain("09");
    expect(screen.getByRole("button", { name: /Add Tuition/ })).toBeTruthy();
  });

  it("asks the server for the chosen stage and the typed search", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ stage: "pending", query: "", page: 1 });

    await user.click(screen.getByRole("tab", { name: /Live/ }));
    expect(mocks.lastInput).toMatchObject({ stage: "live", page: 1 });

    fireEvent.change(screen.getByPlaceholderText(/Search subject/i), { target: { value: "Banasree" } });
    expect(mocks.lastInput).toMatchObject({ query: "Banasree", page: 1 });
  });

  it("opens the same details dialog and ends it with the Guardian's name and number", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    // The whole card is the button; "Details" is its visible affordance.
    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    const dialog = screen.getByRole("dialog");

    // The Guardian's own fields are all there...
    expect(within(dialog).getByText("Job ID : 6812")).toBeTruthy();
    expect(within(dialog).getByText("Evening slots only")).toBeTruthy();
    // ...plus the Admin-only tail.
    expect(within(dialog).getByText("House 4, Road 2")).toBeTruthy();
    expect(within(dialog).getByText("Sojib Rahman")).toBeTruthy();
    expect(within(dialog).getByText("+8801674936203")).toBeTruthy();
    // Update is replaced by the two Admin actions.
    expect(within(dialog).queryByRole("button", { name: "Update" })).toBeNull();
    expect(within(dialog).getByRole("button", { name: /Change Status/ })).toBeTruthy();
    expect(within(dialog).getByRole("button", { name: /Edit/ })).toBeTruthy();
  });

  it("takes a Pending tuition Live in one click", async () => {
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Change Status/ }));

    // Pending offers exactly one move, and it is the whole dialog.
    const status = screen.getByRole("dialog");
    expect(within(status).getByRole("heading", { name: /Change status of Job ID 6812/ })).toBeTruthy();
    await user.click(within(status).getByRole("button", { name: "Live" }));
    expect(mocks.publish).toHaveBeenCalledWith({ requestId: 13, action: "go_live" });
  });

  it("offers no status move once the tuition is past Pending", async () => {
    mocks.data.items[0].publicationState = "published";
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Change Status/ }));
    const status = screen.getByRole("dialog");
    expect(within(status).queryByRole("button", { name: "Live" })).toBeNull();
    expect(within(status).getByText(/No status change is available from Live/)).toBeTruthy();
  });

  it("shows the applied Tutor count on a live tuition, on the card and in the dialog", async () => {
    mocks.data.items[0].publicationState = "published";
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    const card = screen.getByRole("button", { name: /Job ID 6812/ });
    const cardLink = within(card).getByRole("link", { name: /Applied Tutors/ });
    expect(cardLink.textContent).toContain("(7)");
    expect(cardLink.getAttribute("href")).toBe("/admin/applied-tutors/13");

    await user.click(card);
    expect(within(screen.getByRole("dialog")).getByRole("link", { name: /Applied Tutors/ })).toBeTruthy();
  });

  it("moves an Appointed tuition on after the demo class: Confirmed, or back to Live", async () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175" });
    const user = userEvent.setup();
    render(<AdminPostedJobsContent />);

    await user.click(screen.getByRole("button", { name: /Job ID 6812/ }));
    await user.click(within(screen.getByRole("dialog")).getByRole("button", { name: /Change Status/ }));
    const status = screen.getByRole("dialog");

    await user.click(within(status).getByRole("button", { name: /Confirmed/ }));
    expect(mocks.confirm).toHaveBeenCalledWith({ requestId: 13 });
    await user.click(within(status).getByRole("button", { name: /Live/ }));
    expect(mocks.reopen).toHaveBeenCalledWith({ requestId: 13 });
  });

  it("marks a tuition whose Guardian asked for an appointment", () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", appointmentRequested: true });
    render(<AdminPostedJobsContent />);

    expect(within(screen.getByRole("button", { name: /Job ID 6812/ })).getByText("Appointment requested")).toBeTruthy();
  });

  it("keeps the applicants one click away once a Tutor is Appointed", () => {
    Object.assign(mocks.data.items[0], { publicationState: "published", status: "matched", tutorId: "tutor-175" });
    render(<AdminPostedJobsContent />);

    expect(within(screen.getByRole("button", { name: /Job ID 6812/ })).getByRole("link", { name: /Applied Tutors/ }).getAttribute("href"))
      .toBe("/admin/applied-tutors/13");
  });

  it("keeps the applied count off a tuition that is not live yet", () => {
    render(<AdminPostedJobsContent />);
    expect(screen.queryByRole("link", { name: /Applied Tutors/ })).toBeNull();
  });
});
