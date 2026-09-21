// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  lastInput: undefined as unknown,
  data: { items: [] as any[], total: 0, page: 1, pageSize: 20, totalPages: 1 },
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listCancelledCharges: { useQuery: (input: unknown) => { mocks.lastInput = input; return { data: mocks.data, isLoading: false, isError: false }; } },
    },
  },
}));
// The dialogs have their own tests; here they only have to open for the right tuition.
vi.mock("@/components/TuitionSettlementModal", () => ({
  default: ({ requestId, existing, onClose }: { requestId: number; existing: unknown; onClose: () => void }) =>
    <div role="dialog" aria-label="Settle"><span>Settle {requestId}</span><span>{existing ? "revising" : "fresh"}</span><button type="button" onClick={onClose}>Close</button></div>,
}));
vi.mock("@/components/TuitionPaymentsModal", () => ({
  default: ({ requestId }: { requestId: number }) => <div role="dialog" aria-label="Payments"><span>Payments {requestId}</span></div>,
}));

import AdminCancelledChargesContent from "./AdminCancelledCharges";

const charge = (over: Record<string, unknown> = {}) => ({ status: "full_paid", owed: 1500, paid: 2500, balance: 0, ...over });
const row = (over: Record<string, unknown>) => ({
  id: 21, classCourse: "Class 10", subjects: "[]", budgetAmount: 5000, tuitionType: "home",
  confirmedAt: new Date("2026-09-13T08:30:00.000Z"), cancelledAt: new Date("2026-09-20T08:30:00.000Z"), cancellationReason: null,
  tutorId: "tutor-175", tutorNumber: 777, tutorName: "Tania Sultana", tutorPhone: null,
  charge: charge(), settlement: null, ...over,
});

const settled = (over: Record<string, unknown>) => ({ retained: 1500, refund: 0, due: 0, disposition: "none", reason: "guardian_valid", ...over });

afterEach(() => { cleanup(); vi.clearAllMocks(); window.innerWidth = 1024; mocks.data = { items: [], total: 0, page: 1, pageSize: 20, totalPages: 1 }; });

describe("tuitions cancelled after they were confirmed", () => {
  it("says there is none, rather than showing an empty table", () => {
    render(<AdminCancelledChargesContent />);
    expect(screen.getByText("No cancelled job.")).toBeTruthy();
  });

  it("names the columns, and asks for the first page", () => {
    mocks.data = { ...mocks.data, items: [row({})], total: 1 };
    render(<AdminCancelledChargesContent />);

    expect(mocks.lastInput).toMatchObject({ query: "", page: 1 });
    expect(screen.getAllByRole("columnheader").map(cell => cell.textContent)).toEqual([
      "Job ID", "Settlement", "Tutor ID", "Name", "Confirmed", "Cancelled", "Payment Status", "Charge", "Paid", "Class", "Settle", "Payments", "Tutor profile",
    ]);
  });

  it("marks a tuition nobody has settled, and offers no payments for it yet", () => {
    mocks.data = { ...mocks.data, items: [row({})], total: 1 };
    render(<AdminCancelledChargesContent />);

    expect(screen.getByText("Not settled")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Payments of Job ID/ })).toBeNull();
  });

  it("says what came of a settlement: a refund, a balance still due, or nothing more", () => {
    mocks.data = { ...mocks.data, items: [
      row({ id: 21, settlement: settled({ refund: 1000, disposition: "credited" }) }),
      row({ id: 22, settlement: settled({ refund: 1000, disposition: "refunded" }) }),
      row({ id: 23, settlement: settled({ due: 500 }), charge: charge({ status: "partial_paid", paid: 1000, balance: 500 }) }),
      row({ id: 24, settlement: settled({}) }),
    ], total: 4 };
    render(<AdminCancelledChargesContent />);

    expect(screen.getByText("Refund 1,000 Taka · Credited")).toBeTruthy();
    expect(screen.getByText("Refund 1,000 Taka · Sent back")).toBeTruthy();
    expect(screen.getByText("Due 500 Taka")).toBeTruthy();
    expect(screen.getByText("Settled")).toBeTruthy();
  });

  it("opens a fresh settlement for an unsettled tuition, and a revision for a settled one", () => {
    mocks.data = { ...mocks.data, items: [row({ id: 21 }), row({ id: 22, settlement: settled({}) })], total: 2 };
    render(<AdminCancelledChargesContent />);

    fireEvent.click(screen.getByRole("button", { name: "Settle Job ID 6820" }));
    expect(within(screen.getByRole("dialog")).getByText("fresh")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close" }));

    fireEvent.click(screen.getByRole("button", { name: "Settle Job ID 6821" }));
    expect(within(screen.getByRole("dialog")).getByText("revising")).toBeTruthy();
  });

  it("opens the payments of a settled tuition", () => {
    mocks.data = { ...mocks.data, items: [row({ id: 22, settlement: settled({ due: 500 }), charge: charge({ balance: 500 }) })], total: 1 };
    render(<AdminCancelledChargesContent />);

    fireEvent.click(screen.getByRole("button", { name: "Payments of Job ID 6821" }));
    expect(screen.getByText("Payments 22")).toBeTruthy();
  });

  it("searches from the first page", () => {
    render(<AdminCancelledChargesContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search class, subject or Tutor/), { target: { value: "777" } });
    expect(mocks.lastInput).toMatchObject({ query: "777", page: 1 });
  });

  it("gives a phone one card per tuition", () => {
    window.innerWidth = 375;
    mocks.data = { ...mocks.data, items: [row({})], total: 1 };
    render(<AdminCancelledChargesContent />);

    expect(screen.queryByRole("table")).toBeNull();
    const card = within(screen.getAllByRole("listitem")[0]);
    expect(card.getByText("6820")).toBeTruthy();
    expect(card.getByText("Not settled")).toBeTruthy();
    expect(card.getByRole("button", { name: "Settle Job ID 6820" })).toBeTruthy();
  });
});
