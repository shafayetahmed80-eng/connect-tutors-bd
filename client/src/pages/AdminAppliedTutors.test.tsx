// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const tutor = (id: string, name: string) => ({
  id, tutorNumber: 777, name, phone: "+8801711111111", instituteName: "University of Dhaka", departmentName: "Bangla",
  cityLabel: "Dhaka", locationLabel: "Adabor", teachingExperienceYears: 4,
  profileStatus: "approved" as const, verified: 1,
  applicationStatus: "interested" as "interested" | "shortlisted" | "declined" | "matched" | "withdrawn",
  interestId: undefined as number | undefined,
});

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  decline: vi.fn(),
  review: vi.fn(),
  confirm: vi.fn(),
  reopen: vi.fn(),
  removeConfirmed: vi.fn(),
  cancelTuition: vi.fn(),
  lastInput: null as unknown,
  liveInput: null as unknown,
  live: {
    items: [{
      id: 13, classCourse: "Class 8", subjects: JSON.stringify(["History"]),
      tuitionLocationLabel: "Banasree, Dhaka", locationText: "Banasree", budgetAmount: 5000,
      daysPerWeek: 3, guardianName: "Sojib Rahman", appliedTutorCount: 7, postedByAdmin: 1,
      status: "reviewing", publicationState: "published", tutorId: null, appointmentConfirmedAt: null, cancellationReason: null,
    }, {
      id: 21, classCourse: "Class 9", subjects: JSON.stringify(["Physics"]),
      tuitionLocationLabel: "Mirpur, Dhaka", locationText: "Mirpur", budgetAmount: 6000,
      daysPerWeek: 4, guardianName: "Nusrat Jahan", appliedTutorCount: 3, postedByAdmin: 0,
      status: "matched", publicationState: "published", tutorId: "tutor-404", appointmentConfirmedAt: new Date("2026-09-12T10:00:00.000Z"), cancellationReason: null,
    }],
    counts: { pending: 0, live: 1, appointed: 0, confirmed: 1, cancelled: 0 },
    total: 2, page: 1, pageSize: 20, totalPages: 1,
  },
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
    },
    appliedTotal: 26,
    items: [] as ReturnType<typeof tutor>[],
    total: 2,
    page: 1,
    pageSize: 20,
    totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      admin: {
        listAppliedTutors: { invalidate: vi.fn() }, listPostedJobs: { invalidate: vi.fn() }, listAppointedJobs: { invalidate: vi.fn() },
        listConfirmedJobs: { invalidate: vi.fn() }, listTutorDirectory: { invalidate: vi.fn() }, listTutorApplications: { invalidate: vi.fn() },
      },
    }),
    admin: {
      approveAppointmentRequest: { useMutation: () => ({ mutate: mocks.approve, isPending: false }) },
      declineAppointmentRequest: { useMutation: () => ({ mutate: mocks.decline, isPending: false }) },
      reviewTutorJobInterest: { useMutation: () => ({ mutate: mocks.review, isPending: false }) },
      confirmTutorRequestAppointment: { useMutation: () => ({ mutate: mocks.confirm, isPending: false }) },
      reopenAppointedTuition: { useMutation: () => ({ mutate: mocks.reopen, isPending: false }) },
      removeConfirmedTutor: { useMutation: () => ({ mutate: mocks.removeConfirmed, isPending: false }) },
      cancelTutorRequest: { useMutation: () => ({ mutate: mocks.cancelTuition, isPending: false }) },
      listAppliedTutors: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false, error: null };
        },
      },
      listPostedJobs: {
        useQuery: (input: unknown) => {
          mocks.liveInput = input;
          return { data: mocks.live, isLoading: false, isError: false };
        },
      },
    },
  },
}));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminAppliedTuitionsContent, AdminAppliedTutorsContent } from "./AdminAppliedTutors";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.data.items = [tutor("tutor-175", "Tania Sultana"), tutor("tutor-404", "Tanvir Ahmed")];
  mocks.data.totalPages = 1;
});
mocks.data.items = [tutor("tutor-175", "Tania Sultana"), tutor("tutor-404", "Tanvir Ahmed")];

describe("Admin Applied Tutors page", () => {
  it("asks for that tuition's applicants and heads the page with the count", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    expect(mocks.lastInput).toMatchObject({ requestId: 13, page: 1, query: "" });
    // The count is every applicant, not the filtered page.
    expect(screen.getByText("Applied:").textContent).toContain("26");
    expect(screen.getByRole("link", { name: /Back to Posted jobs/i }).getAttribute("href")).toBe("/admin/posted-jobs");
  });

  it("carries the tuition itself, so the applicants are read against it", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    expect(screen.getByText("Job ID 6812")).toBeTruthy();
    // On a phone the facts drop to the full width in two columns.
    expect(screen.getByText("Job ID 6812").parentElement?.className).toContain("grid-cols-2");
    expect(screen.getByText("+8801674936203").parentElement?.className).toContain("col-span-2");
    expect(screen.getByText("Female Tutor")).toBeTruthy();
    // Area and city already arrive comma-separated.
    expect(screen.getByText("Banasree, Dhaka")).toBeTruthy();
    expect(screen.getByText("Class 8")).toBeTruthy();
    expect(screen.getByText("History, Home Economics")).toBeTruthy();
    expect(screen.getByText("3 days / week")).toBeTruthy();
    expect(screen.getByText("+8801674936203")).toBeTruthy();
    // Right after the Job ID: who put the tuition up, then where it stands.
    const postedBy = screen.getByText("Posted By");
    const status = screen.getByText("Tuition Status");
    expect(postedBy.textContent).toContain("Guardian");
    expect(status.textContent).toContain("Live");
    expect(postedBy.nextElementSibling).toBe(status);
  });

  it("lists the applicants as the Admin's own Tutor rows, numbered in application order", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    for (const header of ["#", "Tutor ID", "Name", "Mobile", "Institute", "Department", "City", "Location", "Experience", "Status", "Verified", "Application", "Action"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("1")).toBeTruthy();
    expect(within(rows[1]).getByText("2")).toBeTruthy();
    // Tutor ID is the registered number, never the internal key.
    expect(within(rows[0]).getByText("777")).toBeTruthy();
    expect(within(rows[0]).queryByText("tutor-175")).toBeNull();
    // The arrow leads to the same profile page as the directory's own row.
    expect(within(rows[0]).getByRole("link", { name: /Open the full profile of Tania Sultana/i }).getAttribute("href"))
      .toBe("/admin/tutor-profiles/tutor-175");
  });

  it("shows the Guardian's own marks beside each applicant", () => {
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), guardianShortlistedAt: new Date("2026-09-13T08:00:00.000Z"), appointmentRequestedAt: new Date("2026-09-13T09:00:00.000Z") } as never,
      tutor("tutor-404", "Tanvir Ahmed"),
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    expect(screen.getByRole("columnheader", { name: "Guardian" })).toBeTruthy();
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("Appointment requested")).toBeTruthy();
    expect(within(rows[0]).getByText("Shortlisted")).toBeTruthy();
    expect(within(rows[1]).queryByText("Shortlisted")).toBeNull();
  });

  it("approves a Guardian's appointment request after a confirmation, or declines it", () => {
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), interestId: 91, appointmentRequestedAt: new Date("2026-09-13T09:00:00.000Z") } as never,
      tutor("tutor-404", "Tanvir Ahmed"),
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    const rows = screen.getAllByRole("row").slice(1);
    // Only a row with a waiting request can be approved.
    expect(within(rows[1]).queryByRole("button", { name: /Approve/ })).toBeNull();

    fireEvent.click(within(rows[0]).getByRole("button", { name: "Approve the appointment of Tania Sultana" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Appoint Tania Sultana?")).toBeTruthy();
    // Nothing is sent until the Admin confirms.
    expect(mocks.approve).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(mocks.approve).toHaveBeenCalledWith({ interestId: 91 });

    fireEvent.click(within(rows[0]).getByRole("button", { name: "Decline the appointment request for Tania Sultana" }));
    expect(mocks.decline).toHaveBeenCalledWith({ interestId: 91 });
  });

  it("marks the Tutor who holds the appointment, and the tuition reads Appointed", () => {
    const original = mocks.data.job;
    mocks.data.job = { ...original, status: "matched", appointedTutorId: "tutor-404" } as never;
    mocks.data.items = [tutor("tutor-175", "Tania Sultana"), { ...tutor("tutor-404", "Tanvir Ahmed"), applicationStatus: "matched" as const }];
    render(<AdminAppliedTutorsContent requestId={13} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[1]).getByText("Appointed")).toBeTruthy();
    expect(within(rows[0]).queryByText("Appointed")).toBeNull();
    expect(within(rows[0]).getByText("Applied")).toBeTruthy();
    expect(screen.getByText("Tuition Status").textContent).toContain("Appointed");
    mocks.data.job = original;
  });

  it("reads each application's stage, and a cancelled tuition ends them all", () => {
    const original = mocks.data.job;
    mocks.data.job = { ...original, status: "matched", appointedTutorId: "tutor-404", appointmentConfirmedAt: new Date("2026-09-14T08:00:00.000Z") } as never;
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), applicationStatus: "shortlisted" as const },
      { ...tutor("tutor-404", "Tanvir Ahmed"), applicationStatus: "matched" as const },
      { ...tutor("tutor-510", "Rafi Hasan"), applicationStatus: "declined" as const },
    ];
    const view = render(<AdminAppliedTutorsContent requestId={13} />);
    const column = screen.getAllByRole("columnheader").findIndex(cell => cell.textContent === "Application");
    const stages = () => screen.getAllByRole("row").slice(1).map(row => row.querySelectorAll("td")[column]?.textContent);
    expect(stages()).toEqual(["Shortlisted", "Confirmed", "Cancelled"]);

    view.unmount();
    mocks.data.job = { ...original, status: "closed", publicationState: "closed", cancellationReason: "The Guardian did not take a Tutor" } as never;
    render(<AdminAppliedTutorsContent requestId={13} />);
    expect(stages()).toEqual(["Cancelled", "Cancelled", "Cancelled"]);
    mocks.data.job = original;
  });

  it("offers each applicant the moves a Live tuition allows", () => {
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), interestId: 91 },
      { ...tutor("tutor-404", "Tanvir Ahmed"), interestId: 92, applicationStatus: "shortlisted" as const },
      { ...tutor("tutor-510", "Rafi Hasan"), interestId: 93, profileStatus: "pending" as never },
      { ...tutor("tutor-777", "Mitu Akter"), interestId: 94, appointmentRequestedAt: new Date("2026-09-13T09:00:00.000Z") } as never,
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    expect(screen.getByRole("columnheader", { name: "Action" })).toBeTruthy();
    const buttonsIn = (index: number) => {
      const row = screen.getAllByRole("row").slice(1)[index];
      const cells = row.querySelectorAll("td");
      return Array.from(cells[cells.length - 2].querySelectorAll("button")).map(button => `${button.textContent}${(button as HTMLButtonElement).disabled ? " (disabled)" : ""}`);
    };
    expect(buttonsIn(0)).toEqual(["Shortlist", "Appoint"]);
    expect(buttonsIn(1)).toEqual(["Remove from shortlist", "Appoint"]);
    // Only an approved profile can be appointed.
    expect(buttonsIn(2)).toEqual(["Shortlist", "Appoint (disabled)"]);
    // A waiting Guardian request is answered by Approve, not a second Appoint.
    expect(buttonsIn(3)).toEqual(["Shortlist"]);
  });

  it("shortlists straight away, and appoints only after a confirmation", () => {
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), interestId: 91 },
      { ...tutor("tutor-404", "Tanvir Ahmed"), interestId: 92, applicationStatus: "shortlisted" as const },
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: "Shortlist Tania Sultana" }));
    expect(mocks.review).toHaveBeenCalledWith({ interestId: 91, status: "shortlisted" }, expect.anything());
    fireEvent.click(screen.getByRole("button", { name: "Remove Tanvir Ahmed from the shortlist" }));
    expect(mocks.review).toHaveBeenLastCalledWith({ interestId: 92, status: "interested" }, expect.anything());

    mocks.review.mockClear();
    fireEvent.click(screen.getByRole("button", { name: "Appoint Tania Sultana" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Appoint Tania Sultana?")).toBeTruthy();
    expect(within(dialog).getByText("Tutor ID 777 · Job ID 6812")).toBeTruthy();
    expect(mocks.review).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Appoint" }));
    expect(mocks.review).toHaveBeenCalledWith({ interestId: 91, status: "matched" }, expect.anything());
  });

  it("on an Appointed tuition, confirms or removes its Tutor after a confirmation, naming that Tutor", () => {
    const original = mocks.data.job;
    mocks.data.job = { ...original, status: "matched", appointedTutorId: "tutor-404" } as never;
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), interestId: 91 },
      { ...tutor("tutor-404", "Tanvir Ahmed"), interestId: 92, applicationStatus: "matched" as const },
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    // The rest can still be shortlisted as backups, but not appointed.
    expect(screen.queryByRole("button", { name: "Appoint Tania Sultana" })).toBeNull();
    expect(screen.getByRole("button", { name: "Shortlist Tania Sultana" })).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Confirm Tanvir Ahmed" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Confirm" }));
    expect(mocks.confirm).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-404" }, expect.anything());

    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Remove Tanvir Ahmed from this tuition" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Remove Tanvir Ahmed?")).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Tutor" }));
    expect(mocks.reopen).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-404" }, expect.anything());
    mocks.data.job = original;
  });

  it("on a Confirmed tuition, only removes its Tutor, after a confirmation", () => {
    const original = mocks.data.job;
    mocks.data.job = { ...original, status: "matched", appointedTutorId: "tutor-404", appointmentConfirmedAt: new Date("2026-09-14T08:00:00.000Z") } as never;
    mocks.data.items = [
      { ...tutor("tutor-175", "Tania Sultana"), interestId: 91 },
      { ...tutor("tutor-404", "Tanvir Ahmed"), interestId: 92, applicationStatus: "matched" as const },
    ];
    render(<AdminAppliedTutorsContent requestId={13} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).queryAllByRole("button")).toHaveLength(0);
    expect(within(rows[1]).getAllByRole("button").map(button => button.textContent)).toEqual(["Remove Tutor"]);

    fireEvent.click(within(rows[1]).getByRole("button", { name: "Remove Tanvir Ahmed from this tuition" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/payment status starts again at Full Due/)).toBeTruthy();
    expect(mocks.removeConfirmed).not.toHaveBeenCalled();
    fireEvent.click(within(dialog).getByRole("button", { name: "Remove Tutor" }));
    expect(mocks.removeConfirmed).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-404" }, expect.anything());
    // Not the Appointed removal: that one leaves a closed listing closed.
    expect(mocks.reopen).not.toHaveBeenCalled();
    mocks.data.job = original;
  });

  it("cancels the tuition only with a reason, after a confirmation", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: "Cancel Tuition" }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Cancel Job ID 6812?")).toBeTruthy();
    const cancel = within(dialog).getByRole("button", { name: "Cancel Tuition" }) as HTMLButtonElement;
    expect(cancel.disabled).toBe(true);

    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: "  The Guardian found a Tutor elsewhere  " } });
    expect(cancel.disabled).toBe(false);
    fireEvent.click(cancel);
    expect(mocks.cancelTuition).toHaveBeenCalledWith({ requestId: 13, reason: "The Guardian found a Tutor elsewhere" });
  });

  it("keeps the tuition when the Admin backs out, and offers no Cancel once it is cancelled", () => {
    const view = render(<AdminAppliedTutorsContent requestId={13} />);
    fireEvent.click(screen.getByRole("button", { name: "Cancel Tuition" }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Keep Tuition" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(mocks.cancelTuition).not.toHaveBeenCalled();
    view.unmount();

    const original = mocks.data.job;
    mocks.data.job = { ...original, status: "closed", publicationState: "closed", cancellationReason: "The Guardian did not take a Tutor" } as never;
    render(<AdminAppliedTutorsContent requestId={13} />);
    expect(screen.queryByRole("button", { name: "Cancel Tuition" })).toBeNull();
    mocks.data.job = original;
  });

  it("continues the numbering across pages rather than restarting at one", () => {
    mocks.data.totalPages = 3;
    render(<AdminAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(mocks.lastInput).toMatchObject({ page: 2 });
    // The number is application order, so page 2 of 20 starts at 21 - it does
    // not restart, or the same Tutor would be "#1" on two different pages.
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("21")).toBeTruthy();
    expect(within(rows[1]).getByText("22")).toBeTruthy();
  });

  it("keeps the filter set behind the Filter button", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    expect(screen.queryByPlaceholderText(/Search Tutor name/i)).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /Filter/ }));

    fireEvent.change(screen.getByPlaceholderText(/Search Tutor name/i), { target: { value: "Tania" } });
    expect(mocks.lastInput).toMatchObject({ requestId: 13, query: "Tania", page: 1 });
  });
});

describe("the tuitions the sidebar tab lands on", () => {
  it("asks for Live, Appointed and Confirmed tuitions - every stage that can have applicants", () => {
    render(<AdminAppliedTuitionsContent />);
    expect(mocks.liveInput).toMatchObject({ stages: ["live", "appointed", "confirmed"], page: 1, query: "" });
  });

  it("puts the stage and the applicant count on each tuition and points the arrow at its applicants", () => {
    render(<AdminAppliedTuitionsContent />);

    for (const header of ["Job ID", "Class / Level", "Subjects", "Location", "Salary", "Days / Week", "Guardian", "Applied"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    // Posted By sits straight after the Job ID, and Tuition Status after it.
    const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
    expect(headers.slice(0, 3)).toEqual(["Job ID", "Posted By", "Tuition Status"]);
    const rows = screen.getAllByRole("row");
    const live = within(rows[1]);
    expect(live.getByText("6812")).toBeTruthy();
    expect(live.getByText("Admin")).toBeTruthy();
    expect(live.getByText("Live")).toBeTruthy();
    expect(live.getByText("7")).toBeTruthy();
    expect(live.getByRole("link", { name: /Open the applicants of Job ID 6812/i }).getAttribute("href"))
      .toBe("/admin/applied-tutors/13");
    const confirmed = within(rows[2]);
    expect(confirmed.getByText("Confirmed")).toBeTruthy();
    expect(confirmed.getByText("Guardian")).toBeTruthy();
  });

  it("searches the same way the Posted jobs board does", () => {
    render(<AdminAppliedTuitionsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search subject/i), { target: { value: "Banasree" } });
    expect(mocks.liveInput).toMatchObject({ stages: ["live", "appointed", "confirmed"], query: "Banasree", page: 1 });
  });
});
