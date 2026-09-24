// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const token = "cd".repeat(32);
const { linkQuery, resetMutate } = vi.hoisted(() => ({ linkQuery: vi.fn(), resetMutate: vi.fn() }));

vi.mock("wouter", async importOriginal => ({
  ...(await importOriginal<typeof import("wouter")>()),
  useRoute: () => [true, { token: (globalThis as { __resetToken?: string }).__resetToken ?? "" }],
}));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      checkPasswordResetLink: { useQuery: (input: unknown, options: unknown) => linkQuery(input, options) },
      resetPasswordWithLink: { useMutation: () => ({ mutateAsync: resetMutate, isPending: false }) },
    },
    siteContent: { list: { useQuery: () => ({ data: [] }) } },
  },
}));
vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));

import ResetPassword from "./ResetPassword";

function openLink(value = token) {
  (globalThis as { __resetToken?: string }).__resetToken = value;
  return render(<ResetPassword />);
}

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
});

describe("ResetPassword", () => {
  it("sets a new password and sends a Tutor to the Tutor sign-in", async () => {
    const user = userEvent.setup({ document: window.document });
    linkQuery.mockReturnValue({ isLoading: false, isError: false, data: { status: "valid", role: "tutor", name: "Karim" } });
    resetMutate.mockResolvedValue({ role: "tutor" });
    openLink();

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("Set a new password");
    expect(screen.getByText("Tutor account")).toBeTruthy();
    await user.type(screen.getByLabelText(/^New password/), "fresh-pass-2026");
    await user.type(screen.getByLabelText(/^Confirm password/), "fresh-pass-2026");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(resetMutate).toHaveBeenCalledWith({ token, password: "fresh-pass-2026", confirmPassword: "fresh-pass-2026" });
    expect(await screen.findByRole("heading", { name: "Password changed" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/tutor/login");
    expect(window.localStorage.getItem("connect-tutors.sign-in-role")).toBe("tutor");
  });

  it("checks the two passwords before sending anything", async () => {
    const user = userEvent.setup({ document: window.document });
    linkQuery.mockReturnValue({ isLoading: false, isError: false, data: { status: "valid", role: "guardian", name: null } });
    openLink();

    await user.type(screen.getByLabelText(/^New password/), "fresh-pass-2026");
    await user.type(screen.getByLabelText(/^Confirm password/), "other-pass-2026");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(screen.getByText("Passwords do not match.")).toBeTruthy();
    expect(resetMutate).not.toHaveBeenCalled();
  });

  it("explains an expired link and points to sign in", () => {
    linkQuery.mockReturnValue({ isLoading: false, isError: false, data: { status: "expired" } });
    openLink();

    expect(screen.getByRole("alert").textContent).toContain("expired");
    expect(screen.getByRole("link", { name: "Go to sign in" }).getAttribute("href")).toBe("/auth");
    expect(screen.queryByLabelText(/^New password/)).toBeNull();
  });

  it("does not even ask the server about a malformed link", () => {
    linkQuery.mockReturnValue({ isLoading: false, isError: false, data: undefined });
    openLink("not-a-token");

    expect(linkQuery).toHaveBeenCalledWith({ token: "not-a-token" }, expect.objectContaining({ enabled: false }));
    expect(screen.getByRole("alert").textContent).toContain("not valid");
  });

  it("shows the server's words when the link was spent in another tab", async () => {
    const user = userEvent.setup({ document: window.document });
    linkQuery.mockReturnValue({ isLoading: false, isError: false, data: { status: "valid", role: "guardian", name: null } });
    resetMutate.mockRejectedValue(new TRPCClientError("This reset link has already been used. Sign in with your new password, or ask support for a new link."));
    openLink();

    await user.type(screen.getByLabelText(/^New password/), "fresh-pass-2026");
    await user.type(screen.getByLabelText(/^Confirm password/), "fresh-pass-2026");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect((await screen.findByRole("alert")).textContent).toContain("already been used");
  });
});
