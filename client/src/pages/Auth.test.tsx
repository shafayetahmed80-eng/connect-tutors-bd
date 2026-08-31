// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn();
const fetchAuthenticatedUser = vi.fn();

function trpcErrorWithCode(message: string, code: string): TRPCClientError<never> {
  const error = new TRPCClientError(message);
  Object.defineProperty(error, "data", { value: { code }, configurable: true });
  return error as TRPCClientError<never>;
}

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({
      auth: {
        me: {
          fetch: fetchAuthenticatedUser,
        },
      },
    }),
    auth: {
      loginAccount: {
        useMutation: () => ({ mutateAsync, isPending: false }),
      },
    },
  },
}));

import AuthPage from "./Auth";

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
  fetchAuthenticatedUser.mockReset();
  window.history.replaceState({}, "", "/");
});

describe("Public Guardian and Tutor account access", () => {
  it("does not offer a direct homepage-return link from the public account form", () => {
    render(<AuthPage />);

    expect(screen.queryByRole("link", { name: "Return to homepage" })).toBeNull();
  });

  it("warns that Caps Lock is on while a public-account password is being entered", () => {
    render(<AuthPage />);

    const password = screen.getByLabelText("Password");
    const keyDown = createEvent.keyDown(password, { key: "A" });
    Object.defineProperty(keyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(password, keyDown);

    expect(screen.getByRole("status").textContent).toContain("Caps Lock is on.");
    fireEvent.blur(password);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("shows email-or-mobile sign-in, password visibility, and safe WhatsApp recovery", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    expect(screen.getByLabelText("Email or mobile number")).not.toBeNull();
    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");

    const recoveryLink = screen.getByRole("link", { name: "Need help signing in?" });
    expect(recoveryLink.getAttribute("href")).toContain("wa.me/8801516131411");
    expect(screen.getByText("For password recovery, contact our support team on WhatsApp. We do not offer email reset links yet.")).not.toBeNull();
    expect(screen.queryByRole("link", { name: /reset password/i })).toBeNull();
    expect(screen.queryByText("Admin", { exact: true })).toBeNull();
  });

  it("routes new accounts into their existing role-specific journeys", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByRole("link", { name: "Start your Tutor Request" }).getAttribute("href")).toBe("/request-tutor");

    await user.click(screen.getByRole("radio", { name: "Select Tutor account" }));
    expect(screen.getByRole("link", { name: "Start Tutor Registration" }).getAttribute("href")).toBe("/become-tutor");
  });

  it("keeps the account-type radio choice usable from the keyboard", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    await user.click(screen.getByRole("radio", { name: "Select Guardian account" }));
    await user.keyboard("{ArrowRight}");

    expect(screen.getByRole("radio", { name: "Select Tutor account" }).getAttribute("aria-checked")).toBe("true");
  });

  it("preselects only the requested public role from a safe auth query", () => {
    window.history.replaceState({}, "", "/auth?role=tutor");
    render(<AuthPage />);

    expect(screen.getByRole("radio", { name: "Select Tutor account" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Sign in as Tutor" })).not.toBeNull();
  });

  it("falls back to Guardian for unknown or privileged query roles", () => {
    window.history.replaceState({}, "", "/auth?role=admin");
    render(<AuthPage />);

    expect(screen.getByRole("radio", { name: "Select Guardian account" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.queryByRole("radio", { name: "Select Admin account" })).toBeNull();
  });

  it("falls back to Guardian when a role query is duplicated", () => {
    window.history.replaceState({}, "", "/auth?role=tutor&role=guardian");
    render(<AuthPage />);

    expect(screen.getByRole("radio", { name: "Select Guardian account" }).getAttribute("aria-checked")).toBe("true");
  });

  it("describes the real Guardian and Tutor journeys without embedding a registration form", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    expect(screen.getByText("Confirm mobile")).not.toBeNull();
    expect(screen.getByText("Create private account")).not.toBeNull();
    expect(screen.getByText("Request a Tutor")).not.toBeNull();
    expect(screen.queryByLabelText("Email or mobile number")).toBeNull();
    expect(screen.getByRole("button", { name: "Already registered? Sign in" })).not.toBeNull();

    await user.click(screen.getByRole("radio", { name: "Select Tutor account" }));
    expect(screen.getByText("Secure account details")).not.toBeNull();
    expect(screen.getByText("Teaching location and consent")).not.toBeNull();
    expect(screen.getByRole("link", { name: "Start Tutor Registration" }).getAttribute("href")).toBe("/become-tutor");
  });

  it("returns to sign-in without losing the selected role", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    await user.click(screen.getByRole("button", { name: "Register" }));
    await user.click(screen.getByRole("radio", { name: "Select Tutor account" }));
    await user.click(screen.getByRole("button", { name: "Already registered? Sign in" }));

    expect(screen.getByRole("button", { name: "Sign in as Tutor" })).not.toBeNull();
  });
});


describe("sign-in error messages", () => {
  it("shows a rate-limit block message verbatim instead of the wrong-password hint", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(
      trpcErrorWithCode("Too many sign-in attempts. Please wait 5 minutes and try again.", "TOO_MANY_REQUESTS"),
    );
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email or mobile number"), "guardian@example.com");
    await user.type(screen.getByLabelText("Password"), "whatever");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("Too many sign-in attempts. Please wait 5 minutes and try again.");
  });

  it("shows a suspended-account (FORBIDDEN) message verbatim", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(
      trpcErrorWithCode("This account has been closed. Contact support on WhatsApp to reopen it.", "FORBIDDEN"),
    );
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email or mobile number"), "guardian@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("This account has been closed. Contact support on WhatsApp to reopen it.");
  });

  it("keeps the generic hint for wrong credentials (UNAUTHORIZED)", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(trpcErrorWithCode("Invalid credentials.", "UNAUTHORIZED"));
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email or mobile number"), "guardian@example.com");
    await user.type(screen.getByLabelText("Password"), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe(
      "Email/mobile number or password is not correct. Choose the account type you used when registering.",
    );
  });
});

describe("post-login destinations", () => {
  it("shows an accessible Tutor workspace transition while the secure post-login hand-off is pending", async () => {
    const user = userEvent.setup({ document: window.document });
    window.history.replaceState({}, "", "/auth?role=tutor");
    mutateAsync.mockResolvedValue({
      success: true,
      user: { id: 2, name: "Tutor", role: "tutor", accountStatus: "active" },
      tutorPortalToken: "tab-local-proof",
    });
    fetchAuthenticatedUser.mockImplementation(() => new Promise(() => undefined));
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email or mobile number"), "tutor@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Tutor" }));

    expect(await screen.findByRole("status", { name: "Preparing your Tutor workspace" })).not.toBeNull();
    expect(screen.getByText("Preparing your Tutor Dashboard…")).not.toBeNull();
    expect(screen.getByText("Loading your private workspace securely.")).not.toBeNull();
  });

  it("fetches the authenticated Guardian session before navigating to Posted Jobs", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockResolvedValue({
      success: true,
      user: { id: 1, name: "Guardian", role: "guardian", accountStatus: "active" },
    });
    fetchAuthenticatedUser.mockResolvedValue({
      id: 1,
      name: "Guardian",
      role: "guardian",
      accountStatus: "active",
    });
    render(<AuthPage />);

    await user.type(screen.getByLabelText("Email or mobile number"), "guardian@example.com");
    await user.type(screen.getByLabelText("Password"), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    expect(fetchAuthenticatedUser).toHaveBeenCalledOnce();
  });

  it("routes Guardian and legacy user accounts directly to their Posted Jobs tab", async () => {
    const { getPostLoginPath } = await import("./Auth");
    expect(getPostLoginPath("guardian")).toBe("/guardian/dashboard/posted-jobs");
    expect(getPostLoginPath("user")).toBe("/guardian/dashboard/posted-jobs");
  });

  it("preserves the Tutor dashboard destination", async () => {
    const { getPostLoginPath } = await import("./Auth");
    expect(getPostLoginPath("tutor")).toBe("/tutor/dashboard");
  });

  it("sends Tutor Apply Now sign-ins to profile review or the protected selected Job Board based on approval", async () => {
    const { getPostLoginPath } = await import("./Auth");
    const returnPath = "/job-board?job=CT-JOB-000042";

    expect(getPostLoginPath("tutor", returnPath, "pending")).toBe(
      "/tutor/dashboard/profile?returnTo=%2Fjob-board%3Fjob%3DCT-JOB-000042",
    );
    expect(getPostLoginPath("tutor", returnPath, "approved")).toBe(
      "/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3DCT-JOB-000042",
    );
    expect(getPostLoginPath("guardian", returnPath, "approved")).toBe("/guardian/dashboard/posted-jobs");
  });

  it("keeps the unknown-role fallback outside either role-specific dashboard", async () => {
    const { getPostLoginPath } = await import("./Auth");
    expect(getPostLoginPath("moderator")).toBe("/");
  });
});
