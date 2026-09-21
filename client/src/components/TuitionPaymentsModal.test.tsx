// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  ledger: { data: undefined as unknown, isLoading: false, isError: false },
  record: vi.fn(),
  decide: vi.fn(),
  invalidateLedger: vi.fn(),
  invalidateJobs: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { listTuitionPayments: { invalidate: state.invalidateLedger }, listConfirmedJobs: { invalidate: state.invalidateJobs } } }),
    admin: {
      listTuitionPayments: { useQuery: () => state.ledger },
      recordTuitionPayment: { useMutation: () => ({ mutate: state.record, isPending: false }) },
      decideTuitionPayment: { useMutation: () => ({ mutate: state.decide, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import TuitionPaymentsModal from "./TuitionPaymentsModal";

const charge = {
  status: "half_paid", discounted: false, owed: 6000, paid: 3000, balance: 3000, total: 6000, early: 5000, first: 3000, second: 3000,
  windowEndsAt: new Date("2026-09-20T17:59:59.999Z"), secondDueAt: new Date("2026-10-13T17:59:59.999Z"),
};
const payment = (over: Record<string, unknown>) => ({
  id: 1, tutorId: "tutor-175", amount: 3000, method: "bkash", reference: "9A8B7C", status: "verified", source: "manual",
  paidAt: new Date("2026-09-15T06:00:00.000Z"), note: null, decidedAt: null, fromCurrentTutor: true, ...over,
});

const open = (ledger: unknown) => {
  state.ledger = { data: ledger, isLoading: false, isError: false };
  return render(<TuitionPaymentsModal requestId={21} onClose={vi.fn()} />);
};

afterEach(() => { cleanup(); vi.clearAllMocks(); state.ledger = { data: undefined, isLoading: false, isError: false }; });

describe("a tuition's payments", () => {
  it("names the tuition by its Job ID and shows what is owed, paid and left", () => {
    open({ charge, payments: [payment({})] });

    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText("Payments · Job ID 6820")).toBeTruthy();
    expect(within(dialog).getByText("Half Paid")).toBeTruthy();
    const summary = within(screen.getByRole("region", { name: "Charge" }));
    expect(summary.getAllByText(/6,000/).length).toBeGreaterThan(0);
    expect(summary.getAllByText(/3,000/).length).toBeGreaterThan(0);
  });

  it("lays out when each instalment falls due, and the reduced total for paying in full", () => {
    open({ charge, payments: [] });

    const schedule = within(screen.getByRole("table", { name: "Schedule" }));
    expect(schedule.getByText("First instalment")).toBeTruthy();
    expect(schedule.getByText("Second instalment")).toBeTruthy();
    expect(schedule.getByText("Paid in full")).toBeTruthy();
    expect(schedule.getByText(/5,000/)).toBeTruthy();
  });

  it("leaves out the reduced total when there is none to earn", () => {
    open({ charge: { ...charge, early: 6000 }, payments: [] });
    expect(screen.queryByText("Paid in full")).toBeNull();
  });

  it("marks a Tutor's earlier payment as not counting for the one who holds the tuition now", () => {
    open({ charge, payments: [payment({ id: 2, fromCurrentTutor: false })] });
    expect(screen.getByText("Previous Tutor")).toBeTruthy();
  });

  it("says when there are none yet", () => {
    open({ charge, payments: [] });
    expect(screen.getByText("No payments yet.")).toBeTruthy();
  });

  it("offers Verify and Reject only on a payment still waiting", () => {
    open({ charge, payments: [payment({ id: 5, status: "submitted", reference: "WAIT" }), payment({ id: 6, status: "verified", reference: "DONE" })] });

    expect(screen.getAllByRole("button", { name: "Verify" })).toHaveLength(1);
    fireEvent.click(screen.getByRole("button", { name: "Verify" }));
    expect(state.decide).toHaveBeenCalledWith({ paymentId: 5, decision: "verified" });

    fireEvent.click(screen.getByRole("button", { name: "Reject" }));
    expect(state.decide).toHaveBeenLastCalledWith({ paymentId: 5, decision: "rejected" });
  });

  it("records a payment with the amount, method, transaction id and day the Admin entered", () => {
    open({ charge, payments: [] });

    const record = screen.getByRole("button", { name: "Record payment" }) as HTMLButtonElement;
    expect(record.disabled).toBe(true);

    fireEvent.change(screen.getByLabelText("Amount (Taka)"), { target: { value: "3,000" } });
    fireEvent.change(screen.getByLabelText("Method"), { target: { value: "nagad" } });
    fireEvent.change(screen.getByLabelText("Transaction ID"), { target: { value: "  TX99 " } });
    fireEvent.change(screen.getByLabelText("Paid on"), { target: { value: "2026-09-14" } });
    expect(record.disabled).toBe(false);

    fireEvent.click(record);
    expect(state.record).toHaveBeenCalledTimes(1);
    expect(state.record).toHaveBeenCalledWith({ requestId: 21, amount: 3000, method: "nagad", reference: "TX99", paidOn: "2026-09-14", note: null });
  });

  it("keeps only digits in the amount, so a stray letter cannot become a payment", () => {
    open({ charge, payments: [] });
    const amount = screen.getByLabelText("Amount (Taka)") as HTMLInputElement;
    fireEvent.change(amount, { target: { value: "12ab5" } });
    expect(amount.value).toBe("125");
  });

  it("has nothing to record against a tuition with no salary", () => {
    open({ charge: null, payments: [] });

    expect(screen.getByText("This tuition has no salary, so there is no charge.")).toBeTruthy();
    expect(screen.queryByRole("form", { name: "Record a payment" })).toBeNull();
  });

  it("says so when the payments cannot be loaded", () => {
    state.ledger = { data: undefined, isLoading: false, isError: true };
    render(<TuitionPaymentsModal requestId={21} onClose={vi.fn()} />);
    expect(screen.getByRole("alert").textContent).toContain("could not be loaded");
  });
});
