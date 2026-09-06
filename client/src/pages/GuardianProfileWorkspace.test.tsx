// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: {
    name: "Rahima Begum",
    email: "rahima@example.test",
    phone: "+8801712345678",
    guardianId: "GD-8K4M29",
    gender: "female" as "male" | "female",
    cityLocationId: "dhaka",
    locationId: "mirpur",
    additionalPhone: null as string | null,
    religion: null as string | null,
    nationality: null as string | null,
    socialLinks: null as string | null,
    addressDetails: null as string | null,
    profession: null as string | null,
    emergencyContactName: null as string | null,
    emergencyContactPhone: null as string | null,
    emergencyContactRelation: null as string | null,
    emergencyContactAddress: null as string | null,
    emergencyContactProfession: null as string | null,
    heardAboutUs: null as string | null,
    verificationStatus: "unverified" as "unverified" | "verified" | "rejected",
    verificationRejectionReason: null as string | null,
    nidFrontUploaded: false,
    nidBackUploaded: false,
  },
  update: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    guardianProfile: {
      me: { useQuery: () => ({ data: mocks.profile, isLoading: false, error: null }) },
      photo: { useQuery: () => ({ data: { photoUrl: null } }) },
      identityDocuments: { useQuery: () => ({ data: { front: null, back: null } }) },
      update: { useMutation: (opts?: { onSuccess?: () => void }) => ({ mutate: (input: unknown) => { mocks.update(input); opts?.onSuccess?.(); }, isPending: false }) },
    },
    locations: { list: { useQuery: () => ({ data: [{ id: "dhaka", type: "city", label: "Dhaka" }, { id: "mirpur", type: "area", parentId: "dhaka", label: "Mirpur" }] }) } },
    useUtils: () => ({ guardianProfile: { me: { invalidate: vi.fn() }, photo: { invalidate: vi.fn() }, identityDocuments: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("sonner", () => ({ toast: { success: vi.fn(), error: vi.fn() } }));

import GuardianProfileWorkspace from "./GuardianProfileWorkspace";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mocks.profile.verificationStatus = "unverified";
  mocks.profile.verificationRejectionReason = null;
  mocks.profile.religion = null;
});

describe("GuardianProfileWorkspace", () => {
  it("shows both tabs as read-outs and marks empty optional fields", () => {
    render(<GuardianProfileWorkspace />);

    expect(screen.getByText("Guardian ID: GD-8K4M29")).toBeTruthy();
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(3);
    // Nationality defaults to Bangladeshi, so it is never a "Not set" row.
    expect(screen.getByText("Bangladeshi")).toBeTruthy();

    fireEvent.click(screen.getByRole("tab", { name: "Emergency Contact" }));
    expect(screen.getByText("Relation")).toBeTruthy();
    expect(screen.getByText("How did you hear about us")).toBeTruthy();
  });

  it("shows the rejection reason when verification failed", () => {
    mocks.profile.verificationStatus = "rejected";
    mocks.profile.verificationRejectionReason = "NID name does not match the profile name.";
    render(<GuardianProfileWorkspace />);

    expect(screen.getByText("Verification failed")).toBeTruthy();
    expect(screen.getByText("NID name does not match the profile name.")).toBeTruthy();
  });

  it("saves the edited Personal section through update, keeping the registration name", async () => {
    const user = userEvent.setup();
    render(<GuardianProfileWorkspace />);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const dialog = screen.getByRole("dialog");
    await user.type(within(dialog).getByLabelText("Profession"), "Banker");
    await user.click(within(dialog).getByRole("button", { name: "Save changes" }));

    await waitFor(() => expect(mocks.update).toHaveBeenCalled());
    expect(mocks.update).toHaveBeenCalledWith(expect.objectContaining({
      name: "Rahima Begum",
      profession: "Banker",
      gender: "female",
      cityLocationId: "dhaka",
    }));
  });

  it("uploads a NID card side to its private endpoint", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ nidDocumentStatus: "uploaded" }) });
    vi.stubGlobal("fetch", fetchMock);
    const user = userEvent.setup();
    render(<GuardianProfileWorkspace />);

    await user.click(screen.getAllByRole("button", { name: "Edit" })[0]);
    const dialog = screen.getByRole("dialog");
    const frontInput = within(dialog).getByText("NID card — front").parentElement!.querySelector('input[type="file"]') as HTMLInputElement;
    fireEvent.change(frontInput, { target: { files: [new File(["x"], "nid.png", { type: "image/png" })] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/guardian/nid-document/front",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
  });
});
