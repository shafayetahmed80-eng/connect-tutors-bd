// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  overview: { data: { items: [] as unknown[], credit: 0 }, isLoading: false, isError: false },
  accounts: { data: [] as Array<{ slotId: string; text: string | null }> },
  report: vi.fn(),
  invalidate: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ tutorPayments: { mine: { invalidate: state.invalidate } } }),
    tutorPayments: {
      mine: { useQuery: () => state.overview },
      report: { useMutation: () => ({ mutate: state.report, isPending: false }) },
    },
    siteContent: { list: { useQuery: () => state.accounts } },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import TutorPaymentsPanel from "./TutorPaymentsPanel";

const day = (offset: number) => new Date(Date.now() + offset * 86400000);
const asOverview = (items: unknown[], credit = 0) => ({ data: { items, credit }, isLoading: false, isError: false });
const charge = (over: Record<string, unknown> = {}) => ({
  status: "full_due", discounted: false, owed: 6000, paid: 0, balance: 6000, total: 6000, early: 5000, first: 3000, second: 3000,
  windowEndsAt: day(5), secondDueAt: day(25), ...over,
});
const tuition = (over: Record<string, unknown> = {}) => ({
  id: 21, tuitionType: "home", classCourse: "Class 10", subjects: JSON.stringify(["Biology"]), salary: 10000, kind: "home",
  confirmedAt: day(-2), cancelled: false, refund: null, charge: charge(), waiting: 0, payments: [], ...over,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.innerWidth = 1024;
  state.overview = asOverview([]);
  state.accounts = { data: [] };
});

describe("the Tutor's Payment tab", () => {
  it("says there is nothing to pay while no tuition of theirs is confirmed", () => {
    render(<TutorPaymentsPanel />);
    expect(screen.getByText("No confirmed tuition yet.")).toBeTruthy();
  });

  it("lists each confirmed tuition with what is owed, paid and left, and how it is charged", () => {
    state.overview = asOverview([tuition()]);
    render(<TutorPaymentsPanel />);

    expect(screen.getAllByRole("columnheader").map(head => head.textContent)).toEqual([
      "Job ID", "Payment Status", "Class", "Subjects", "Charged as", "Salary", "Charge", "Paid", "Balance", "Next payment", "Payments",
    ]);
    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("6820")).toBeTruthy();
    expect(row.getByText("Full Due")).toBeTruthy();
    expect(row.getByText("Class 10")).toBeTruthy();
    expect(row.getByText("Home Tutoring")).toBeTruthy();
    expect(row.getByText(/10,000/)).toBeTruthy();
  });

  it("asks first for what is left of the first instalment, while its window is open", () => {
    state.overview = asOverview([tuition({ charge: charge({ paid: 1000, balance: 5000, status: "partial_paid" }) })]);
    render(<TutorPaymentsPanel />);

    expect(within(screen.getAllByRole("row")[1]).getByText(/^2,000 Taka by /)).toBeTruthy();
  });

  it("asks for the whole balance once the first window has closed", () => {
    state.overview = asOverview([tuition({ charge: charge({ paid: 3000, balance: 3000, status: "half_paid", windowEndsAt: day(-1) }) })]);
    render(<TutorPaymentsPanel />);

    expect(within(screen.getAllByRole("row")[1]).getByText(/^3,000 Taka by /)).toBeTruthy();
  });

  it("asks for nothing once it is paid, and marks money that is still waiting on an Admin", () => {
    state.overview = asOverview([tuition({ charge: charge({ paid: 6000, balance: 0, status: "full_paid" }), waiting: 500 })]);
    render(<TutorPaymentsPanel />);

    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("Full Paid")).toBeTruthy();
    expect(row.getByText("500 Taka waiting")).toBeTruthy();
  });

  it("shows where to send the money only for a method the Owner has filled in", () => {
    state.accounts = { data: [
      { slotId: "payment.account.bkash", text: "01712345678 (Personal)" },
      { slotId: "payment.account.nagad", text: "  " },
    ] };
    render(<TutorPaymentsPanel />);

    const where = within(screen.getByRole("region", { name: "Where to pay" }));
    expect(where.getByText("bKash")).toBeTruthy();
    expect(where.getByText("01712345678 (Personal)")).toBeTruthy();
    expect(where.queryByText("Nagad")).toBeNull();
  });

  it("shows nothing about where to pay when the Owner has set no account", () => {
    render(<TutorPaymentsPanel />);
    expect(screen.queryByRole("region", { name: "Where to pay" })).toBeNull();
  });

  it("opens a tuition's payments with the schedule and the Tutor's own history", () => {
    state.overview = asOverview([tuition({ payments: [{ id: 1, amount: 3000, method: "bkash", reference: "9A8B7C", status: "submitted", paidAt: day(-1) }] })]);
    render(<TutorPaymentsPanel />);

    fireEvent.click(screen.getByRole("button", { name: "Payments" }));
    const dialog = within(screen.getByRole("dialog"));
    expect(dialog.getByText("Payments · Job ID 6820")).toBeTruthy();
    expect(dialog.getByRole("table", { name: "Schedule" })).toBeTruthy();
    expect(dialog.getByText(/bKash · 9A8B7C/)).toBeTruthy();
    expect(dialog.getByText("Waiting")).toBeTruthy();
  });

  it("reports a payment as the Tutor typed it", () => {
    state.overview = asOverview([tuition()]);
    render(<TutorPaymentsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Payments" }));

    fireEvent.change(screen.getByLabelText("Amount (Taka)"), { target: { value: "3000" } });
    fireEvent.change(screen.getByLabelText("Method"), { target: { value: "nagad" } });
    fireEvent.change(screen.getByLabelText("Transaction ID"), { target: { value: "TX99" } });
    fireEvent.change(screen.getByLabelText("Paid on"), { target: { value: "2026-09-14" } });
    fireEvent.click(screen.getByRole("button", { name: "Report payment" }));

    expect(state.report).toHaveBeenCalledTimes(1);
    expect(state.report).toHaveBeenCalledWith({ requestId: 21, amount: 3000, method: "nagad", reference: "TX99", paidOn: "2026-09-14", note: null });
  });

  it("offers no form for a tuition that is already paid", () => {
    state.overview = asOverview([tuition({ charge: charge({ paid: 6000, balance: 0, status: "full_paid" }) })]);
    render(<TutorPaymentsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Payments" }));

    expect(screen.queryByRole("form", { name: "Report a payment" })).toBeNull();
  });

  it("marks a cancelled tuition and asks for what it was settled at, not by a date", () => {
    state.overview = asOverview([tuition({
      cancelled: true,
      charge: charge({ owed: 1500, paid: 500, balance: 1000, status: "partial_paid" }),
    })]);
    render(<TutorPaymentsPanel />);

    const row = within(screen.getAllByRole("row")[1]);
    expect(row.getByText("Cancelled")).toBeTruthy();
    expect(row.getByText("1,000 Taka due")).toBeTruthy();
  });

  it("says what is coming back from a cancelled tuition, and what became of it", () => {
    state.overview = asOverview([
      tuition({ id: 21, cancelled: true, charge: charge({ owed: 1500, paid: 2500, balance: 0, status: "full_paid" }), refund: { amount: 1000, disposition: "credited" } }),
      tuition({ id: 22, cancelled: true, charge: charge({ owed: 1500, paid: 2500, balance: 0, status: "full_paid" }), refund: { amount: 1000, disposition: "refunded" } }),
    ]);
    render(<TutorPaymentsPanel />);

    expect(screen.getByText("Refund 1,000 Taka · credited")).toBeTruthy();
    expect(screen.getByText("Refund 1,000 Taka · being returned")).toBeTruthy();
  });

  it("leaves the instalment schedule out of a cancelled tuition's dialog", () => {
    state.overview = asOverview([tuition({ cancelled: true, charge: charge({ owed: 1500, paid: 500, balance: 1000, status: "partial_paid" }) })]);
    render(<TutorPaymentsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Payments" }));

    expect(screen.queryByRole("table", { name: "Schedule" })).toBeNull();
    expect(screen.getByRole("form", { name: "Report a payment" })).toBeTruthy();
  });

  it("shows the credit a Tutor holds, and nothing when they hold none", () => {
    state.overview = asOverview([tuition()], 700);
    const { unmount } = render(<TutorPaymentsPanel />);
    expect(within(screen.getByRole("region", { name: "Credit" })).getByText("700 Taka")).toBeTruthy();
    unmount();

    state.overview = asOverview([tuition()], 0);
    render(<TutorPaymentsPanel />);
    expect(screen.queryByRole("region", { name: "Credit" })).toBeNull();
  });

  it("offers a Tutor no way to report paying with credit", () => {
    state.overview = asOverview([tuition()]);
    render(<TutorPaymentsPanel />);
    fireEvent.click(screen.getByRole("button", { name: "Payments" }));

    const options = within(screen.getByLabelText("Method")).getAllByRole("option").map(option => option.textContent);
    expect(options).toEqual(["bKash", "Nagad", "Rocket", "Bank transfer", "Cash", "Other"]);
  });

  it("gives a phone one card per tuition", () => {
    window.innerWidth = 375;
    state.overview = asOverview([tuition()]);
    render(<TutorPaymentsPanel />);

    expect(screen.queryByRole("table")).toBeNull();
    const card = within(screen.getAllByRole("listitem")[0]);
    expect(card.getByText("6820")).toBeTruthy();
    expect(card.getByText("Full Due")).toBeTruthy();
    expect(card.getByRole("button", { name: "Payments" })).toBeTruthy();
  });

  it("says so when the payments cannot be loaded", () => {
    state.overview = { data: { items: [], credit: 0 }, isLoading: false, isError: true };
    render(<TutorPaymentsPanel />);
    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
  });
});
