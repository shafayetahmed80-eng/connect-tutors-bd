// @vitest-environment jsdom
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { sendCode, reset } = vi.hoisted(() => ({ sendCode: vi.fn(), reset: vi.fn() }));

vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));
vi.mock("@/lib/trpc", () => ({
  trpc: {
    auth: {
      sendPasswordResetCode: { useMutation: () => ({ mutateAsync: sendCode, isPending: false }) },
      resetPasswordWithCode: { useMutation: () => ({ mutateAsync: reset, isPending: false }) },
    },
    siteContent: { list: { useQuery: () => ({ data: [] }) } },
  },
}));

import ForgotPassword from "./ForgotPassword";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.localStorage.clear();
  window.history.replaceState({}, "", "/");
});

async function reachCodeStep(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText(/^Mobile number/), "1712345678");
  await user.click(screen.getByRole("button", { name: "Send code" }));
}

describe("ForgotPassword", () => {
  it("opens on the account type in the link", () => {
    window.history.replaceState({}, "", "/forgot-password?role=tutor");
    render(<ForgotPassword />);
    expect((screen.getByRole("radio", { name: "Tutor" }) as HTMLInputElement).checked).toBe(true);
  });

  it("sends the code, then sets the new password and points to the right sign-in", async () => {
    const user = userEvent.setup({ document: window.document });
    window.history.replaceState({}, "", "/forgot-password?role=tutor");
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    reset.mockResolvedValue({ role: "tutor" });
    render(<ForgotPassword />);

    await reachCodeStep(user);
    expect(sendCode).toHaveBeenCalledWith({ role: "tutor", phone: "+8801712345678" });
    expect(screen.getByText("If a Tutor account signs in with +8801712345678, the code has been sent to it.")).toBeTruthy();

    await user.type(screen.getByLabelText(/^Verification code/), "4821");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "fresh-pass-2026");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "fresh-pass-2026");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(reset).toHaveBeenCalledWith({ role: "tutor", phone: "+8801712345678", code: "4821", password: "fresh-pass-2026", confirmPassword: "fresh-pass-2026" });
    expect(await screen.findByRole("heading", { name: "Password changed" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "Sign in" }).getAttribute("href")).toBe("/tutor/login");
    expect(window.localStorage.getItem("connect-tutors.sign-in-role")).toBe("tutor");
  });

  it("checks the number before asking for a code", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<ForgotPassword />);
    await user.type(screen.getByLabelText(/^Mobile number/), "12345");
    await user.click(screen.getByRole("button", { name: "Send code" }));
    expect(screen.getByText(/valid 10-digit Bangladesh mobile/)).toBeTruthy();
    expect(sendCode).not.toHaveBeenCalled();
  });

  it("puts a wrong code's message under the code box", async () => {
    const user = userEvent.setup({ document: window.document });
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    const wrong = new TRPCClientError("That code is not right. 4 tries left.");
    Object.defineProperty(wrong, "data", { value: { code: "BAD_REQUEST", zodFieldErrors: { phoneCode: ["That code is not right. 4 tries left."] } }, configurable: true });
    reset.mockRejectedValue(wrong);
    render(<ForgotPassword />);
    await reachCodeStep(user);

    await user.type(screen.getByLabelText(/^Verification code/), "0000");
    await user.type(screen.getByPlaceholderText("At least 8 characters"), "fresh-pass-2026");
    await user.type(screen.getByPlaceholderText("Re-enter your password"), "fresh-pass-2026");
    await user.click(screen.getByRole("button", { name: "Save new password" }));

    expect(await screen.findByText("That code is not right. 4 tries left.")).toBeTruthy();
    expect(screen.queryByRole("heading", { name: "Password changed" })).toBeNull();
  });

  it("goes back to the number with Change number", async () => {
    const user = userEvent.setup({ document: window.document });
    sendCode.mockResolvedValue({ success: true, resendAfterSeconds: 60, expiresInSeconds: 300 });
    render(<ForgotPassword />);
    await reachCodeStep(user);

    await user.click(screen.getByRole("button", { name: "Change number" }));
    expect(screen.getByRole("button", { name: "Send code" })).toBeTruthy();
  });
});
