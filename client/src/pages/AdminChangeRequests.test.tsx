// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  isOwner: false,
  lastQuery: null as Record<string, unknown> | null,
  items: [] as Array<Record<string, unknown>>,
  decide: vi.fn(),
}));

vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ accountChanges: { list: { invalidate: vi.fn() }, pendingCount: { invalidate: vi.fn() } } }),
    admin: { getWorkspaceAccess: { useQuery: () => ({ data: { isOwner: state.isOwner } }) } },
    accountChanges: {
      list: {
        useQuery: (input: Record<string, unknown>) => {
          state.lastQuery = input;
          return { data: { items: state.items, counts: { pending: 2, approved: 5, declined: 1 } }, isLoading: false, isError: false };
        },
      },
      decide: { useMutation: () => ({ mutate: state.decide, isPending: false }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminChangeRequestsContent } from "./AdminChangeRequests";

const row = (change: Record<string, unknown>) => ({
  id: 1, userId: 21, role: "guardian", type: "name", status: "pending",
  currentValue: "Rina Akter", requestedValue: "Rina Begum", reason: null, declineReason: null,
  createdAt: "2026-09-18T10:00:00Z", decidedAt: null, accountName: "Rina Akter",
  tutorId: null, tutorNumber: null, guardianId: "G-1021", decidedByName: null, ...change,
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.items = [];
  state.isOwner = false;
});

describe("the Change requests queue", () => {
  it("counts each status, and shows a name change old to new", () => {
    state.items = [row({})];
    render(<AdminChangeRequestsContent />);
    const tabs = screen.getByRole("tablist", { name: "Request status" });
    expect(within(tabs).getAllByRole("tab").map(tab => tab.textContent)).toEqual(["Pending 02", "Approved 05", "Declined 01"]);
    expect(screen.getByText("Rina Begum")).toBeTruthy();
    expect(screen.getByText("Guardian ID G-1021")).toBeTruthy();
    expect(state.lastQuery).toEqual({ status: "pending", role: "all", type: "all" });
  });

  it("offers the Admin panel filter to the Project Owner only", () => {
    render(<AdminChangeRequestsContent />);
    expect(within(screen.getByLabelText("Panel")).queryByRole("option", { name: "Admin" })).toBeNull();
    cleanup();
    state.isOwner = true;
    render(<AdminChangeRequestsContent />);
    expect(within(screen.getByLabelText("Panel")).getByRole("option", { name: "Admin" })).toBeTruthy();
  });

  it("approves after saying what will happen", () => {
    state.items = [row({ type: "mobile", currentValue: "+8801711111111", requestedValue: "+8801822222222" })];
    render(<AdminChangeRequestsContent />);
    fireEvent.click(screen.getByRole("button", { name: /^Approve mobile number change/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).getByText(/the number this account signs in with/)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole("button", { name: "Approve" }));
    expect(state.decide).toHaveBeenCalledWith({ requestId: 1, decision: "approve" });
  });

  it("declines only with a reason", () => {
    state.items = [row({ type: "close_account", currentValue: null, requestedValue: null, reason: "Moving abroad" })];
    render(<AdminChangeRequestsContent />);
    expect(screen.getByText("Moving abroad")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^Decline account delete/ }));
    const dialog = screen.getByRole("dialog");
    const send = within(dialog).getByRole("button", { name: "Decline" }) as HTMLButtonElement;
    expect(send.disabled).toBe(true);
    fireEvent.change(within(dialog).getByLabelText(/Reason/), { target: { value: "A payment is still due." } });
    fireEvent.click(send);
    expect(state.decide).toHaveBeenCalledWith({ requestId: 1, decision: "decline", declineReason: "A payment is still due." });
  });
});
