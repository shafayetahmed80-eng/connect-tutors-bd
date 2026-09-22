// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const tutor = (id: string, name: string) => ({
  id, tutorNumber: 777, name, phone: "+8801711111111", instituteName: "University of Dhaka", departmentName: "Bangla",
  cityLabel: "Dhaka", locationLabel: "Adabor", teachingExperienceYears: 4,
  profileStatus: "approved" as const, verified: 1,
  applicationStatus: undefined as "interested" | "shortlisted" | "declined" | "matched" | "withdrawn" | undefined,
  interestId: undefined as number | undefined,
  matchReasons: [{ kind: "subject", label: "Teaches Mathematics" }] as { kind: string; label: string }[],
  matchCautions: [{ kind: "area", label: "Based in Uttara" }] as { kind: string; label: string }[],
});

const mocks = vi.hoisted(() => ({
  review: vi.fn(),
  matchTutor: vi.fn(),
  confirm: vi.fn(),
  reopen: vi.fn(),
  removeConfirmed: vi.fn(),
  cancelTuition: vi.fn(),
  approveGuardian: vi.fn(),
  declineGuardian: vi.fn(),
  lastInput: null as unknown,
  data: {
    job: {
      id: 13,
      classCourse: "Class 8",
      category: "English Version",
      subjects: JSON.stringify(["History", "Home Economics"]),
      preferredGender: "female",
      daysPerWeek: 3,
      budgetAmount: 5000,
      tuitionLocationLabel: "Banasree, Dhaka",
      locationText: "Banasree",
      tuitionType: "home",
      guardianName: "Sojib Rahman",
      guardianPhone: "+8801674936203",
      status: "reviewing",
      publicationState: "published",
      appointmentConfirmedAt: null,
      cancellationReason: null,
      appointedTutorId: null as string | null,
      postedByAdmin: 0,
    },
    appliedTotal: 3,
    guardianRequest: null as null | { id: number; type: "confirm" | "remove_tutor" | "cancel_tuition"; tutorId: string | null; reason: string | null; createdAt: Date },
    items: [] as ReturnType<typeof tutor>[],
    total: 2, page: 1, pageSize: 20, totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listMatchingCandidates: { invalidate: vi.fn() }, listAppliedTutors: { invalidate: vi.fn() }, listPostedJobs: { invalidate: vi.fn() },
        listAppointedJobs: { invalidate: vi.fn() }, listConfirmedJobs: { invalidate: vi.fn() }, listTutorDirectory: { invalidate: vi.fn() }, listTutorApplications: { invalidate: vi.fn() },
      },
    }),
    admin: {
      approveAppointmentRequest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      declineAppointmentRequest: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      reviewTutorJobInterest: { useMutation: () => ({ mutate: mocks.review, isPending: false }) },
      matchTutorToRequest: { useMutation: () => ({ mutate: mocks.matchTutor, isPending: false }) },
      confirmTutorRequestAppointment: { useMutation: () => ({ mutate: mocks.confirm, isPending: false }) },
      reopenAppointedTuition: { useMutation: () => ({ mutate: mocks.reopen, isPending: false }) },
      removeConfirmedTutor: { useMutation: () => ({ mutate: mocks.removeConfirmed, isPending: false }) },
      cancelTutorRequest: { useMutation: () => ({ mutate: mocks.cancelTuition, isPending: false }) },
      approveGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.approveGuardian, isPending: false }) },
      declineGuardianTuitionRequest: { useMutation: () => ({ mutate: mocks.declineGuardian, isPending: false }) },
      listMatchingCandidates: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false, error: null };
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminTutorMatchingContent } from "./AdminTutorMatching";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.data.items = [tutor("tutor-902", "Rima Akter"), tutor("tutor-175", "Tania Sultana")];
  mocks.data.job.appointedTutorId = null;
});
mocks.data.items = [tutor("tutor-902", "Rima Akter"), tutor("tutor-175", "Tania Sultana")];

describe("Admin Tutor Matching page", () => {
  it("asks for every approved Tutor ranked against this tuition, not just its applicants", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    expect(mocks.lastInput).toMatchObject({ requestId: 13, page: 1, pageSize: 20 });
    expect(screen.getByText("Applied:").textContent).toContain("3");
  });

  it("numbers every candidate serially, best match leading, with no Application badge for one who never applied", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("1")).toBeTruthy();
    expect(within(rows[0]).getByText("Rima Akter")).toBeTruthy();
    expect(within(rows[0]).queryByText("Applied")).toBeNull();
    expect(within(rows[0]).queryByText("Shortlisted")).toBeNull();
  });

  it("offers Shortlist and Appoint on a Tutor who never applied, same as a fresh applicant", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByRole("button", { name: /Shortlist Rima Akter/i })).toBeTruthy();
    expect(within(rows[0]).getByRole("button", { name: /Appoint Rima Akter/i })).toBeTruthy();
  });

  it("creates the application first when shortlisting a Tutor who never applied", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(within(rows[0]).getByRole("button", { name: /Shortlist Rima Akter/i }));

    expect(mocks.matchTutor).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-902", status: "shortlisted" }, expect.anything());
    expect(mocks.review).not.toHaveBeenCalled();
  });

  it("shortlists a Tutor who already applied through the same review mutation Applied Tutors uses", () => {
    mocks.data.items = [{ ...tutor("tutor-902", "Rima Akter"), interestId: 61, applicationStatus: "interested" }, tutor("tutor-175", "Tania Sultana")];
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(within(rows[0]).getByRole("button", { name: /Shortlist Rima Akter/i }));

    expect(mocks.review).toHaveBeenCalledWith({ interestId: 61, status: "shortlisted" }, expect.anything());
    expect(mocks.matchTutor).not.toHaveBeenCalled();
  });

  it("asks first, then appoints a never-applied Tutor by creating and matching their application in one step", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    fireEvent.click(within(rows[0]).getByRole("button", { name: /Appoint Rima Akter/i }));

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Appoint Rima Akter?")).toBeTruthy();
    expect(mocks.matchTutor).not.toHaveBeenCalled();

    fireEvent.click(within(dialog).getByRole("button", { name: "Appoint" }));
    expect(mocks.matchTutor).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-902", status: "matched" }, expect.anything());
  });

  it("confirms and removes the appointed Tutor the same way Applied Tutors does, by request and Tutor id", () => {
    mocks.data.job.appointedTutorId = "tutor-902";
    mocks.data.items = [{ ...tutor("tutor-902", "Rima Akter"), applicationStatus: "matched" }, tutor("tutor-175", "Tania Sultana")];
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);

    fireEvent.click(within(rows[0]).getByRole("button", { name: /Confirm Rima Akter/i }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));
    expect(mocks.confirm).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-902" }, expect.anything());
  });

  it("colours what lines up with the tuition green and what does not the warning colour", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    const rows = screen.getAllByRole("row").slice(1);
    const reason = within(rows[0]).getByText("Teaches Mathematics");
    const caution = within(rows[0]).getByText("Based in Uttara");
    expect(reason.className).toContain("text-emerald-800");
    expect(caution.className).toContain("text-amber-800");
  });

  it("offers a rows-per-page choice of 20, 50 and 100", () => {
    mocks.data.totalPages = 2;
    render(<AdminTutorMatchingContent requestId={13} />);
    const select = screen.getByLabelText(/rows per page/i);
    expect(within(select).getAllByRole("option").map(option => option.textContent)).toEqual(["20", "50", "100"]);
    fireEvent.change(select, { target: { value: "50" } });
    expect(mocks.lastInput).toMatchObject({ pageSize: 50, page: 1 });
    mocks.data.totalPages = 1;
  });

  it("cancels the tuition the same way Applied Tutors does", () => {
    render(<AdminTutorMatchingContent requestId={13} />);
    fireEvent.click(screen.getByRole("button", { name: /Cancel Tuition/i }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText(/Reason/i), { target: { value: "Guardian withdrew the search." } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Cancel Tuition" }));
    expect(mocks.cancelTuition).toHaveBeenCalledWith({ requestId: 13, reason: "Guardian withdrew the search." });
  });
});
