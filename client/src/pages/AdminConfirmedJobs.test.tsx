// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: null as unknown,
  data: {
    items: [
      {
        id: 21, postedByAdmin: 1, classCourse: "Class 10", subjects: JSON.stringify(["Biology"]),
        tuitionLocationLabel: "Mohakhali, Dhaka", locationText: "Mohakhali", budgetAmount: 7000, daysPerWeek: 4,
        appointedAt: new Date("2026-09-10T08:00:00.000Z"), confirmedAt: new Date("2026-09-13T08:30:00.000Z"),
        paymentStatus: "full_due",
        charge: { owed: 4200, paid: 2100, balance: 2100, status: "partial_paid" } as { owed: number; paid: number; balance: number; status: string } | null,
        tutorId: "tutor-175", tutorNumber: 777 as number | null, tutorName: "Tania Sultana", tutorPhone: "+8801711111111" as string | null,
      },
      {
        id: 5, postedByAdmin: 0, classCourse: "Class 9", subjects: JSON.stringify(["Physics"]),
        tuitionLocationLabel: "Shyamoli, Dhaka", locationText: "Shyamoli", budgetAmount: 6000, daysPerWeek: 3,
        appointedAt: null as Date | null, confirmedAt: new Date("2026-09-12T08:30:00.000Z"),
        paymentStatus: "half_paid",
        charge: { owed: 3600, paid: 3600, balance: 0, status: "full_paid" } as { owed: number; paid: number; balance: number; status: string } | null,
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
    },
  },
}));
// The payments dialog has its own tests; here it only has to open for the right tuition.
vi.mock("@/components/TuitionPaymentsModal", () => ({
  default: ({ requestId, onClose }: { requestId: number; onClose: () => void }) =>
    <div role="dialog" aria-label="Payments"><span>Payments of {requestId}</span><button type="button" onClick={onClose}>Close</button></div>,
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

// The Cancelled tab has its own tests; here it only has to appear when asked for.
vi.mock("@/components/AdminCancelledCharges", () => ({ default: () => <div>Cancelled charges</div> }));
vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <main>{children}</main> }));

import AdminConfirmedJobs, { AdminConfirmedJobsContent } from "./AdminConfirmedJobs";

afterEach(() => { cleanup(); vi.clearAllMocks(); window.innerWidth = 1024; });

describe("Admin Confirmed Jobs", () => {
  it("asks for the Confirmed stage and names the columns in the Owner's order", () => {
    render(<AdminConfirmedJobsContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", page: 1 });
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "Job ID", "Posted By", "Tutor ID", "Name", "Mobile", "Appointed", "Confirmed", "Payment Status",
      "Charge", "Paid", "Balance", "Class", "Subjects", "Location", "Salary", "Days", "Payments", "Tutor profile",
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

  it("shows what the Tutor owes, what is paid, and what is left", () => {
    render(<AdminConfirmedJobsContent />);

    const owing = within(screen.getAllByRole("row")[1]);
    expect(owing.getByText(/^4,200/)).toBeTruthy();
    expect(owing.getAllByText(/^2,100/)).toHaveLength(2);
    // What is still owed reads as a warning, and clear once nothing is.
    expect(owing.getAllByText(/^2,100/)[1].className).toContain("text-red-800");
    expect(within(screen.getAllByRole("row")[2]).getAllByText(/^0 /)[0].className).toContain("text-emerald-800");
  });

  it("says Not set for the charge of a tuition that has no salary to take a share of", () => {
    const original = mocks.data.items[1];
    mocks.data.items[1] = { ...original, charge: null };
    try {
      render(<AdminConfirmedJobsContent />);

      expect(within(screen.getAllByRole("row")[2]).getAllByText("Not set").length).toBeGreaterThanOrEqual(6);
    } finally {
      mocks.data.items[1] = original;
    }
  });

  it("shows the status the payments work out to, not a label typed in", () => {
    render(<AdminConfirmedJobsContent />);

    // The first row's stored label is Full Due, but its verified payments make it Partial Paid.
    expect(within(screen.getAllByRole("row")[1]).getByText("Partial Paid")).toBeTruthy();
    expect(within(screen.getAllByRole("row")[2]).getByText("Full Paid")).toBeTruthy();
    expect(screen.queryByRole("combobox")).toBeNull();
  });

  it("opens a tuition's payments from its row, and closes them again", () => {
    render(<AdminConfirmedJobsContent />);
    expect(screen.queryByRole("dialog")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Payments of Job ID 6804" }));
    expect(within(screen.getByRole("dialog", { name: "Payments" })).getByText("Payments of 5")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("opens the Tutor's own profile from the arrow, and says Not set where a detail is missing", () => {
    render(<AdminConfirmedJobsContent />);

    expect(screen.getByRole("link", { name: "Open the profile of Tania Sultana" }).getAttribute("href"))
      .toBe("/admin/tutor-profiles/tutor-175");
    expect(within(screen.getAllByRole("row")[2]).getAllByText("Not set")).toHaveLength(3);
  });

  it("gives a phone one card per job, carrying every column and the payments button", () => {
    window.innerWidth = 375;
    render(<AdminConfirmedJobsContent />);

    expect(screen.queryByRole("table")).toBeNull();
    const card = within(screen.getAllByRole("listitem")[0]);
    expect(card.getByText("6820")).toBeTruthy();
    expect(card.getByText("777")).toBeTruthy();
    expect(card.getByText("Tania Sultana")).toBeTruthy();
    expect(card.getByText("+8801711111111")).toBeTruthy();
    expect(card.getByText("Biology")).toBeTruthy();
    expect(card.getByText("Mohakhali, Dhaka")).toBeTruthy();
    expect(card.getByText("4 days / week")).toBeTruthy();
    expect(card.getByText("Partial Paid")).toBeTruthy();
    // The payments open from the card as they do from the row.
    fireEvent.click(card.getByRole("button", { name: "Payments of Job ID 6820" }));
    expect(screen.getByText("Payments of 21")).toBeTruthy();
    expect(card.getByRole("link", { name: "Open the profile of Tania Sultana" })).toBeTruthy();
  });

  it("searches from the first page", () => {
    render(<AdminConfirmedJobsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject, location or Tutor/), { target: { value: "777" } });
    expect(mocks.lastInput).toMatchObject({ query: "777", page: 1 });
  });
});

describe("the Confirmed Jobs page's two tabs", () => {
  it("opens on Confirmed, and moves to the tuitions that were cancelled afterwards", () => {
    render(<AdminConfirmedJobs />);

    expect(screen.getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Confirmed", "Cancelled"]);
    expect(screen.getByRole("tab", { name: "Confirmed" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.queryByText("Cancelled charges")).toBeNull();
    expect(screen.getAllByRole("columnheader").length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole("tab", { name: "Cancelled" }));
    expect(screen.getByRole("tab", { name: "Cancelled" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByText("Cancelled charges")).toBeTruthy();
    expect(screen.queryByRole("columnheader", { name: "Payment Status" })).toBeNull();
  });
});
