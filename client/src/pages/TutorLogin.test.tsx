// @vitest-environment jsdom

import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { loginAccount, completeTutorLoginHandoff } = vi.hoisted(() => ({
  loginAccount: vi.fn(),
  completeTutorLoginHandoff: vi.fn(),
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: vi.fn() } } }),
    auth: {
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      loginAccount: { useMutation: () => ({ mutateAsync: loginAccount, isPending: false }) },
    },
  },
}));

vi.mock("@/lib/tutorPortalSession", () => ({
  clearCurrentTutorPortalLoginHandoff: vi.fn(),
  clearCurrentTutorPortalToken: vi.fn(),
  consumeCurrentTutorSignedOutNotice: () => false,
  consumeCurrentTutorPortalReauthNotice: () => false,
  getCurrentTutorPortalToken: () => null,
  markCurrentTutorPortalLoginHandoff: vi.fn(),
  storeCurrentTutorPortalToken: vi.fn(),
}));

vi.mock("@/lib/tutorLoginHandoff", () => ({
  completeTutorLoginHandoff,
}));

vi.mock("@/components/SiteHeader", () => ({
  default: () => null,
}));

import TutorLogin, { getTutorSignInErrorMessage } from "./TutorLogin";

afterEach(() => {
  cleanup();
  loginAccount.mockReset();
  completeTutorLoginHandoff.mockReset();
});

function trpcErrorWithCode(message: string, code: string): TRPCClientError<never> {
  const error = new TRPCClientError(message);
  Object.defineProperty(error, "data", { value: { code }, configurable: true });
  return error as TRPCClientError<never>;
}

describe("getTutorSignInErrorMessage", () => {
  it("keeps the generic hint for wrong credentials (UNAUTHORIZED)", () => {
    const message = getTutorSignInErrorMessage(
      trpcErrorWithCode("Invalid credentials.", "UNAUTHORIZED"),
    );

    expect(message).toBe("The email/mobile number or password is incorrect.");
  });

  it("shows the rate-limit server message verbatim (TOO_MANY_REQUESTS)", () => {
    const message = getTutorSignInErrorMessage(
      trpcErrorWithCode("Too many sign-in attempts. Please wait 5 minutes and try again.", "TOO_MANY_REQUESTS"),
    );

    expect(message).toBe("Too many sign-in attempts. Please wait 5 minutes and try again.");
  });

  it("shows the suspended-account server message verbatim (FORBIDDEN)", () => {
    const message = getTutorSignInErrorMessage(
      trpcErrorWithCode("This account has been suspended. Contact support on WhatsApp.", "FORBIDDEN"),
    );

    expect(message).toBe("This account has been suspended. Contact support on WhatsApp.");
  });

  it("falls back to the generic message for a non-tRPC failure", () => {
    expect(getTutorSignInErrorMessage(new Error("network down"))).toBe(
      "We could not sign you in. Please check your details and try again.",
    );
  });

  it("falls back to the generic message when a coded error carries no message", () => {
    expect(getTutorSignInErrorMessage(trpcErrorWithCode("   ", "INTERNAL_SERVER_ERROR"))).toBe(
      "We could not sign you in. Please check your details and try again.",
    );
  });
});

describe("Tutor sign-in transition", () => {
  it("does not offer a direct homepage-return link from the Tutor sign-in form", () => {
    render(<TutorLogin />);

    expect(screen.queryByRole("link", { name: "Return to homepage" })).toBeNull();
  });

  it("warns that Caps Lock is on while a Tutor password is being entered", () => {
    render(<TutorLogin />);

    const password = screen.getByLabelText(/Password/);
    const keyDown = createEvent.keyDown(password, { key: "A" });
    Object.defineProperty(keyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(password, keyDown);

    expect(screen.getByRole("status").textContent).toContain("Caps Lock is on.");
    fireEvent.blur(password);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("keeps the Tutor sign-in password visibility control accessible", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<TutorLogin />);

    const password = screen.getByLabelText(/Password/) as HTMLInputElement;
    expect(password.type).toBe("password");
    expect(password.autocomplete).toBe("current-password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).not.toBeNull();
  });

  it("replaces the form with accessible Dashboard-entry feedback while the hand-off is pending", async () => {
    const user = userEvent.setup({ document: window.document });
    loginAccount.mockResolvedValue({ tutorPortalToken: "tab-local-proof" });
    completeTutorLoginHandoff.mockImplementation(() => new Promise(() => undefined));
    render(<TutorLogin />);

    await user.type(screen.getByLabelText(/Email or mobile number/), "tutor@example.com");
    await user.type(screen.getByLabelText(/Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in to Tutor Dashboard" }));

    expect(await screen.findByRole("status", { name: "Preparing your Tutor workspace" })).not.toBeNull();
    expect(screen.getByText("Preparing your Tutor Dashboard…")).not.toBeNull();
    expect(screen.queryByRole("button", { name: "Sign in to Tutor Dashboard" })).toBeNull();
  });

  it("signs in with a Bangladesh mobile number through the unified account endpoint", async () => {
    const user = userEvent.setup({ document: window.document });
    loginAccount.mockResolvedValue({ tutorPortalToken: "tab-local-proof" });
    completeTutorLoginHandoff.mockImplementation(() => new Promise(() => undefined));
    render(<TutorLogin />);

    await user.type(screen.getByLabelText(/Email or mobile number/), "01712345678");
    await user.type(screen.getByLabelText(/Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in to Tutor Dashboard" }));

    expect(loginAccount).toHaveBeenCalledWith({ role: "tutor", identifier: "01712345678", password: "correct-password" });
  });

  it("offers WhatsApp password recovery instead of an email reset link", () => {
    render(<TutorLogin />);

    const help = screen.getByRole("link", { name: "Need help signing in?" });
    expect(help.getAttribute("href")).toContain("wa.me/8801516131411");
  });
});
