// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

// PublicationControls reaches for the audit trail and the action mutations.
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listMatchingRequests: { invalidate: vi.fn() }, listTutorRequestAssignmentNotes: { invalidate: vi.fn() } } }),
    admin: {
      confirmTutorRequestAppointment: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      cancelTutorRequest: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      createConfirmationLetterDraft: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      issueConfirmationLetter: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      listTutorRequestAssignmentNotes: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
      addTutorRequestAssignmentNote: { useMutation: () => ({ isPending: false, isError: false, error: null, mutate: vi.fn() }) },
      listTutorRequestPublicationEvents: { useQuery: () => ({ data: [], isLoading: false, isError: false }) },
    },
  },
}));
import { PublicationControls } from "./AdminMatchingWorkspace";

afterEach(cleanup);

/** A request an Admin is checking over, which is when the edit form appears. */
const reviewing = {
  id: 7,
  publicationState: "reviewing",
  guardianConfirmedAt: new Date("2026-09-01T00:00:00.000Z"),
  status: "new",
  category: "Bangla Medium",
  classCourse: "Class 9",
  subjects: ["Physics"],
  daysPerWeek: 4,
  preferredGender: "any",
  budgetAmount: 5000,
  notes: "Call me on 01712345678, House 12 Road 3",
  tuitionType: "home",
  studentCount: 1,
  studentGender: null,
  addressDetails: null,
  tuitionLocationLabel: "Shyamoli, Dhaka",
  locationText: null,
  contactConsent: "not_required",
  instituteName: null,
  heardAboutUs: null,
  groupCapacity: null,
  packageDurationMonths: null,
  createdAt: new Date("2026-09-01T00:00:00.000Z"),
} as unknown as React.ComponentProps<typeof PublicationControls>["request"];

function renderControls(onEdit = vi.fn()) {
  render(<PublicationControls request={reviewing} busy={false} onAction={vi.fn()} onEdit={onEdit} />);
  const summary = screen.getByText(/Edit job-facing details/);
  fireEvent.click(summary);
  return { onEdit, notes: screen.getByRole("textbox", { name: /Job Board note/ }) as HTMLTextAreaElement };
}

describe("the Job Board note an Admin publishes", () => {
  it("offers the Guardian's note for editing before it reaches the Job Board", () => {
    // It used to go out word for word - and Guardians put phone numbers and
    // house numbers in it, which is the whole reason this field exists.
    const { notes } = renderControls();

    expect(notes.value).toBe("Call me on 01712345678, House 12 Road 3");
    expect(notes.maxLength).toBe(2000);
  });

  it("says that an empty box publishes no note at all", () => {
    const { notes } = renderControls();

    expect(notes.placeholder).toBe("Leave empty to publish no note");
  });

  it("sends the edited wording rather than the Guardian's", () => {
    const { onEdit, notes } = renderControls();
    const form = notes.closest("form")!;

    fireEvent.change(notes, { target: { value: "Weekday evenings preferred" } });
    fireEvent.submit(form);

    expect(onEdit).toHaveBeenCalled();
    // React nulls `currentTarget` once the event has been handled, so read the
    // form itself - it is what the real handler serialises anyway.
    expect(new FormData(form).get("notes")).toBe("Weekday evenings preferred");
  });

  it("sits beside the other job-facing fields rather than in a form of its own", () => {
    const { notes } = renderControls();
    const form = notes.closest("form")!;

    const names = [...(form.elements as unknown as HTMLElement[])].map(el => el.getAttribute("name")).filter(Boolean);
    expect(names).toContain("notes");
    expect(names).toContain("category");
    expect(names).toContain("preferredGender");
  });
});
