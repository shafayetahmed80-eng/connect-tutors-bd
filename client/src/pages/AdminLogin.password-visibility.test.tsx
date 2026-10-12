// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SiteHeader", () => ({
  default: () => <header aria-label="Site header" />,
  BrandLogo: () => <span>Connect Tutors</span>,
}));

vi.mock("@/lib/trpc", () => ({
  trpc: {
    useUtils: () => ({ auth: { me: { fetch: vi.fn(), invalidate: vi.fn() } } }),
    auth: {
      me: { useQuery: () => ({ data: null, isLoading: false }) },
      logout: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
      loginAdmin: { useMutation: () => ({ mutateAsync: vi.fn(), isPending: false }) },
    },
  },
}));

import AdminLogin from "./AdminLogin";

afterEach(() => cleanup());

describe("Admin Login password visibility", () => {
  it("has no password-recovery link: the old one led to a sign-in that does not exist, and an Admin asks the Owner", () => {
    render(<AdminLogin />);

    expect(screen.queryByRole("link", { name: "Forgot password?" })).toBeNull();
    expect(screen.queryByRole("link", { name: "Project Owner" })).toBeNull();
    expect(document.querySelector('a[href="/admin/credential-setup"]')).toBeNull();
    expect(screen.getByRole("link", { name: "See Admin Help" })).not.toBeNull();
  });

  it("does not offer a direct homepage-return link from the Admin sign-in form", () => {
    render(<AdminLogin />);

    expect(screen.queryByRole("link", { name: "Return to homepage" })).toBeNull();
  });

  it("announces when Caps Lock is on while entering an Admin password", () => {
    render(<AdminLogin />);

    const password = screen.getByLabelText("Password");
    const keyDown = createEvent.keyDown(password, { key: "A" });
    Object.defineProperty(keyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(password, keyDown);

    const warning = screen.getByRole("status");
    expect(warning.textContent).toContain("Caps Lock is on.");
    expect(warning.textContent).toContain("Passwords are case-sensitive.");
  });

  it("toggles the Admin sign-in field between masked and visible text without changing password-manager metadata", async () => {
    const user = userEvent.setup({ document: window.document });
    render(<AdminLogin />);

    const password = screen.getByLabelText("Password") as HTMLInputElement;
    expect(password.type).toBe("password");
    expect(password.autocomplete).toBe("current-password");

    await user.click(screen.getByRole("button", { name: "Show password" }));
    expect(password.type).toBe("text");
    expect(screen.getByRole("button", { name: "Hide password" })).not.toBeNull();
  });
});

describe("Admin Login layout", () => {
  it("stacks the User ID, the Password and the button in one column, in a card as narrow as the other sign-in forms", () => {
    render(<AdminLogin />);

    const form = screen.getByLabelText("Password").closest("form")!;
    const order = [screen.getByLabelText("User ID"), screen.getByLabelText("Password"), screen.getByRole("button", { name: /Sign in to Admin/ })];

    // One column: nothing in the form asks for two, and nothing asks to span them.
    expect(form.className).not.toMatch(/grid-cols-2/);
    expect(form.innerHTML).not.toMatch(/col-span-2/);
    expect(form.closest("section")!.className).not.toMatch(/max-w-3xl/);
    // Top to bottom, in that order.
    for (let index = 1; index < order.length; index++) {
      expect(order[index - 1].compareDocumentPosition(order[index]) & Node.DOCUMENT_POSITION_FOLLOWING, `element ${index}`).toBeTruthy();
    }
  });
});
