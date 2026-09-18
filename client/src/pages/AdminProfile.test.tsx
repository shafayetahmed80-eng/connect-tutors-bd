// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const baseProfile = {
  userId: 43, name: "Nadia Rahman", email: "nadia@example.com", loginId: "nadia", isOwner: false,
  phone: "01711111111", additionalPhone: null, gender: null, religion: "Islam", nationality: null,
  cityLocationId: "dhaka", locationId: "gulshan", addressDetails: "House 4", designation: "Coordinator",
  emergencyContactName: null, emergencyContactPhone: null, emergencyContactRelation: null, emergencyContactAddress: null, emergencyContactProfession: null,
  photoUploaded: false, nidFrontUploaded: true, nidBackUploaded: false,
};

const state = vi.hoisted(() => ({
  profile: null as unknown,
  update: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      adminProfile: { me: { invalidate: vi.fn() }, images: { invalidate: vi.fn() }, photo: { invalidate: vi.fn() } },
      admin: { getWorkspaceAccess: { invalidate: vi.fn() } },
    }),
    adminProfile: {
      me: { useQuery: () => ({ data: state.profile, isLoading: false, error: null }) },
      images: { useQuery: () => ({ data: { photo: null, nidFront: "https://signed/nid-front", nidBack: null } }) },
      update: { useMutation: () => ({ mutate: state.update, isPending: false }) },
      view: { useQuery: () => ({ data: { profile: { ...(state.profile as object), isOwner: false }, images: { photo: null, nidFront: null, nidBack: null } }, isLoading: false, error: null }) },
    },
    locations: {
      list: { useQuery: () => ({ data: [
        { id: "dhaka", label: "Dhaka", type: "city", parentId: null },
        { id: "gulshan", label: "Gulshan", type: "area", parentId: "dhaka" },
      ] }) },
    },
  },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AdminProfileContent, AdminProfileOwnerViewContent } from "./AdminProfile";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  state.profile = baseProfile;
});
state.profile = baseProfile;

describe("an Admin's own profile", () => {
  it("heads the page with the Admin's identity and what is still unset", () => {
    render(<AdminProfileContent />);

    expect(screen.getByRole("heading", { name: "Nadia Rahman" })).toBeTruthy();
    expect(screen.getByText("User ID: nadia")).toBeTruthy();
    expect(screen.getByText("Administrator")).toBeTruthy();
    expect(screen.getByText("nadia@example.com")).toBeTruthy();
    expect(screen.getByText("House 4, Gulshan, Dhaka")).toBeTruthy();
    expect(screen.getByText(/Profile completed: \d+%/)).toBeTruthy();
    // An unset field reads "Not set"; an uploaded NID side can be opened.
    expect(screen.getAllByText("Not set").length).toBeGreaterThan(0);
    expect(screen.getByRole("link", { name: "View" }).getAttribute("href")).toBe("https://signed/nid-front");
    expect(screen.getByRole("button", { name: "Upload profile photo" })).toBeTruthy();
  });

  it("edits name and mobile beside the rest, but not the email", () => {
    render(<AdminProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByDisplayValue("nadia@example.com")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: "Nadia R." } });
    fireEvent.change(within(dialog).getByLabelText("Mobile"), { target: { value: "01822222222" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));

    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({
      name: "Nadia R.", phone: "01822222222", gender: null, religion: "Islam", cityLocationId: "dhaka", locationId: "gulshan", designation: "Coordinator",
    }));
  });

  it("will not save a name shorter than two letters", () => {
    render(<AdminProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");
    fireEvent.change(within(dialog).getByLabelText("Name"), { target: { value: " N " } });
    expect((within(dialog).getByRole("button", { name: "Save changes" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("opens the Emergency Contact editor from its own tab", () => {
    render(<AdminProfileContent />);

    fireEvent.click(screen.getByRole("tab", { name: "Emergency Contact" }));
    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    expect(within(screen.getByRole("dialog")).getByLabelText("Contact name")).toBeTruthy();
  });
});

describe("another Admin's profile, as the Project Owner reads it", () => {
  it("shows the same profile with nothing to edit", () => {
    render(<AdminProfileOwnerViewContent userId={43} />);

    expect(screen.getByRole("heading", { name: "Nadia Rahman" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /profile photo/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Back to Admin security/ }).getAttribute("href")).toBe("/admin/security");
  });
});
