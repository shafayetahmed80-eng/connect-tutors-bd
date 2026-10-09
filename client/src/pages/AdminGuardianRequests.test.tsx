// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
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
            return { data: { items: state.items, counts: { pending: 2, approved: 5, declined: 1 }, total: 2, totalPages: 1 }, isLoading: false, isError: false };
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
    expect(state.lastQuery).toEqual({ kind: "confirm", status: "pending", page: 1, pageSize: 20, query: "" });
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

describe("the card, search and filter panel over the requests", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>, title: string) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: `${title} filters` });
  };

  it("heads each screen with its own name and the count of the tab open, and says what the number counts", () => {
    state.items = [row({ guardianRequestId: 31 })];
    const { unmount } = render(<AdminGuardianRequestsContent kind="confirm" />);
    const card = screen.getByRole("banner");
    expect(within(card).getByText("Confirm Requests")).toBeTruthy();
    expect(within(card).getByText("2")).toBeTruthy();
    expect(within(card).getByText("waiting for an answer")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: /Approved/ }));
    expect(within(screen.getByRole("banner")).getByText("approved")).toBeTruthy();
    unmount();

    state.items = [row({ type: "shortlist", key: 9 })];
    render(<AdminGuardianRequestsContent kind="shortlist" />);
    expect(within(screen.getByRole("banner")).getByText("applicants shortlisted")).toBeTruthy();
  });

  it("sends the search with the page, from page one, and names the narrowed list", () => {
    state.items = [row({ guardianRequestId: 31 })];
    render(<AdminGuardianRequestsContent kind="confirm" />);

    fireEvent.change(screen.getByPlaceholderText(/Search Job ID, Guardian or Tutor/i), { target: { value: "Rina" } });
    expect(state.lastQuery).toMatchObject({ kind: "confirm", status: "pending", query: "Rina", page: 1 });
    expect(within(screen.getByRole("banner")).getByText("matching requests")).toBeTruthy();
  });

  it("offers each box, and changes nothing until Apply, then sends what was chosen", async () => {
    const user = userEvent.setup();
    state.items = [row({ guardianRequestId: 31 })];
    render(<AdminGuardianRequestsContent kind="confirm" />);
    const panel = await openPanel(user, "Confirm Requests");

    for (const name of ["Posted By", "Tuition Stage"]) expect(within(panel).getByRole("combobox", { name })).toBeTruthy();
    for (const label of ["Requested Date From", "Requested Date To"]) expect(within(panel).getByLabelText(label)).toBeTruthy();
    // Only the Cancel screen holds two kinds of request.
    expect(within(panel).queryByRole("combobox", { name: "Request" })).toBeNull();

    fireEvent.change(within(panel).getByRole("combobox", { name: "Posted By" }), { target: { value: "admin" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Tuition Stage" }), { target: { value: "confirmed" } });
    fireEvent.change(within(panel).getByLabelText("Requested Date From"), { target: { value: "2026-09-01" } });
    expect(state.lastQuery).not.toHaveProperty("filters", expect.anything());

    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({
      kind: "confirm", status: "pending", page: 1,
      filters: { postedBy: "admin", tuitionStage: "confirmed", requestedFrom: new Date("2026-09-01T00:00:00") },
    });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("3")).toBeTruthy();

    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(state.lastQuery?.filters).toBeUndefined();
  });

  it("lets the Cancel screen tell a removal from a cancellation, and the Shortlist screen call its date what it is", async () => {
    const user = userEvent.setup();
    state.items = [row({ type: "cancel_tuition", guardianRequestId: 32 })];
    const { unmount } = render(<AdminGuardianRequestsContent kind="cancel" />);
    let panel = await openPanel(user, "Cancel Requests");
    fireEvent.change(within(panel).getByRole("combobox", { name: "Request" }), { target: { value: "remove_tutor" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({ kind: "cancel", filters: { requestType: "remove_tutor" } });
    unmount();

    state.items = [row({ type: "shortlist", key: 9 })];
    render(<AdminGuardianRequestsContent kind="shortlist" />);
    panel = await openPanel(user, "Shortlist Requests");
    expect(within(panel).getByLabelText("Shortlisted Date From")).toBeTruthy();
    expect(within(panel).queryByRole("combobox", { name: "Request" })).toBeNull();
  });

  it("keeps Apply waiting while the dates are the wrong way round", async () => {
    const user = userEvent.setup();
    render(<AdminGuardianRequestsContent kind="confirm" />);
    const panel = await openPanel(user, "Confirm Requests");

    fireEvent.change(within(panel).getByLabelText("Requested Date From"), { target: { value: "2026-09-10" } });
    fireEvent.change(within(panel).getByLabelText("Requested Date To"), { target: { value: "2026-09-01" } });
    expect(within(panel).getByText("The 'from' date cannot be later than the 'to' date.")).toBeTruthy();
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("puts the screen back to its own tab, search and panel when the sidebar moves to another kind", async () => {
    const user = userEvent.setup();
    const { rerender } = render(<AdminGuardianRequestsContent kind="confirm" />);
    fireEvent.change(screen.getByPlaceholderText(/Search Job ID, Guardian or Tutor/i), { target: { value: "Rina" } });
    const panel = await openPanel(user, "Confirm Requests");
    fireEvent.change(within(panel).getByRole("combobox", { name: "Posted By" }), { target: { value: "guardian" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({ query: "Rina", filters: { postedBy: "guardian" } });

    rerender(<AdminGuardianRequestsContent kind="cancel" />);
    expect(state.lastQuery).toMatchObject({ kind: "cancel", status: "pending", query: "", page: 1 });
    expect(state.lastQuery?.filters).toBeUndefined();
  });
});
