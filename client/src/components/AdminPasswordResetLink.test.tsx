// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React from "react";
import { afterEach, describe, expect, it, vi } from "vitest";

const { mutation } = vi.hoisted(() => ({ mutation: { mutate: vi.fn(), isPending: false, isError: false, error: null as null | { message: string }, data: undefined as undefined | { link: string; expiresAt: string; role: string } } }));

vi.mock("@/lib/trpc", () => ({
  trpc: { admin: { createPasswordResetLink: { useMutation: () => mutation } } },
}));

import { AdminPasswordResetLink } from "./AdminPasswordResetLink";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  mutation.data = undefined;
  mutation.isError = false;
  mutation.error = null;
});

describe("AdminPasswordResetLink", () => {
  it("creates a link for this account", () => {
    render(<AdminPasswordResetLink userId={21} phone="+8801711111111" />);

    fireEvent.click(screen.getByRole("button", { name: "Create reset link" }));
    expect(mutation.mutate).toHaveBeenCalledWith({ userId: 21 });
  });

  it("shows the issued link with Copy and a WhatsApp message to the account's number", () => {
    mutation.data = { link: `https://connecttutors.example/reset-password/${"ab".repeat(32)}`, expiresAt: "2026-09-25T15:00:00Z", role: "guardian" };
    render(<AdminPasswordResetLink userId={21} phone="+8801711111111" />);

    expect(screen.getByText(mutation.data.link)).toBeTruthy();
    expect(screen.getByRole("button", { name: "Copy link" })).toBeTruthy();
    const whatsapp = screen.getByRole("link", { name: "Send on WhatsApp" }).getAttribute("href")!;
    expect(whatsapp.startsWith("https://wa.me/8801711111111?text=")).toBe(true);
    expect(decodeURIComponent(whatsapp)).toContain(mutation.data.link);
    expect(screen.getByRole("button", { name: "Create a new link" })).toBeTruthy();
  });

  it("offers no WhatsApp button without a number", () => {
    mutation.data = { link: "https://connecttutors.example/reset-password/x", expiresAt: "2026-09-25T15:00:00Z", role: "tutor" };
    render(<AdminPasswordResetLink userId={21} phone={null} />);

    expect(screen.queryByRole("link", { name: "Send on WhatsApp" })).toBeNull();
  });

  it("shows the server's reason when the account cannot be reset", () => {
    mutation.isError = true;
    mutation.error = { message: "This account is suspended or closed, so a new password would not let them sign in." };
    render(<AdminPasswordResetLink userId={21} />);

    expect(screen.getByRole("alert").textContent).toContain("suspended or closed");
  });
});
