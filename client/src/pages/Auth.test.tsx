// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TRPCClientError } from "@trpc/client";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const mutateAsync = vi.fn();
/** Owner overrides every SiteContentProvider in these tests reads. */
const siteContentRows: Array<{ slotId: string; text: string }> = [];
const fetchAuthenticatedUser = vi.fn();
// The form invalidates before fetching so it cannot read the pre-login cache.
const invalidateAuthenticatedUser = vi.fn().mockResolvedValue(undefined);

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
          invalidate: invalidateAuthenticatedUser,
        },
      },
    }),
    auth: {
      loginAccount: {
        useMutation: () => ({ mutateAsync, isPending: false }),
      },
    },
    siteContent: {
      list: { useQuery: () => ({ data: siteContentRows }) },
    },
  },
}));

vi.mock("@/components/SiteHeader", () => ({ default: () => null }));
vi.mock("@/components/SiteFooter", () => ({ default: () => null }));

import AuthPage from "./Auth";
import { SiteContentProvider } from "@/lib/siteContent";

afterEach(() => {
  cleanup();
  mutateAsync.mockReset();
  fetchAuthenticatedUser.mockReset();
  invalidateAuthenticatedUser.mockClear();
  window.history.replaceState({}, "", "/");
  window.localStorage.clear();
  siteContentRows.length = 0;
});

describe("Public Guardian and Tutor account access", () => {
  it("does not offer a direct homepage-return link from the public account form", () => {
    render(<AuthPage />);

    expect(screen.queryByRole("link", { name: "Return to homepage" })).toBeNull();
  });

  it("warns that Caps Lock is on while a public-account password is being entered", () => {
    render(<AuthPage />);

    const password = screen.getByLabelText(/^Password/);
    const keyDown = createEvent.keyDown(password, { key: "A" });
    Object.defineProperty(keyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(password, keyDown);

    expect(screen.getByRole("status").textContent).toContain("Caps Lock is on.");
    fireEvent.blur(password);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("uses the shared sign-in form: journey button, required marks, icon-only toggle, no label icons or arrows", () => {
    render(<AuthPage />);

    expect(screen.getByRole("button", { name: "Sign in as Guardian" }).className).toContain("journey-button");
    expect(screen.getAllByLabelText("required")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Show password" }).textContent).toBe("");
    expect(document.querySelectorAll("label svg")).toHaveLength(0);
    expect(document.querySelectorAll(".lucide-arrow-right, .lucide-arrow-left")).toHaveLength(0);
  });

  it("shows email-or-mobile sign-in, password visibility, and safe WhatsApp recovery", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    expect(screen.getByLabelText(/^Email or mobile number/)).not.toBeNull();
    const password = screen.getByLabelText(/^Password/) as HTMLInputElement;
    expect(password.type).toBe("password");
    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");

    const recoveryLink = screen.getByRole("link", { name: "Need help signing in?" });
    expect(recoveryLink.getAttribute("href")).toContain("wa.me/8801516131411");
    expect(screen.queryByText(/For password recovery/)).toBeNull();
    expect(screen.queryByRole("link", { name: /reset password/i })).toBeNull();
    expect(screen.queryByText("Admin", { exact: true })).toBeNull();
  });

  it("is sign-in only: no Register tab and no registration section", () => {
    window.history.replaceState({}, "", "/register");
    render(<AuthPage />);

    expect(screen.queryByRole("button", { name: "Register" })).toBeNull();
    expect(screen.queryByLabelText("Account access mode")).toBeNull();
    expect(screen.queryByText("Choose your next step")).toBeNull();
    expect(screen.queryByRole("link", { name: /Start (your Tutor Request|Tutor Registration)/ })).toBeNull();
    expect(screen.getByRole("button", { name: "Sign in as Guardian" })).not.toBeNull();
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

  it("has no line under the heading", () => {
    render(<AuthPage />);

    expect(screen.queryByText(/Choose the account type you registered with/)).toBeNull();
    expect(screen.getByRole("heading", { level: 1 }).nextElementSibling?.getAttribute("role")).toBe("radiogroup");
  });

  it("has no side panel: the sign-in heading is the page's only h1", () => {
    render(<AuthPage />);

    expect(screen.queryByText("Find the right learning connection.")).toBeNull();
    expect(screen.getAllByRole("heading", { level: 1 }).map((heading) => heading.textContent)).toEqual(["Sign in to your account"]);
  });

  it("does not claim Admin two-factor, which is not built yet", () => {
    render(<AuthPage />);

    expect(screen.queryByText(/two-factor/i)).toBeNull();
  });

  it("puts each role's name beside its icon, with the select-and-login line under it", () => {
    render(<AuthPage />);

    const guardian = screen.getByRole("radio", { name: "Select Guardian account" });
    const tutor = screen.getByRole("radio", { name: "Select Tutor account" });
    const nameRow = guardian.firstElementChild!;
    expect(nameRow.querySelector("svg")).not.toBeNull();
    expect(nameRow.textContent).toBe("Guardian");
    expect(guardian.textContent).toContain("Select and login as a Guardian/Student");
    expect(tutor.firstElementChild!.textContent).toBe("Tutor");
    expect(tutor.textContent).toContain("Select and login as a Tutor");
  });

  it("keeps the chosen role on the sign-in button", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AuthPage />);

    await user.click(screen.getByRole("radio", { name: "Select Tutor account" }));

    expect(screen.getByRole("button", { name: "Sign in as Tutor" })).not.toBeNull();
  });
});


describe("remembering the last account type on this device", () => {
  it("opens with the Tutor card chosen after this device last signed in as a Tutor", () => {
    window.localStorage.setItem("connect-tutors.sign-in-role", "tutor");
    render(<AuthPage />);

    expect(screen.getByRole("radio", { name: "Select Tutor account" }).getAttribute("aria-checked")).toBe("true");
    expect(screen.getByRole("button", { name: "Sign in as Tutor" })).not.toBeNull();
  });

  it("still lets a ?role= in the link win over the remembered choice", () => {
    window.localStorage.setItem("connect-tutors.sign-in-role", "tutor");
    window.history.replaceState({}, "", "/auth?role=guardian");
    render(<AuthPage />);

    expect(screen.getByRole("radio", { name: "Select Guardian account" }).getAttribute("aria-checked")).toBe("true");
  });

  it("remembers the account type after a successful sign-in", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockResolvedValue({ success: true, user: { id: 1, name: "Guardian", role: "guardian", accountStatus: "active" } });
    fetchAuthenticatedUser.mockResolvedValue({ id: 1, name: "Guardian", role: "guardian", accountStatus: "active" });
    render(<AuthPage />);

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    expect(window.localStorage.getItem("connect-tutors.sign-in-role")).toBe("guardian");
  });
});

describe("right details, wrong account type", () => {
  it("names the real account type and signs in as it with one click", async () => {
    const user = userEvent.setup({ document: window.document });
    const mismatch = new TRPCClientError("These details belong to a Tutor account.");
    Object.defineProperty(mismatch, "data", { value: { code: "UNAUTHORIZED", accountRole: "tutor" }, configurable: true });
    mutateAsync.mockRejectedValueOnce(mismatch).mockResolvedValueOnce({ success: true, user: { id: 2, name: "Tutor", role: "tutor", accountStatus: "active" }, tutorPortalToken: "portal-proof" });
    fetchAuthenticatedUser.mockResolvedValue({ id: 2, name: "Tutor", role: "tutor", accountStatus: "active" });
    render(<AuthPage />);

    await user.type(screen.getByLabelText(/^Email or mobile number/), "tutor@example.com");
    await user.type(screen.getByLabelText(/^Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toContain("These details belong to a Tutor account.");
    await user.click(within(alert).getByRole("button", { name: "Sign in as Tutor" }));

    expect(mutateAsync).toHaveBeenLastCalledWith({ role: "tutor", identifier: "tutor@example.com", password: "correct-password" });
    expect(await screen.findByText("Preparing your Tutor Dashboard…")).not.toBeNull();
    expect(window.localStorage.getItem("connect-tutors.sign-in-role")).toBe("tutor");
  });

  it("offers no switch for a plain wrong password", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(trpcErrorWithCode("Email/mobile number or password is not correct.", "UNAUTHORIZED"));
    render(<AuthPage />);

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "wrong-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(within(alert).queryByRole("button")).toBeNull();
  });
});

describe("Owner-editable sign-in copy", () => {
  it("shows the Owner's wording for the heading, the cards and the button", () => {
    siteContentRows.push(
      { slotId: "sign-in.title", text: "লগইন করুন" },
      { slotId: "sign-in.role.guardian.line", text: "অভিভাবক হিসেবে লগইন" },
      { slotId: "button-section.signIn.guardian", text: "Guardian login" },
    );
    render(<SiteContentProvider page="button-section"><AuthPage /></SiteContentProvider>);

    expect(screen.getByRole("heading", { level: 1 }).textContent).toBe("লগইন করুন");
    expect(screen.getByRole("radio", { name: "Select Guardian account" }).textContent).toContain("অভিভাবক হিসেবে লগইন");
    expect(screen.getByRole("button", { name: "Guardian login" })).not.toBeNull();
  });
});

describe("sign-in error messages", () => {
  it("shows a rate-limit block message verbatim instead of the wrong-password hint", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(
      trpcErrorWithCode("Too many sign-in attempts. Please wait 5 minutes and try again.", "TOO_MANY_REQUESTS"),
    );
    render(<AuthPage />);

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "whatever");
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

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    const alert = await screen.findByRole("alert");
    expect(alert.textContent).toBe("This account has been closed. Contact support on WhatsApp to reopen it.");
  });

  it("keeps the generic hint for wrong credentials (UNAUTHORIZED)", async () => {
    const user = userEvent.setup({ document: window.document });
    mutateAsync.mockRejectedValue(trpcErrorWithCode("Invalid credentials.", "UNAUTHORIZED"));
    render(<AuthPage />);

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "wrong-password");
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

    await user.type(screen.getByLabelText(/^Email or mobile number/), "tutor@example.com");
    await user.type(screen.getByLabelText(/^Password/), "correct-password");
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

    await user.type(screen.getByLabelText(/^Email or mobile number/), "guardian@example.com");
    await user.type(screen.getByLabelText(/^Password/), "correct-password");
    await user.click(screen.getByRole("button", { name: "Sign in as Guardian" }));

    expect(fetchAuthenticatedUser).toHaveBeenCalledOnce();
    // Without this the 30s staleTime hands back the pre-login null and a good
    // password is reported as wrong.
    expect(invalidateAuthenticatedUser).toHaveBeenCalledOnce();
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
    const returnPath = "/job-board?job=6945";

    expect(getPostLoginPath("tutor", returnPath, "pending")).toBe(
      "/tutor/dashboard/profile?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getPostLoginPath("tutor", returnPath, "approved")).toBe(
      "/tutor/dashboard/jobs?returnTo=%2Fjob-board%3Fjob%3D6945",
    );
    expect(getPostLoginPath("guardian", returnPath, "approved")).toBe("/guardian/dashboard/posted-jobs");
  });

  it("keeps the unknown-role fallback outside either role-specific dashboard", async () => {
    const { getPostLoginPath } = await import("./Auth");
    expect(getPostLoginPath("moderator")).toBe("/");
  });
});
