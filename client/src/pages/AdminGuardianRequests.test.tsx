// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lastQuery: null as Record<string, unknown> | null,
  items: [] as Array<Record<string, unknown>>,
  approveTuition: vi.fn(),
  declineTuition: vi.fn(),
  approveAppoint: vi.fn(),
  declineAppoint: vi.fn(),
}));

vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));
vi.mock("@/lib/trpc", () => {
  const invalidate = vi.fn();
  return {
    trpc: {
      useUtils: () => ({ admin: { listGuardianRequestActions: { invalidate }, guardianRequestCounts: { invalidate }, listAppliedTutors: { invalidate }, listPostedJobs: { invalidate }, listAppointedJobs: { invalidate }, listConfirmedJobs: { invalidate }, listTutorDirectory: { invalidate }, listTutorApplications: { invalidate } } }),
      admin: {
        listGuardianRequestActions: {
          useQuery: (input: Record<string, unknown>) => {
            state.lastQuery = input;
            return { data: { items: state.items, counts: { pending: 2, approved: 5, declined: 1 }, totalPages: 1 }, isLoading: false, isError: false };
          },
        },
        approveGuardianTuitionRequest: { useMutation: () => ({ mutate: state.approveTuition, isPending: false }) },
        declineGuardianTuitionRequest: { useMutation: () => ({ mutate: state.declineTuition, isPending: false }) },
        approveAppointmentRequest: { useMutation: () => ({ mutate: state.approveAppoint, isPending: false }) },
        declineAppointmentRequest: { useMutation: () => ({ mutate: state.declineAppoint, isPending: false }) },
      },
    },
  };
});

import { AdminGuardianRequestsContent } from "./AdminGuardianRequests";

const row = (change: Record<string, unknown>) => ({
  key: 1, requestId: 6873, type: "confirm", reason: null, status: "pending", createdAt: "2026-09-18T10:00:00Z", decidedAt: null,
  tuitionConfirmed: false, guardianUserId: 21, guardianName: "Rina Akter", guardianId: "778", tutorId: "tutor-175", tutorName: "Tania Sultana", tutorNumber: 777, ...change,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.items = [];
});

describe("Guardian Requests", () => {
  it("lists confirmation requests under counted status tabs, and approves after saying what happens", () => {
    state.items = [row({ guardianRequestId: 31 })];
    render(<AdminGuardianRequestsContent kind="confirm" />);

    const tabs = screen.getByRole("tablist", { name: "Request status" });
    expect(within(tabs).getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Pending 02", "Approved 05", "Declined 01"]);
    expect(state.lastQuery).toEqual({ kind: "confirm", status: "pending", page: 1 });
    expect(screen.getByRole("link", { name: "Rina Akter" }).getAttribute("href")).toBe("/admin/guardians/21");
    expect(screen.getByRole("link", { name: "Tania Sultana" }).getAttribute("href")).toBe("/admin/tutor-profiles/tutor-175");

    fireEvent.click(screen.getByRole("button", { name: /^Approve confirmation/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/The Guardian keeps the Tutor/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(state.approveTuition).toHaveBeenCalledWith({ guardianRequestId: 31 });
  });

  it("answers a cancellation under Cancel Requests with the Guardian's reason, and declines without a dialog", () => {
    state.items = [row({ type: "cancel_tuition", guardianRequestId: 32, tutorId: null, tutorName: null, tutorNumber: null, reason: "We found a Tutor elsewhere" })];
    render(<AdminGuardianRequestsContent kind="cancel" />);

    expect(screen.getByText("We found a Tutor elsewhere")).toBeTruthy();
    expect(screen.getByText("Cancel tuition")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Decline cancel tuition/ }));
    expect(state.declineTuition).toHaveBeenCalledWith({ guardianRequestId: 32 }, expect.anything());
  });

  it("appoints from the Appoint Requests screen, which has no status tabs", () => {
    state.items = [row({ type: "appoint", interestId: 55, key: 55 })];
    render(<AdminGuardianRequestsContent kind="appoint" />);

    expect(screen.queryByRole("tablist", { name: "Request status" })).toBeNull();
    fireEvent.click(screen.getByRole("button", { name: /^Approve appointment/ }));
    fireEvent.click(within(screen.getByRole("dialog")).getByRole("button", { name: "Approve" }));
    expect(state.approveAppoint).toHaveBeenCalledWith({ interestId: 55 });
  });

  it("shows the shortlist as a signal only: no Approve, no Decline", () => {
    state.items = [row({ type: "shortlist", key: 9 })];
    render(<AdminGuardianRequestsContent kind="shortlist" />);

    expect(screen.getByText("Rina Akter")).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Approve/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /Decline/ })).toBeNull();
    expect(screen.getByRole("link", { name: "13672" }).getAttribute("href")).toBe("/admin/applied-tutors/6873");
  });
});
