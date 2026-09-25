// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
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

describe("Guardian directory Notify", () => {
  it("sends to every Guardian the current filters match", () => {
    render(<AdminGuardianProfilesContent />);
    expect(screen.getByTestId("guardian-notify-match-count").textContent).toContain("1 Guardian matches the current filters.");

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Platform maintenance" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "We are pausing sign-ins tonight." } });
    fireEvent.click(screen.getByRole("button", { name: "Send to 1" }));

    expect(state.notifyInput).toEqual({ query: "", verification: "all", title: "Platform maintenance", message: "We are pausing sign-ins tonight." });
    expect(state.toasts).toEqual(["Sent to 3 Guardians."]);
  });

  it("ticking a row switches to a hand-picked send targeting just that Guardian", () => {
    render(<AdminGuardianProfilesContent />);

    fireEvent.click(screen.getByRole("checkbox", { name: "Select Rina Akter" }));
    expect(screen.getByTestId("guardian-notify-match-count").textContent).toContain("1 Guardian selected.");

    fireEvent.click(screen.getByRole("button", { name: "Notify" }));
    expect(screen.getByRole("dialog", { name: "Notify these Guardians" }).textContent).toContain("1 hand-picked Guardian");

    fireEvent.change(screen.getByLabelText(/^Title/), { target: { value: "Hi" } });
    fireEvent.change(screen.getByLabelText(/^Message/), { target: { value: "Hello there" } });
    fireEvent.click(screen.getByRole("button", { name: "Send to 1" }));

    expect(state.notifyInput).toMatchObject({ guardianUserIds: [21] });
  });

  it("opens a read-only history of past broadcasts", () => {
    render(<AdminGuardianProfilesContent />);
    fireEvent.click(screen.getByRole("button", { name: "History" }));

    const dialog = screen.getByRole("dialog", { name: "Sent notifications" });
    expect(within(dialog).getByText("Past notice")).toBeTruthy();
    expect(within(dialog).getByText("6 sent")).toBeTruthy();
    expect(state.historyInput).toEqual({ audience: "guardian", page: 1, pageSize: 20 });
  });
});
