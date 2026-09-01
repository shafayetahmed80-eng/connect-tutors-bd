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
    photoStatus: "no_photo" as "no_photo" | "pending_review" | "approved" | "rejected",
    photoUrl: null as string | null,
    rejectionReason: null as string | null,
    moderationNote: null as string | null,
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
  mocks.photo = { photoStatus: "no_photo", photoUrl: null, rejectionReason: null, moderationNote: null };
});

describe("Guardian photo profile experience", () => {
  it("uses the Guardian's initials instead of a photo until a photo is approved", () => {
    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByText("RA")).toBeTruthy();
    expect(screen.queryByAltText("Approved Guardian profile photo")).toBeNull();
  });

  it("offers a private profile-photo upload with truthful pending-review guidance", () => {
    mocks.photo = {
      photoStatus: "pending_review",
      photoUrl: "https://signed.example/pending-photo",
      rejectionReason: null,
      moderationNote: null,
    };

    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByRole("button", { name: /replace profile photo/i })).toBeTruthy();
    expect(screen.getByText("Photo pending Admin review")).toBeTruthy();
    expect(screen.getByText(/is not shown in the Guardian identity header until it is approved/i)).toBeTruthy();
    expect(screen.getByAltText("Guardian photo pending review")).toBeTruthy();
  });

  it("explains rejection safely and allows a new photo without exposing reviewer identity", () => {
    mocks.photo = {
      photoStatus: "rejected",
      photoUrl: "https://signed.example/rejected-photo",
      rejectionReason: "low_quality_or_unrelated_image",
      moderationNote: "Please use a clear, recent portrait.",
    };

    render(<GuardianDashboardContent section="profile" />);

    expect(screen.getByText("Photo needs replacement")).toBeTruthy();
    expect(screen.getByText(/clear, recent portrait/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /upload a new profile photo/i })).toBeTruthy();
    expect(screen.queryByText(/reviewed by/i)).toBeNull();
  });

  it("uploads one selected image through the authenticated private endpoint then refreshes photo state", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ photoStatus: "pending_review" }),
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
    expect(screen.getByText(/submitted for Admin review/i)).toBeTruthy();
  });
});
