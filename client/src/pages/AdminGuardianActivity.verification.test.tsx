// @vitest-environment jsdom
import { cleanup, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: {
    name: "Rahima Begum",
    guardianId: "GD-8K4M29",
    phone: "+8801712345678",
    email: "rahima@example.test",
    additionalPhone: null as string | null,
    religion: "Islam" as string | null,
    nationality: null as string | null,
    profession: null as string | null,
    addressDetails: null as string | null,
    socialLinks: null as string | null,
    emergencyContactName: null as string | null,
    emergencyContactPhone: null as string | null,
    emergencyContactRelation: null as string | null,
    heardAboutUs: null as string | null,
    verificationStatus: "unverified" as "unverified" | "verified" | "rejected",
    verificationRejectionReason: null as string | null,
    nidDocuments: { front: "https://signed/front", back: null as string | null },
  },
  setVerification: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    admin: {
      getGuardianProfile: { useQuery: () => ({ data: mocks.profile, isLoading: false, isError: false, error: null }) },
      setGuardianVerification: { useMutation: (opts?: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { mocks.setVerification(input); opts?.onSuccess?.(); }, isPending: false }) },
    },
    useUtils: () => ({ admin: { getGuardianProfile: { invalidate: vi.fn() }, listGuardianRequests: { invalidate: vi.fn() } } }),
  },
}));
vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import { GuardianVerificationModal } from "./AdminGuardianActivity";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.profile.verificationStatus = "unverified";
});

describe("GuardianVerificationModal", () => {
  it("shows the profile, the NID image, and marks 'verified' when saved", async () => {
    const user = userEvent.setup();
    render(<GuardianVerificationModal guardianUserId={501} onClose={vi.fn()} />);

    expect(screen.getByText("Guardian ID GD-8K4M29")).toBeTruthy();
    expect(screen.getByAltText("NID card front")).toBeTruthy();
    expect(screen.getByText("Not verified yet")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "verified" }));
    await user.click(screen.getByRole("button", { name: /save verification/i }));

    await waitFor(() => expect(mocks.setVerification).toHaveBeenCalledWith({ guardianUserId: 501, status: "verified", reason: undefined }));
  });

  it("blocks saving a rejection until a reason is typed, then sends it", async () => {
    const user = userEvent.setup();
    render(<GuardianVerificationModal guardianUserId={501} onClose={vi.fn()} />);

    await user.click(screen.getByRole("button", { name: "rejected" }));
    expect((screen.getByRole("button", { name: /save verification/i }) as HTMLButtonElement).disabled).toBe(true);

    await user.type(screen.getByPlaceholderText(/Reason the Guardian will see/i), "NID name does not match");
    await user.click(screen.getByRole("button", { name: /save verification/i }));

    await waitFor(() => expect(mocks.setVerification).toHaveBeenCalledWith({ guardianUserId: 501, status: "rejected", reason: "NID name does not match" }));
  });
});
