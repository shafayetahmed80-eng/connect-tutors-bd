// @vitest-environment jsdom
import { cleanup, createEvent, fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/components/SiteHeader", () => ({
  default: () => <header aria-label="Site header" />,
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
