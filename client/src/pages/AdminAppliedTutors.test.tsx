// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const tutor = (id: string, name: string) => ({
  id, tutorNumber: 777, name, phone: "+8801711111111", instituteName: "University of Dhaka", departmentName: "Bangla",
  cityLabel: "Dhaka", locationLabel: "Adabor", teachingExperienceYears: 4,
  profileStatus: "approved" as const, verified: 1,
});

const mocks = vi.hoisted(() => ({
  approve: vi.fn(),
  decline: vi.fn(),
  lastInput: null as unknown,
  liveInput: null as unknown,
  live: {
    items: [{
      id: 13, classCourse: "Class 8", subjects: JSON.stringify(["History"]),
      tuitionLocationLabel: "Banasree, Dhaka", locationText: "Banasree", budgetAmount: 5000,
      daysPerWeek: 3, guardianName: "Sojib Rahman", appliedTutorCount: 7, postedByAdmin: 1,
    }],
    counts: { pending: 0, live: 1, appointed: 0, confirmed: 0, cancelled: 0 },
    total: 1, page: 1, pageSize: 20, totalPages: 1,
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
    useUtils: () => ({ admin: { listAppliedTutors: { invalidate: vi.fn() }, listPostedJobs: { invalidate: vi.fn() } } }),
    admin: {
      approveAppointmentRequest: { useMutation: () => ({ mutate: mocks.approve, isPending: false }) },
      declineAppointmentRequest: { useMutation: () => ({ mutate: mocks.decline, isPending: false }) },
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

import { AdminAppliedTutorsContent, AdminLiveTuitionsContent } from "./AdminAppliedTutors";

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
    expect(screen.getByText("Female Tutor")).toBeTruthy();
    // Area and city already arrive comma-separated.
    expect(screen.getByText("Banasree, Dhaka")).toBeTruthy();
    expect(screen.getByText("Class 8")).toBeTruthy();
    expect(screen.getByText("History, Home Economics")).toBeTruthy();
    expect(screen.getByText("3 days / week")).toBeTruthy();
    expect(screen.getByText("+8801674936203")).toBeTruthy();
    // Right after the Job ID: who put the tuition up.
    expect(screen.getByText("Posted By").textContent).toContain("Guardian");
  });

  it("lists the applicants as the Admin's own Tutor rows, numbered in application order", () => {
    render(<AdminAppliedTutorsContent requestId={13} />);

    for (const header of ["#", "Tutor ID", "Name", "Mobile", "Institute", "Department", "City", "Location", "Experience", "Status", "Verified"]) {
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

  it("marks the Tutor who holds the appointment", () => {
    const original = mocks.data.job;
    mocks.data.job = { ...original, appointedTutorId: "tutor-404" } as never;
    render(<AdminAppliedTutorsContent requestId={13} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[1]).getByText("Appointed")).toBeTruthy();
    expect(within(rows[0]).queryByText("Appointed")).toBeNull();
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

describe("the live tuitions the sidebar tab lands on", () => {
  it("asks only for live tuitions - nothing else can have been applied to", () => {
    render(<AdminLiveTuitionsContent />);
    expect(mocks.liveInput).toMatchObject({ stage: "live", page: 1, query: "" });
  });

  it("puts the applicant count on each tuition and points the arrow at its applicants", () => {
    render(<AdminLiveTuitionsContent />);

    for (const header of ["Job ID", "Class / Level", "Subjects", "Location", "Salary", "Days / Week", "Guardian", "Applied"]) {
      expect(screen.getByRole("columnheader", { name: header })).toBeTruthy();
    }
    // Posted By sits straight after the Job ID.
    const headers = screen.getAllByRole("columnheader").map(cell => cell.textContent);
    expect(headers.slice(0, 2)).toEqual(["Job ID", "Posted By"]);
    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("6812")).toBeTruthy();
    expect(row.getByText("Admin")).toBeTruthy();
    expect(row.getByText("7")).toBeTruthy();
    expect(row.getByRole("link", { name: /Open the applicants of Job ID 6812/i }).getAttribute("href"))
      .toBe("/admin/applied-tutors/13");
  });

  it("searches the same way the Posted jobs board does", () => {
    render(<AdminLiveTuitionsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search subject/i), { target: { value: "Banasree" } });
    expect(mocks.liveInput).toMatchObject({ stage: "live", query: "Banasree", page: 1 });
  });
});
