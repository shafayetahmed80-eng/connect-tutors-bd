// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  setPayment: vi.fn(),
  data: {
    items: [
      {
        id: 21, postedByAdmin: 1, classCourse: "Class 10", subjects: JSON.stringify(["Biology"]),
        tuitionLocationLabel: "Mohakhali, Dhaka", locationText: "Mohakhali", budgetAmount: 7000, daysPerWeek: 4,
        appointedAt: new Date("2026-09-10T08:00:00.000Z"), confirmedAt: new Date("2026-09-13T08:30:00.000Z"),
        paymentStatus: "full_due",
        tutorId: "tutor-175", tutorNumber: 777 as number | null, tutorName: "Tania Sultana", tutorPhone: "+8801711111111" as string | null,
      },
      {
        id: 5, postedByAdmin: 0, classCourse: "Class 9", subjects: JSON.stringify(["Physics"]),
        tuitionLocationLabel: "Shyamoli, Dhaka", locationText: "Shyamoli", budgetAmount: 6000, daysPerWeek: 3,
        appointedAt: null as Date | null, confirmedAt: new Date("2026-09-12T08:30:00.000Z"),
        paymentStatus: "half_paid",
        tutorId: "tutor-404", tutorNumber: null, tutorName: "Tanvir Ahmed", tutorPhone: null,
      },
    ],
    total: 2, page: 1, pageSize: 20, totalPages: 1,
  },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listConfirmedJobs: { invalidate: vi.fn() } } }),
    admin: {
      listConfirmedJobs: {
        useQuery: (input: unknown) => {
          mocks.lastInput = input;
          return { data: mocks.data, isLoading: false, isError: false };
        },
      },
      setJobPaymentStatus: { useMutation: () => ({ mutate: mocks.setPayment, isPending: false, variables: undefined }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminConfirmedJobsContent } from "./AdminConfirmedJobs";

afterEach(() => { cleanup(); vi.clearAllMocks(); });

describe("Admin Confirmed Jobs", () => {
  it("asks for the Confirmed stage and names the columns in the Owner's order", () => {
    render(<AdminConfirmedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", page: 1 });
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "Job ID", "Posted By", "Tutor ID", "Name", "Mobile", "Appointed", "Confirmed", "Payment Status",
      "Class", "Subjects", "Location", "Salary", "Days", "Tutor profile",
    ]);
  });

  it("reads the tuition's Tutor, both dates and the tuition itself", () => {
    render(<AdminConfirmedJobsContent />);

    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("6820")).toBeTruthy();
    expect(row.getByText("Admin")).toBeTruthy();
    // Tutor ID is the registered number, never the internal key.
    expect(row.getByText("777")).toBeTruthy();
    expect(row.queryByText("tutor-175")).toBeNull();
    expect(row.getByText("Tania Sultana")).toBeTruthy();
    expect(row.getByText("+8801711111111")).toBeTruthy();
    expect(row.getByText(/^10 Sep/)).toBeTruthy();
    expect(row.getByText(/^13 Sep/)).toBeTruthy();
    expect(row.getByText("Class 10")).toBeTruthy();
    expect(row.getByText("Biology")).toBeTruthy();
    expect(row.getByText("Mohakhali, Dhaka")).toBeTruthy();
    expect(row.getByText(/7,000/)).toBeTruthy();
    expect(row.getByText("4 days / week")).toBeTruthy();
  });

  it("shows each payment status, Full Due to Full Paid, and saves a change from the row", () => {
    render(<AdminConfirmedJobsContent />);

    const first = screen.getByRole("combobox", { name: "Payment status of Job ID 6820" }) as HTMLSelectElement;
    expect(first.value).toBe("full_due");
    expect(within(first).getAllByRole("option").map(option => option.textContent)).toEqual(["Full Due", "Half Paid", "Partial Paid", "Full Paid"]);
    expect((screen.getByRole("combobox", { name: "Payment status of Job ID 6804" }) as HTMLSelectElement).value).toBe("half_paid");

    fireEvent.change(first, { target: { value: "full_paid" } });
    expect(mocks.setPayment).toHaveBeenCalledWith({ requestId: 21, paymentStatus: "full_paid" });
  });

  it("opens the Tutor's own profile from the arrow, and says Not set where a detail is missing", () => {
    render(<AdminConfirmedJobsContent />);

    expect(screen.getByRole("link", { name: "Open the profile of Tania Sultana" }).getAttribute("href"))
      .toBe("/admin/tutor-profiles/tutor-175");
    expect(within(screen.getAllByRole("row")[2]).getAllByText("Not set")).toHaveLength(3);
  });

  it("searches from the first page", () => {
    render(<AdminConfirmedJobsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location or Tutor/), { target: { value: "777" } });
    expect(mocks.lastInput).toMatchObject({ query: "777", page: 1 });
  });
});
