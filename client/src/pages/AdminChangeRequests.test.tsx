// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
    expect(state.lastQuery).toEqual({ status: "pending", role: "all", type: "all", query: "" });
  });

  it("offers the Admin panel filter to the Project Owner only", async () => {
    const user = userEvent.setup();
    render(<AdminChangeRequestsContent />);
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    expect(within(screen.getByLabelText("Panel")).queryByRole("option", { name: "Admin" })).toBeNull();
    cleanup();
    state.isOwner = true;
    render(<AdminChangeRequestsContent />);
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
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

describe("the card, search and filter panel over the Change requests", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: "Change requests filters" });
  };

  it("heads the queue with the count of the tab open, and follows the tab", () => {
    render(<AdminChangeRequestsContent />);
    let card = screen.getByRole("banner");
    expect(within(card).getByText("Change Requests")).toBeTruthy();
    expect(within(card).getByText("2")).toBeTruthy();
    expect(within(card).getByText("waiting for an answer")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Declined/ }));
    card = screen.getByRole("banner");
    expect(within(card).getByText("1")).toBeTruthy();
    expect(within(card).getByText("declined")).toBeTruthy();
  });

  it("sends the search, and names the narrowed queue", () => {
    render(<AdminChangeRequestsContent />);
    fireEvent.change(screen.getByPlaceholderText(/Search name, Guardian ID or Tutor ID/i), { target: { value: "Rina" } });
    expect(state.lastQuery).toMatchObject({ status: "pending", query: "Rina" });
    expect(within(screen.getByRole("banner")).getByText("matching requests")).toBeTruthy();
  });

  it("moves the Panel and Request boxes into the panel, changes nothing until Apply, then sends all of it", async () => {
    const user = userEvent.setup();
    render(<AdminChangeRequestsContent />);
    // They used to sit beside the tabs.
    expect(screen.queryByLabelText("Panel")).toBeNull();
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByRole("combobox", { name: "Panel" }), { target: { value: "tutor" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Request" }), { target: { value: "mobile" } });
    fireEvent.change(within(panel).getByLabelText("Requested Date From"), { target: { value: "2026-09-01" } });
    fireEvent.change(within(panel).getByLabelText("Requested Date To"), { target: { value: "2026-09-30" } });
    expect(state.lastQuery).toMatchObject({ role: "all", type: "all" });

    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({
      status: "pending", role: "tutor", type: "mobile",
      requestedFrom: new Date("2026-09-01T00:00:00"), requestedTo: new Date("2026-09-30T23:59:59.999"),
    });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("4")).toBeTruthy();

    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(state.lastQuery).toEqual({ status: "pending", role: "all", type: "all", query: "" });
  });

  it("asks for a decline reason on the Declined tab alone, and drops it when the Admin leaves", async () => {
    const user = userEvent.setup();
    render(<AdminChangeRequestsContent />);
    let panel = await openPanel(user);
    expect(within(panel).queryByLabelText("Decline Reason")).toBeNull();

    fireEvent.click(screen.getByRole("tab", { name: /Declined/ }));
    panel = screen.getByRole("region", { name: "Change requests filters" });
    fireEvent.change(within(panel).getByLabelText("Decline Reason"), { target: { value: "  payment  " } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({ status: "declined", declineReason: "payment" });

    fireEvent.click(screen.getByRole("tab", { name: /Pending/ }));
    expect(state.lastQuery).toMatchObject({ status: "pending" });
    expect(state.lastQuery).not.toHaveProperty("declineReason");
    expect(within(screen.getByRole("button", { name: /^Filter/ })).queryByText("1")).toBeNull();
  });

  it("keeps Apply waiting while the dates are the wrong way round", async () => {
    const user = userEvent.setup();
    render(<AdminChangeRequestsContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Requested Date From"), { target: { value: "2026-09-10" } });
    fireEvent.change(within(panel).getByLabelText("Requested Date To"), { target: { value: "2026-09-01" } });
    expect(within(panel).getByText("The 'from' date cannot be later than the 'to' date.")).toBeTruthy();
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });
});
