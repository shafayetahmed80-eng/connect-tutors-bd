// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const applicant = (id: string, name: string, overrides: Record<string, unknown> = {}) => ({
  id, tutorNumber: 777 as number | null, name, phone: null as string | null, phoneHidden: true,
  instituteName: "University of Dhaka", departmentName: "Physics",
  cityLabel: "Dhaka", locationLabel: "Adabor", teachingExperienceYears: 4,
  shortlisted: false, appointmentRequested: false, appointed: false,
  ...overrides,
});

const job = {
  id: 13, classCourse: "Class 8", category: "English Version",
  subjects: JSON.stringify(["History", "Home Economics"]), preferredGender: "female",
  daysPerWeek: 3, budgetAmount: 5000, tuitionLocationLabel: "Banasree, Dhaka", locationText: "Banasree", tuitionType: "home",
};

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  result: {} as Record<string, unknown>,
  shortlist: vi.fn(),
  requestAppointment: vi.fn(),
  withdrawAppointment: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorRequests: { appliedTutors: { invalidate: mocks.invalidate } } }),
    tutorRequests: {
      appliedTutors: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return mocks.result;
        },
      },
      shortlistApplicant: { useMutation: () => ({ mutate: mocks.shortlist, isPending: false }) },
      requestAppointment: { useMutation: () => ({ mutate: mocks.requestAppointment, isPending: false }) },
      withdrawAppointmentRequest: { useMutation: () => ({ mutate: mocks.withdrawAppointment, isPending: false }) },
    },
  },
}));

import { GuardianAppliedTuitionsContent, GuardianAppliedTutorsContent } from "./GuardianAppliedTutors";

function loaded(items: ReturnType<typeof applicant>[], extra: Record<string, unknown> = {}) {
  mocks.result = {
    data: { job, lifecycle: "live", appointmentRequestPending: false, items, total: items.length, page: 1, pageSize: 20, totalPages: 1, ...extra },
    isLoading: false, isError: false, error: null,
  };
}

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("the Guardian's applicant list", () => {
  it("asks for this tuition and heads the page with its count", () => {
    loaded([applicant("tutor-175", "Tania Sultana"), applicant("tutor-404", "Tanvir Ahmed")]);
    render(<GuardianAppliedTutorsContent requestId={13} />);

    expect(mocks.lastInput).toEqual({ requestId: 13, page: 1, pageSize: 20 });
    expect(screen.getByText("Applied:").textContent).toContain("2");
    expect(screen.getByText("Job ID 6812")).toBeTruthy();
    expect(screen.getByText("Female Tutor")).toBeTruthy();
    expect(screen.getByText("History, Home Economics")).toBeTruthy();
    expect(screen.getByText("3 days / week")).toBeTruthy();
  });

  it("shows the Guardian's columns and none of the Admin's", () => {
    loaded([applicant("tutor-175", "Tania Sultana")]);
    render(<GuardianAppliedTutorsContent requestId={13} />);

    const headers = screen.getAllByRole("columnheader").map(header => header.textContent);
    expect(headers).toEqual(["#", "Tutor ID", "Name", "Mobile", "Institute", "Department", "City", "Location", "Experience", "Shortlist", "Appointment", "Profile"]);
    // Tutor ID is the registered number, never the internal key.
    expect(within(screen.getAllByRole("row")[1]).getByText("777")).toBeTruthy();
    expect(screen.queryByText("tutor-175")).toBeNull();
    // The arrow opens the Guardian's own view of the profile, through this tuition...
    expect(screen.getByRole("link", { name: "Open the profile of Tania Sultana" }).getAttribute("href"))
      .toBe("/guardian/dashboard/applied-tutors/13/tutor-175");
    // ...and nothing leads into the Admin's review screens.
    expect(screen.queryByRole("link", { name: /full profile/i })).toBeNull();
  });

  it("holds every number back except the appointed Tutor's", () => {
    loaded([
      applicant("tutor-175", "Tania Sultana"),
      applicant("tutor-404", "Tanvir Ahmed", { phone: "+8801711111111", phoneHidden: false, appointed: true }),
    ], { lifecycle: "appointed" });
    render(<GuardianAppliedTutorsContent requestId={13} />);

    const [hidden, appointed] = screen.getAllByRole("row").slice(1);
    expect(within(hidden).getByText("+880")).toBeTruthy();
    expect(hidden.textContent).not.toMatch(/\d{5,}/);
    expect(within(appointed).getByText("+8801711111111")).toBeTruthy();
  });

  it("continues the numbering across pages", () => {
    loaded([applicant("tutor-175", "Tania Sultana"), applicant("tutor-404", "Tanvir Ahmed")], { totalPages: 3 });
    render(<GuardianAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: /Next/ }));
    expect(mocks.lastInput).toMatchObject({ requestId: 13, page: 2 });
    const rows = screen.getAllByRole("row").slice(1);
    expect(within(rows[0]).getByText("21")).toBeTruthy();
  });

  it("says so when the tuition is not one the Guardian can open", () => {
    mocks.result = { data: undefined, isLoading: false, isError: true, error: { message: "This tuition is unavailable." } };
    render(<GuardianAppliedTutorsContent requestId={99} />);

    expect(screen.getByText("This tuition is unavailable.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    expect(screen.queryByText("Applied:")).toBeNull();
  });
});

describe("shortlisting and asking to appoint", () => {
  it("shortlists a Tutor, and takes one off again", () => {
    loaded([applicant("tutor-175", "Tania Sultana"), applicant("tutor-404", "Tanvir Ahmed", { shortlisted: true })]);
    render(<GuardianAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: "Shortlist Tania Sultana" }));
    expect(mocks.shortlist).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-175", shortlisted: true });

    const on = screen.getByRole("button", { name: "Remove from shortlist Tanvir Ahmed" });
    expect(on.getAttribute("aria-pressed")).toBe("true");
    fireEvent.click(on);
    expect(mocks.shortlist).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-404", shortlisted: false });
  });

  it("asks the Admin to appoint a Tutor", () => {
    loaded([applicant("tutor-175", "Tania Sultana")]);
    render(<GuardianAppliedTutorsContent requestId={13} />);

    fireEvent.click(screen.getByRole("button", { name: "Appoint Tania Sultana" }));
    expect(mocks.requestAppointment).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-175" });
  });

  it("allows one request at a time, and lets the waiting one be withdrawn", () => {
    loaded([
      applicant("tutor-175", "Tania Sultana", { appointmentRequested: true }),
      applicant("tutor-404", "Tanvir Ahmed"),
    ], { appointmentRequestPending: true });
    render(<GuardianAppliedTutorsContent requestId={13} />);

    const [requested, other] = screen.getAllByRole("row").slice(1);
    expect(within(requested).getByText("Requested")).toBeTruthy();
    expect((within(other).getByRole("button", { name: "Appoint Tanvir Ahmed" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(within(requested).getByRole("button", { name: "Withdraw the appointment request for Tania Sultana" }));
    expect(mocks.withdrawAppointment).toHaveBeenCalledWith({ requestId: 13, tutorId: "tutor-175" });
  });

  it("offers no new appointment once a Tutor is appointed", () => {
    loaded([
      applicant("tutor-175", "Tania Sultana", { appointed: true, phoneHidden: false, phone: "+8801711111111" }),
      applicant("tutor-404", "Tanvir Ahmed"),
    ], { lifecycle: "appointed" });
    render(<GuardianAppliedTutorsContent requestId={13} />);

    const [appointed, other] = screen.getAllByRole("row").slice(1);
    expect(within(appointed).getByText("Appointed")).toBeTruthy();
    expect(within(appointed).queryByRole("button", { name: /Appoint/ })).toBeNull();
    expect((within(other).getByRole("button", { name: "Appoint Tanvir Ahmed" }) as HTMLButtonElement).disabled).toBe(true);
  });
});

describe("where the Applied Tutors tab lands", () => {
  const base = {
    classCourse: "Class 8", subjects: JSON.stringify(["History"]), tuitionLocationLabel: "Banasree, Dhaka",
    budgetAmount: 5000, daysPerWeek: 3, tutorId: null, appointmentConfirmedAt: null, cancellationReason: null,
  };

  it("lists only the tuitions that can have applicants, each with its count and its list", () => {
    render(<GuardianAppliedTuitionsContent isLoading={false} requests={[
      { ...base, id: 12, status: "new", publicationState: "submitted", appliedTutorCount: 0 },
      { ...base, id: 13, status: "new", publicationState: "published", appliedTutorCount: 7 },
      { ...base, id: 14, status: "matched", publicationState: "published", tutorId: "tutor-175", appliedTutorCount: 3 },
      { ...base, id: 15, status: "matched", publicationState: "published", tutorId: "tutor-175", appointmentConfirmedAt: new Date("2026-09-10T00:00:00.000Z"), appliedTutorCount: 3 },
    ]} />);

    const rows = screen.getAllByRole("row").slice(1);
    expect(rows).toHaveLength(2);
    expect(within(rows[0]).getByText("6812")).toBeTruthy();
    expect(within(rows[0]).getByText("Live")).toBeTruthy();
    expect(within(rows[0]).getByText("7")).toBeTruthy();
    expect(within(rows[0]).getByRole("link", { name: /Open the applicants of Job ID 6812/ }).getAttribute("href"))
      .toBe("/guardian/dashboard/applied-tutors/13");
    expect(within(rows[1]).getByText("Appointed")).toBeTruthy();
    expect(within(rows[1]).getByRole("link").getAttribute("href")).toBe("/guardian/dashboard/applied-tutors/14");
  });

  it("stays a table with one line when there is nothing to open", () => {
    render(<GuardianAppliedTuitionsContent isLoading={false} requests={[]} />);
    expect(screen.getByText("No live or appointed tuition.")).toBeTruthy();
  });

  it("does not call a failed load an empty list", () => {
    render(<GuardianAppliedTuitionsContent isLoading={false} isError requests={[]} />);
    expect(screen.getByText("Your tuitions could not be loaded.")).toBeTruthy();
    expect(screen.queryByText("No live or appointed tuition.")).toBeNull();
  });
});
