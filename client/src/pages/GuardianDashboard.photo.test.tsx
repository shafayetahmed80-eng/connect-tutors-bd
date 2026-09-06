// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  profile: {
    name: "Rina Akter",
    email: "rina@example.test",
    guardianId: "GD-8K4M29",
    gender: "female",
    cityLocationId: "dhaka",
    locationId: "mirpur",
    accountCreatedAt: new Date("2026-08-21T00:00:00.000Z"),
  },
  photo: {
    photoStatus: "no_photo" as "no_photo" | "photo",
    photoUrl: null as string | null,
  },
  invalidatePhoto: vi.fn(),
}));

vi.mock("@/_core/hooks/useAuth", () => ({
  useAuth: () => ({ user: { name: "Rina Akter", email: "rina@example.test", role: "guardian" } }),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
      // Content overrides and notice blocks are cosmetic; empty lists keep the
      // copy and layout the code ships with.
      siteContent: { list: { useQuery: () => ({ data: [], isLoading: false, isError: false }) }, listBlocks: { useQuery: () => ({ data: [], isLoading: false, isError: false }) } },
    guardianProfile: {
      me: { useQuery: () => ({ data: mocks.profile, isLoading: false }) },
      photo: { useQuery: () => ({ data: mocks.photo, isLoading: false }) },
      update: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
      changePassword: { useMutation: () => ({ mutate: vi.fn(), isPending: false }) },
    },
    locations: { list: { useQuery: () => ({ data: [{ id: "dhaka", type: "city", label: "Dhaka" }, { id: "mirpur", type: "area", parentId: "dhaka", label: "Mirpur" }] }) } },
    tutorRequests: { mine: { useQuery: () => ({ data: [], isLoading: false }) } },
    useUtils: () => ({ guardianProfile: { me: { invalidate: vi.fn() }, photo: { invalidate: mocks.invalidatePhoto } } }),
  },
}));

vi.mock("./GuardianRequestTracking", () => ({ GuardianRequestTracking: () => null }));

import { GuardianDashboardContent } from "./GuardianDashboard";

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
  mocks.photo = { photoStatus: "no_photo", photoUrl: null };
});

describe("Guardian photo profile experience", () => {
  it("uses the Guardian's initials until a photo is uploaded", () => {
    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByText("RA")).toBeTruthy();
    expect(screen.queryByAltText("Guardian profile photo")).toBeNull();
    expect(screen.getByText("No profile photo yet")).toBeTruthy();
  });

  it("shows the uploaded photo at once, with no moderation wording", () => {
    mocks.photo = { photoStatus: "photo", photoUrl: "https://signed.example/photo" };

    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByRole("button", { name: /replace profile photo/i })).toBeTruthy();
    expect(screen.getByAltText("Guardian profile photo")).toBeTruthy();
    expect(screen.getByText("Profile photo added")).toBeTruthy();
    expect(screen.queryByText(/pending/i)).toBeNull();
    expect(screen.queryByText(/review/i)).toBeNull();
  });

  it("uploads one selected image through the authenticated private endpoint then refreshes photo state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photoStatus: "photo" }),
    });
    vi.stubGlobal("fetch", fetchMock);
    render(<GuardianDashboardContent section="profile" />);

    const input = screen.getByLabelText("Upload Guardian profile photo") as HTMLInputElement;
    const photo = new File(["photo-bytes"], "guardian.png", { type: "image/png" });
    fireEvent.change(input, { target: { files: [photo] } });

    await waitFor(() => expect(fetchMock).toHaveBeenCalledWith(
      "/api/guardian/profile-photo",
      expect.objectContaining({ method: "POST", credentials: "same-origin" }),
    ));
    await waitFor(() => expect(mocks.invalidatePhoto).toHaveBeenCalled());
    expect(screen.getByText(/shown in your Guardian identity header/i)).toBeTruthy();
    expect(await screen.findByText("Upload Successful")).toBeTruthy();
  });
});
