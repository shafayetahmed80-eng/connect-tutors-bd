// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: {
    name: "Rina Akter",
    email: "rina@example.test",
    phone: "+8801710000000",
    guardianId: "GD-8K4M29",
    gender: "female" as "male" | "female",
    cityLocationId: "dhaka",
    locationId: "mirpur",
    additionalPhone: null as string | null,
    religion: null, nationality: null, socialLinks: null, addressDetails: null, profession: null,
    emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null,
    emergencyContactAddress: null, emergencyContactProfession: null, heardAboutUs: null,
    verificationStatus: "unverified" as "unverified" | "verified" | "rejected",
    verificationRejectionReason: null as string | null,
    nidFrontUploaded: false,
    nidBackUploaded: false,
    accountCreatedAt: new Date("2026-08-21T00:00:00.000Z"),
  },
  photo: { photoUrl: null as string | null },
  invalidatePhoto: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Rina Akter", email: "rina@example.test", role: "guardian" } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    guardianProfile: {
      me: { useQuery: () => ({ data: mocks.profile, isLoading: false }) },
      photo: { useQuery: () => ({ data: mocks.photo, isLoading: false }) },
      identityDocuments: { useQuery: () => ({ data: { front: null, back: null }, isLoading: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      changePassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    locations: { list: { useQuery: () => ({ data: [{ id: "dhaka", type: "city", label: "Dhaka" }, { id: "mirpur", type: "area", parentId: "dhaka", label: "Mirpur" }] }) } },
    tutorRequests: { mine: { useQuery: () => ({ data: [], isLoading: false }) } },
    useUtils: () => ({ guardianProfile: { me: { invalidate: vi.fn() }, photo: { invalidate: mocks.invalidatePhoto }, identityDocuments: { invalidate: vi.fn() } } }),
  },
}));

vi.mock("./GuardianRequestTracking", () => ({ GuardianRequestTracking: () => null }));

import { GuardianDashboardContent } from "./GuardianDashboard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.photo = { photoUrl: null };
});

describe("Guardian profile identity rail photo", () => {
  it("shows the Guardian's initials until a photo is uploaded", () => {
    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByText("RA")).toBeTruthy();
    expect(screen.queryByAltText("Guardian profile photo")).toBeNull();
    expect(screen.getByRole("button", { name: /upload profile photo/i })).toBeTruthy();
  });

  it("shows the uploaded photo in the rail, with no moderation wording", () => {
    mocks.photo = { photoUrl: "https://signed.example/photo" };

    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByAltText("Guardian profile photo")).toBeTruthy();
    expect(screen.getByRole("button", { name: /replace profile photo/i })).toBeTruthy();
    expect(screen.queryByText(/pending/i)).toBeNull();
    expect(screen.queryByText(/review/i)).toBeNull();
  });

  it("uploads one selected image through the authenticated private endpoint then refreshes photo state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({ ok: true, json: async () => ({ photoStatus: "photo" }) });
    vi.stubGlobal("fetch", fetchMock);
    render(<GuardianDashboardContent section="profile" />);

    const input = screen.getByLabelText("Upload Guardian profile photo") as HTMLInputElement;
    fireEvent.change(input, { target: { files: [new File(["photo-bytes"], "guardian.png", { type: "image/png" })] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/guardian/profile-photo",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    await waitFor(() => expect(mocks.invalidatePhoto).toHaveBeenCalled());
    expect(await screen.findByText("Upload Successful")).toBeTruthy();
  });
});
