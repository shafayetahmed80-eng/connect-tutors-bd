// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import { Phone, UserRound, Trash2 } from "lucide-react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const state = vi.hoisted(() => ({ mutate: vi.fn() }));

vi.mock("@/lib/trpc", () => ({
  trpc: { account: { changePassword: { useMutation: () => ({ mutate: state.mutate, isPending: false }) } } },
}));
vi.mock("sonner", () => ({ toast: Object.assign(vi.fn(), { success: vi.fn(), error: vi.fn() }) }));

import { AccountSettings, ChangePasswordForm, type AccountSettingsItem } from "./AccountSettings";

const items: AccountSettingsItem[] = [
  { key: "name", label: "Name", icon: UserRound, value: "Nadia Rahman", content: <p>Name panel</p> },
  { key: "mobile", label: "Mobile Number", shortLabel: "Mobile", icon: Phone, value: "01711111111", status: { label: "Pending", tone: "waiting" }, content: <p>Mobile panel</p> },
  { key: "verification", label: "Profile Verification", icon: Phone, value: "Not verified", alwaysOpen: true, content: <p>Verification panel</p> },
  { key: "delete", label: "Account Delete", icon: Trash2, value: "Active", danger: true, content: <p>Delete panel</p> },
];

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.history.replaceState(null, "", "/");
  window.innerWidth = 1024;
});

describe("the Settings page on a laptop", () => {
  it("keeps one small button per setting on a single line, and opens the first by default", () => {
    window.history.replaceState(null, "", "/admin/settings");
    render(<AccountSettings items={items} basePath="/admin/settings" />);

    const nav = screen.getByRole("navigation", { name: "Account settings" });
    expect(nav.style.gridTemplateColumns).toBe("repeat(4, minmax(0, 1fr))");
    const buttons = within(nav).getAllByRole("button");
    // A state worth noticing is named to a screen reader, and marked with a dot.
    expect(buttons.map(button => button.getAttribute("aria-label"))).toEqual(["Name", "Mobile Number: Pending", "Profile Verification", "Account Delete"]);
    expect(buttons[0].getAttribute("aria-current")).toBe("page");
    expect(screen.getByRole("heading", { name: "Name" })).toBeTruthy();
    expect(screen.getByText("Name panel")).toBeTruthy();
  });

  it("opens the setting the address names, and puts a chosen one in the address", () => {
    window.history.replaceState(null, "", "/admin/settings?item=mobile");
    render(<AccountSettings items={items} basePath="/admin/settings" />);
    expect(screen.getByText("Mobile panel")).toBeTruthy();

    // The chosen setting's state is spelled out beside its heading.
    expect(screen.getByText("Pending")).toBeTruthy();

    fireEvent.click(screen.getByRole("button", { name: /Account Delete/ }));
    expect(window.location.search).toBe("?item=delete");
    expect(screen.getByText("Delete panel")).toBeTruthy();
  });

  it("falls back to the first setting for an unknown one", () => {
    window.history.replaceState(null, "", "/admin/settings?item=nothing");
    render(<AccountSettings items={items} basePath="/admin/settings" />);
    expect(screen.getByText("Name panel")).toBeTruthy();
  });
});

describe("the Settings page on a phone", () => {
  it("lists a card per setting with its value and a pencil, verification open from the start and deletion folded shut", () => {
    window.innerWidth = 375;
    window.history.replaceState(null, "", "/tutor/dashboard/settings");
    render(<AccountSettings items={items} basePath="/tutor/dashboard/settings" />);

    const list = screen.getByRole("list", { name: "Account settings" });
    expect(within(list).getAllByRole("listitem")).toHaveLength(4);
    expect(screen.getByText("Nadia Rahman")).toBeTruthy();
    expect(screen.getByText("Verification panel")).toBeTruthy();
    expect(screen.queryByText("Name panel")).toBeNull();
    expect(screen.queryByText("Delete panel")).toBeNull();
    // Verification needs no pencil; the rest open in place.
    expect(screen.queryByRole("button", { name: /Profile Verification/ })).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change Name" }));
    expect(window.location.search).toBe("?item=name");
    expect(screen.getByText("Name panel")).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: "Close Name" }));
    expect(screen.queryByText("Name panel")).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: "Change Account Delete" }));
    expect(screen.getByText("Delete panel")).toBeTruthy();
  });
});

describe("changing one's own password", () => {
  it("will not send new passwords that do not match", () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: "new-password-2" } });
    expect(screen.getByText("New passwords do not match.")).toBeTruthy();
    expect((screen.getByRole("button", { name: /Change password/ }) as HTMLButtonElement).disabled).toBe(true);
  });

  it("sends the current password and the new one", () => {
    render(<ChangePasswordForm />);

    fireEvent.change(screen.getByLabelText("Current password"), { target: { value: "old-password" } });
    fireEvent.change(screen.getByLabelText("New password"), { target: { value: "new-password-1" } });
    fireEvent.change(screen.getByLabelText(/Confirm new password/), { target: { value: "new-password-1" } });
    fireEvent.click(screen.getByRole("button", { name: /Change password/ }));
    expect(state.mutate).toHaveBeenCalledWith({ currentPassword: "old-password", newPassword: "new-password-1", confirmNewPassword: "new-password-1" });
  });
});
