// @vitest-environment jsdom
import { cleanup, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ lastQuery: null as Record<string, unknown> | null }));

vi.mock("@/components/AdminWorkspaceLayout", () => ({ default: ({ children }: { children: React.ReactNode }) => <>{children}</> }));
vi.mock("@/hooks/useMobile", () => ({ useIsMobile: () => false }));
vi.mock("@/pages/AdminGuardianActivity", () => ({
  GuardianActivityContent: () => <p>Request activity</p>,
  GuardianVerificationModal: () => null,
}));
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
              totalPages: 1,
            },
            isLoading: false, isError: false,
          };
        },
      },
      createPasswordResetLink: { useMutation: () => ({ mutate: vi.fn(), isPending: false, isError: false, data: undefined }) },
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
