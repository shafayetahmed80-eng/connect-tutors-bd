// @vitest-environment jsdom
import { act, cleanup, fireEvent, render, screen, waitFor } from "@testing-library/react";
import React from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  user: { id: 5, name: "Rahim", role: "admin" } as null | { id: number; name: string; role: string },
  authLoading: false,
  access: { data: { passwordChangeRequired: true } as unknown, isLoading: false },
  change: vi.fn(),
  invalidate: vi.fn(),
  logout: vi.fn(),
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => <header /> }));
vi.mock("@/components/SiteFooter", () => ({ default: () => <footer /> }));
vi.mock("@/_core/hooks/useAuth", () => ({ useAuth: () => ({ user: mocks.user, loading: mocks.authLoading, logout: mocks.logout }) }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ admin: { getWorkspaceAccess: { invalidate: mocks.invalidate } } }),
    admin: { getWorkspaceAccess: { useQuery: () => mocks.access } },
    account: { changePassword: { useMutation: () => ({ mutateAsync: mocks.change, isPending: false }) } },
  },
}));
// The password fields live in the Security page, which pulls in the whole Admin workspace.
vi.mock("@/pages/AdminSecurityWorkspace", () => ({
  CredentialPasswordFields: (props: { password: string; confirmPassword: string; onPasswordChange: (v: string) => void; onConfirmPasswordChange: (v: string) => void }) => <>
    <input aria-label="New password" value={props.password} onChange={event => props.onPasswordChange(event.target.value)} />
    <input aria-label="Confirm new password" value={props.confirmPassword} onChange={event => props.onConfirmPasswordChange(event.target.value)} />
  </>,
}));

import AdminPasswordChange from "./AdminPasswordChange";

function fill(current: string, next: string, confirm = next) {
  fireEvent.change(screen.getByLabelText("Temporary password"), { target: { value: current } });
  fireEvent.change(screen.getByLabelText("New password"), { target: { value: next } });
  fireEvent.change(screen.getByLabelText("Confirm new password"), { target: { value: confirm } });
}

beforeEach(() => {
  mocks.user = { id: 5, name: "Rahim", role: "admin" };
  mocks.authLoading = false;
  mocks.access = { data: { passwordChangeRequired: true }, isLoading: false };
  mocks.change.mockResolvedValue({ changed: true });
  mocks.invalidate.mockResolvedValue(undefined);
  window.history.pushState({}, "", "/admin/change-password");
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe("the temporary-password change page", () => {
  it("saves the new password, then goes on to the workspace", async () => {
    render(<AdminPasswordChange />);
    fill("temporary-pass-1", "my-own-password-2");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save password" })); });

    expect(mocks.change).toHaveBeenCalledWith({ currentPassword: "temporary-pass-1", newPassword: "my-own-password-2", confirmNewPassword: "my-own-password-2" });
    await waitFor(() => expect(window.location.pathname).toBe("/admin/applied-tutors"));
    expect(mocks.invalidate).toHaveBeenCalled();
  });

  it("will not accept the temporary password as the new one", async () => {
    render(<AdminPasswordChange />);
    fill("temporary-pass-1", "temporary-pass-1");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save password" })); });

    expect(screen.getByRole("alert").textContent).toContain("different from the temporary one");
    expect(mocks.change).not.toHaveBeenCalled();
  });

  it("shows the server's reason when the temporary password is wrong", async () => {
    mocks.change.mockRejectedValueOnce(new Error("Your current password is incorrect."));
    render(<AdminPasswordChange />);
    fill("wrong-guess-123", "my-own-password-2");
    await act(async () => { fireEvent.click(screen.getByRole("button", { name: "Save password" })); });

    await waitFor(() => expect(screen.getByRole("alert").textContent).toBe("Your current password is incorrect."));
    expect(window.location.pathname).toBe("/admin/change-password");
  });

  it("sends an Admin with nothing to change straight to the workspace", async () => {
    mocks.access = { data: { passwordChangeRequired: false }, isLoading: false };
    render(<AdminPasswordChange />);
    await waitFor(() => expect(window.location.pathname).toBe("/admin/applied-tutors"));
  });

  it("sends anyone who is not signed in as an Admin to the Admin sign-in", async () => {
    mocks.user = null;
    mocks.access = { data: undefined, isLoading: false };
    render(<AdminPasswordChange />);
    await waitFor(() => expect(window.location.pathname).toBe("/admin/login"));
  });
});
