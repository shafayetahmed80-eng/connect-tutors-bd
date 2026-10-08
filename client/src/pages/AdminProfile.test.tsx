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
  smsBackup: null as null | { maskedPhone: string },
  startSms: vi.fn(async () => ({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 })),
  confirmSms: vi.fn(async () => ({ maskedPhone: "+880171••••678" })),
  removeSms: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      adminProfile: { me: { invalidate: vi.fn() }, images: { invalidate: vi.fn() }, photo: { invalidate: vi.fn() } },
      admin: { getWorkspaceAccess: { invalidate: vi.fn() }, twoFactorStatus: { invalidate: vi.fn() } },
    }),
    admin: {
      twoFactorStatus: { useQuery: () => ({ data: { enrolled: true, verified: true, smsBackup: state.smsBackup }, isLoading: false }) },
      startTwoFactorSmsSetup: { useMutation: () => ({ mutateAsync: state.startSms, isPending: false }) },
      confirmTwoFactorSmsSetup: { useMutation: () => ({ mutateAsync: state.confirmSms, isPending: false }) },
      removeTwoFactorSmsBackup: { useMutation: () => ({ mutate: state.removeSms, isPending: false }) },
    },
    adminProfile: {
      me: { useQuery: () => ({ data: state.profile, isLoading: false, error: null }) },
      images: { useQuery: () => ({ data: { photo: null, nidFront: "https://signed/nid-front", nidBack: null } }) },
      update: { useMutation: () => ({ mutate: state.update, isPending: false }) },
      view: { useQuery: () => ({ data: { profile: { ...(state.profile as object), isOwner: false }, images: { photo: null, nidFront: null, nidBack: null } }, isLoading: false, error: null }) },
    },
    // The request history under another Admin's profile.
    accountChanges: {
      history: { useQuery: () => ({ data: [{ id: 4, type: "name", status: "declined", currentValue: "Nadia Rahman", requestedValue: "Nadia R", reason: null, declineReason: "Use the full name.", createdAt: "2026-09-18T10:00:00Z", decidedAt: "2026-09-18T12:00:00Z", decidedByName: "Site Admin" }], isLoading: false, isError: false }) },
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
  state.smsBackup = null;
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

  it("shows when and from where the Admin last signed in, or that they have not yet", () => {
    state.profile = { ...baseProfile, lastSignIn: { at: new Date(2026, 9, 8, 17, 15).toISOString(), ip: "203.0.113.9" } };
    const first = render(<AdminProfileContent />);

    expect(screen.getByText("Last sign-in")).toBeTruthy();
    expect(screen.getByText(/^8 Oct 2026, 5:15 ?pm · 203\.0\.113\.9$/i)).toBeTruthy();
    first.unmount();

    state.profile = { ...baseProfile, lastSignIn: null };
    render(<AdminProfileContent />);
    expect(screen.getByText("Not yet")).toBeTruthy();
  });

  it("lets another Admin edit the rest, but not their name or mobile - those are asked for from Settings", () => {
    render(<AdminProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: /Edit/ }));
    const dialog = screen.getByRole("dialog");
    expect(within(dialog).queryByLabelText("Name")).toBeNull();
    expect(within(dialog).queryByLabelText("Mobile")).toBeNull();
    fireEvent.change(within(dialog).getByLabelText("Designation"), { target: { value: "Senior Coordinator" } });
    fireEvent.click(within(dialog).getByRole("button", { name: "Save changes" }));
    expect(state.update).toHaveBeenCalledWith(expect.objectContaining({ designation: "Senior Coordinator", name: "Nadia Rahman" }));
  });

  it("lets the Project Owner edit name and mobile beside the rest, but not the email", () => {
    state.profile = { ...baseProfile, isOwner: true };
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
    state.profile = { ...baseProfile, isOwner: true };
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

describe("the backup SMS code on an Admin's own profile", () => {
  it("offers to add a number when none is set yet", () => {
    render(<AdminProfileContent />);
    expect(screen.getByRole("button", { name: "Add a backup number" })).toBeTruthy();
  });

  it("sends a code to the typed number, then confirms it to store the number", async () => {
    render(<AdminProfileContent />);

    fireEvent.click(screen.getByRole("button", { name: "Add a backup number" }));
    fireEvent.change(screen.getByPlaceholderText("+8801XXXXXXXXX"), { target: { value: "+8801812345678" } });
    fireEvent.click(screen.getByRole("button", { name: "Send code" }));
    await screen.findByText("Code sent to +8801812345678");
    expect(state.startSms).toHaveBeenCalledWith({ phone: "+8801812345678" });

    const codeBox = screen.getByLabelText("Code sent to +8801812345678");
    fireEvent.change(codeBox, { target: { value: "4821" } });
    fireEvent.click(screen.getByRole("button", { name: "Confirm" }));
    await screen.findByRole("button", { name: "Add a backup number" }); // the form closes once confirmed
    expect(state.confirmSms).toHaveBeenCalledWith({ phone: "+8801812345678", code: "4821" });
  });

  it("will not call for a code until the number looks like a real Bangladesh mobile", () => {
    render(<AdminProfileContent />);
    fireEvent.click(screen.getByRole("button", { name: "Add a backup number" }));
    fireEvent.change(screen.getByPlaceholderText("+8801XXXXXXXXX"), { target: { value: "not a number" } });
    expect((screen.getByRole("button", { name: "Send code" }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("shows the masked number already on file, with Change and Remove", () => {
    state.smsBackup = { maskedPhone: "+880171••••678" };
    render(<AdminProfileContent />);

    expect(screen.getByText("+880171••••678")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Add a backup number" })).toBeNull();

    vi.spyOn(window, "confirm").mockReturnValue(true);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(state.removeSms).toHaveBeenCalled();
  });

  it("leaves the number in place when the Admin backs out of removing it", () => {
    state.smsBackup = { maskedPhone: "+880171••••678" };
    render(<AdminProfileContent />);

    vi.spyOn(window, "confirm").mockReturnValue(false);
    fireEvent.click(screen.getByRole("button", { name: "Remove" }));
    expect(state.removeSms).not.toHaveBeenCalled();
  });
});

describe("another Admin's profile, as the Project Owner reads it", () => {
  it("shows the same profile with nothing to edit", () => {
    render(<AdminProfileOwnerViewContent userId={43} />);

    expect(screen.getByRole("heading", { name: "Nadia Rahman" })).toBeTruthy();
    expect(screen.queryByRole("button", { name: /Edit/ })).toBeNull();
    expect(screen.queryByRole("button", { name: /profile photo/ })).toBeNull();
    expect(screen.getByRole("link", { name: /Back to Admin Profiles/ }).getAttribute("href")).toBe("/admin/admin-profiles");
    // With the Admin's change requests below it.
    expect(screen.getByRole("heading", { name: "Change requests" })).toBeTruthy();
    expect(screen.getByText("Use the full name.")).toBeTruthy();
  });
});
