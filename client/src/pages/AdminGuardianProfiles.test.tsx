// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({
  lastQuery: null as Record<string, unknown> | null,
  notifyInput: null as unknown,
  notifyResult: { sent: 3, isError: false },
  historyInput: null as unknown,
  historyData: { items: [{ id: 1, audience: "guardian", title: "Past notice", message: "An earlier broadcast.", recipientCount: 6, sentByName: "Owner", sentByEmail: null, createdAt: "2026-09-20T00:00:00.000Z" }], total: 1, page: 1, pageSize: 20, totalPages: 1 },
  toasts: [] as string[],
}));

vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/pages/AdminGuardianActivity", () => ({
  GuardianActivityContent: () => <p>Request activity</p>,
  GuardianVerificationModal: () => null,
}));
vi.mock("sonner", () => ({ toast: { success: (message: string) => { state.toasts.push(message); }, error: (message: string) => { state.toasts.push(message); } } }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      listGuardianProfiles: {
        useQuery: (input: Record<string, unknown>) => {
          state.lastQuery = input;
          return {
            data: {
              items: [{ userId: 21, name: "Rina Akter", email: null, phone: "+8801711111111", guardianId: "778", verificationStatus: "verified", accountStatus: "active", joinedAt: "2026-09-01T00:00:00Z", tuitions: 3, pendingRequests: 1 }],
              counts: { all: 10, unverified: 8, verified: 1, rejected: 1 },
              total: 1,
              totalPages: 1,
            },
            isLoading: false, isError: false,
          };
        },
      },
      createPasswordResetLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }) },
      notifyGuardianDirectory: {
        useMutation: (options: { onSuccess?: (result: { sent: number }) => void; onError?: (error: { message: string }) => void }) => ({
          mutate: (input: unknown) => {
            state.notifyInput = input;
            state.notifyResult.isError ? options.onError?.({ message: "Could not send." }) : options.onSuccess?.({ sent: state.notifyResult.sent });
          },
          isPending: false,
        }),
      },
      listNotificationBroadcasts: {
        useQuery: (input: unknown) => {
          state.historyInput = input;
          return { data: state.historyData, isLoading: false, isError: false };
        },
      },
      getGuardianProfile: {
        useQuery: () => ({
          data: {
            name: "Rina Akter", guardianId: "778", verificationStatus: "unverified", verificationRejectionReason: null, phone: "+8801711111111",
            additionalPhone: null, email: null, profession: "Teacher", religion: null, nationality: null, addressDetails: null, socialLinks: null,
            emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null, heardAboutUs: null, accountCreatedAt: "2026-09-01T00:00:00Z",
            nidDocuments: { front: null, back: null },
          },
          isLoading: false, isError: false,
        }),
      },
    },
    accountChanges: {
      history: { useQuery: () => ({ data: [{ id: 9, type: "mobile", status: "pending", currentValue: "+8801711111111", requestedValue: "+8801822222222", reason: null, declineReason: null, createdAt: "2026-09-18T10:00:00Z", decidedAt: null, decidedByName: null }], isLoading: false, isError: false }) },
    },
  },
}));

import { AdminGuardianProfileDetailContent, AdminGuardianProfilesContent } from "./AdminGuardianProfiles";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.notifyInput = null;
  state.notifyResult = { sent: 3, isError: false };
  state.historyInput = null;
  state.toasts = [];
});

describe("Guardian Profiles", () => {
  it("lists one row per Guardian under counted verification tabs", () => {
    render(<AdminGuardianProfilesContent />);
    const tabs = screen.getByRole("tablist", { name: "Verification" });
    expect(within(tabs).getAllByRole("tab").map(tab => tab.textContent)).toEqual(["All 10", "Unverified 08", "Verified 01", "Rejected 01"]);
    expect(screen.getByRole("link", { name: "Rina Akter" }).getAttribute("href")).toBe("/admin/guardians/21");
    expect(screen.getByText("1 waiting")).toBeTruthy();
    expect(state.lastQuery).toEqual({ query: "", verification: "all", page: 1, pageSize: 20 });
  });

  it("opens one Guardian with the profile, the NID sides and the change requests", () => {
    render(<AdminGuardianProfileDetailContent userId={21} />);
    expect(screen.getByRole("heading", { name: "Rina Akter" })).toBeTruthy();
    expect(screen.getByText("Teacher")).toBeTruthy();
    expect(screen.getAllByText("No image")).toHaveLength(2);
    expect(screen.getByRole("heading", { name: "Change requests" })).toBeTruthy();
    expect(screen.getByText("+8801822222222")).toBeTruthy();
    expect(screen.getByRole("link", { name: "Open Change requests" }).getAttribute("href")).toBe("/admin/change-requests");
    expect(screen.getByRole("heading", { name: "Password reset" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Create reset link" })).toBeTruthy();
  });
});

describe("the card and filter panel over the Guardians", () => {
  const openPanel = async (user: ReturnType<typeof userEvent.setup>) => {
    await user.click(screen.getByRole("button", { name: /^Filter/ }));
    return screen.getByRole("region", { name: "Guardian filters" });
  };

  it("heads the list with its count, and keeps the buttons that act on it in the card", () => {
    render(<AdminGuardianProfilesContent />);

    const card = screen.getByRole("banner");
    expect(within(card).getByText("Guardians")).toBeTruthy();
    expect(within(card).getByText("1")).toBeTruthy();
    expect(within(card).getByText("guardian profiles")).toBeTruthy();
    expect(within(card).getByRole("button", { name: "History" })).toBeTruthy();
    expect(within(card).getByRole("button", { name: "Notify" })).toBeTruthy();
  });

  it("keeps History and Notify named for a screen reader and a long press, since a phone shows only their icons", () => {
    render(<AdminGuardianProfilesContent />);
    for (const name of ["History", "Notify"]) {
      const button = screen.getByRole("button", { name });
      expect(button.getAttribute("title")).toBe(name);
      expect(button.getAttribute("aria-label")).toBe(name);
      expect(button.querySelector("span.max-sm\\:sr-only")?.textContent).toBe(name);
      expect(button.className).toContain("max-sm:w-10");
    }
  });

  it("offers each box, and changes nothing until Apply", async () => {
    const user = userEvent.setup();
    render(<AdminGuardianProfilesContent />);
    const panel = await openPanel(user);

    expect(within(panel).getByText("guardians found").parentElement?.textContent).toContain("1");
    for (const name of ["Tuitions Posted", "Change Request", "Account Status"]) {
      expect(within(panel).getByRole("combobox", { name })).toBeTruthy();
    }
    for (const label of ["Joined Date From", "Joined Date To"]) expect(within(panel).getByLabelText(label)).toBeTruthy();

    fireEvent.change(within(panel).getByRole("combobox", { name: "Tuitions Posted" }), { target: { value: "many" } });
    expect(state.lastQuery).toEqual({ query: "", verification: "all", page: 1, pageSize: 20 });
  });

  it("lists, counts and Notifies by the same applied choices", async () => {
    const user = userEvent.setup();
    render(<AdminGuardianProfilesContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByRole("combobox", { name: "Tuitions Posted" }), { target: { value: "many" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Change Request" }), { target: { value: "has" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Account Status" }), { target: { value: "active" } });
    fireEvent.change(within(panel).getByLabelText("Joined Date From"), { target: { value: "2026-08-01" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));

    expect(state.lastQuery).toEqual({
      query: "", verification: "all", tuitions: "many", changeRequest: "has", accountStatus: "active", joinedFrom: new Date("2026-08-01T00:00:00"), page: 1, pageSize: 20,
    });
    expect(within(screen.getByRole("button", { name: /^Filter/ })).getByText("4")).toBeTruthy();
    expect(within(screen.getByRole("banner")).getByText("matching guardians")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: /^Review & send to/ }));
    fireEvent.click(screen.getByRole("button", { name: /^Confirm & send to/ }));
    expect(state.notifyInput).toEqual({
      query: "", verification: "all", tuitions: "many", changeRequest: "has", accountStatus: "active", joinedFrom: new Date("2026-08-01T00:00:00"), title: "Hi", message: "Hello there",
    });
  });

  it("keeps Apply waiting while the dates are the wrong way round, and Clear puts everything back", async () => {
    const user = userEvent.setup();
    render(<AdminGuardianProfilesContent />);
    const panel = await openPanel(user);

    fireEvent.change(within(panel).getByLabelText("Joined Date From"), { target: { value: "2026-09-10" } });
    fireEvent.change(within(panel).getByLabelText("Joined Date To"), { target: { value: "2026-09-01" } });
    expect(within(panel).getByText("The 'from' date cannot be later than the 'to' date.")).toBeTruthy();
    expect((within(panel).getByRole("button", { name: "Apply" }) as HTMLButtonElement).disabled).toBe(true);

    fireEvent.change(within(panel).getByLabelText("Joined Date To"), { target: { value: "2026-09-30" } });
    fireEvent.change(within(panel).getByRole("combobox", { name: "Account Status" }), { target: { value: "closed" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({ accountStatus: "closed" });

    await user.click(within(panel).getByRole("button", { name: "Clear" }));
    expect(state.lastQuery).toEqual({ query: "", verification: "all", page: 1, pageSize: 20 });
  });

  it("narrows the tab counts and the search together with the panel, from page one", async () => {
    const user = userEvent.setup();
    render(<AdminGuardianProfilesContent />);

    fireEvent.change(screen.getByPlaceholderText(/Search name, Guardian ID/i), { target: { value: "Rina" } });
    const panel = await openPanel(user);
    fireEvent.change(within(panel).getByRole("combobox", { name: "Tuitions Posted" }), { target: { value: "none" } });
    await user.click(within(panel).getByRole("button", { name: "Apply" }));
    expect(state.lastQuery).toMatchObject({ query: "Rina", tuitions: "none", page: 1 });
  });
});

describe("Guardian directory Notify", () => {
  it("sends to every Guardian the current filters match", () => {
    render(<AdminGuardianProfilesContent />);
    expect(screen.getByRole("banner").textContent).toContain("guardian profiles");

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Platform maintenance" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "We are pausing sign-ins tonight." } });
    fireEvent.click(screen.getByRole("button", { name: "Review & send to 1" }));
    // Nothing sent until the review step confirms it.
    expect(state.notifyInput).toBeNull();
    expect(screen.getByRole("dialog", { name: "Send this to Guardians?" }).textContent).toContain("We are pausing sign-ins tonight.");
    fireEvent.click(screen.getByRole("button", { name: "Confirm & send to 1" }));

    expect(state.notifyInput).toEqual({ query: "", verification: "all", title: "Platform maintenance", message: "We are pausing sign-ins tonight." });
    expect(state.toasts).toEqual(["Sent to 3 Guardians."]);
  });

  it("ticking a row switches to a hand-picked send targeting just that Guardian", () => {
    render(<AdminGuardianProfilesContent />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Rina Akter" }));
    expect(screen.getByRole("banner").textContent).toContain("1 selected.");

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByRole("dialog", { name: "Notify these Guardians" }).textContent).toContain("1 hand-picked Guardian");

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: "Review & send to 1" }));
    fireEvent.click(screen.getByRole("button", { name: "Confirm & send to 1" }));

    expect(state.notifyInput).toMatchObject({ guardianUserIds: [21] });
  });

  it("opens a read-only history of past broadcasts", () => {
    render(<AdminGuardianProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));

    const dialog = screen.getByRole("dialog", { name: "Sent notifications" });
    expect(within(dialog).getByText("Past notice")).toBeTruthy();
    expect(within(dialog).getByText("6 sent")).toBeTruthy();
    expect(state.historyInput).toEqual({ audience: "guardian", query: "", page: 1, pageSize: 20 });
  });
});
