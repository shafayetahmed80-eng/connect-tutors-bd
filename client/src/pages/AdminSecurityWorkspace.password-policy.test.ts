// @vitest-environment jsdom
import { createEvent, fireEvent, render, screen, within } from "@testing-library/react";
import { createElement } from "react";
import { describe, expect, it } from "vitest";
import { CredentialPasswordFields, PasswordPolicyBanner } from "./AdminSecurityWorkspace";

describe("PasswordPolicyBanner", () => {
  it("renders the enforced policy, recommendation, and accessible live confirmation feedback", () => {
    const password = "a".repeat(8);
    const { rerender } = render(createElement(PasswordPolicyBanner, { password, confirmPassword: "" }));

    expect(screen.getByRole("heading", { name: "Password strength policy" })).toBeTruthy();
    expect(screen.getByText("Use 8–128 characters.")).toBeTruthy();
    expect(screen.getByText("Enter the same password in both fields.")).toBeTruthy();
    expect(screen.getByText(/For stronger protection, use 12\+ characters/i)).toBeTruthy();
    expect(screen.getByText(/Live check: Basic\. Length accepted\./i).getAttribute("aria-live")).toBe("polite");

    rerender(createElement(PasswordPolicyBanner, { password, confirmPassword: password }));
    expect(screen.getByText(/Live check: Basic\. Length accepted\. Passwords match\./i).getAttribute("aria-live")).toBe("polite");
  });

  it("renders an accessible visual password-strength meter for weak, medium, and strong states", () => {
    const weakPassword = "a".repeat(8);
    const mediumPassword = `${"a".repeat(8)}1`;
    const strongPassword = `${"A".repeat(9)}a1`;
    const { container, rerender } = render(createElement(PasswordPolicyBanner, { password: weakPassword, confirmPassword: "" }));
    const banner = within(container);

    const meter = banner.getByRole("progressbar", { name: "Password strength" });
    expect(meter.getAttribute("aria-valuetext")).toBe("Weak");
    expect(banner.getByText("Password strength: Weak")).toBeTruthy();

    rerender(createElement(PasswordPolicyBanner, { password: mediumPassword, confirmPassword: "" }));
    expect(meter.getAttribute("aria-valuetext")).toBe("Medium");
    expect(banner.getByText("Password strength: Medium")).toBeTruthy();

    rerender(createElement(PasswordPolicyBanner, { password: strongPassword, confirmPassword: "" }));
    expect(meter.getAttribute("aria-valuetext")).toBe("Strong");
    expect(banner.getByText("Password strength: Strong")).toBeTruthy();
  });

  it("warns when Caps Lock is on in either new-password field and clears the warning on blur", () => {
    render(createElement(CredentialPasswordFields, {
      password: "",
      confirmPassword: "",
      onPasswordChange: () => undefined,
      onConfirmPasswordChange: () => undefined,
    }));

    const newPassword = screen.getByLabelText("New password");
    const newPasswordKeyDown = createEvent.keyDown(newPassword, { key: "A" });
    Object.defineProperty(newPasswordKeyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(newPassword, newPasswordKeyDown);
    expect(screen.getByRole("status").textContent).toContain("Caps Lock is on.");

    fireEvent.blur(newPassword);
    expect(screen.queryByRole("status")).toBeNull();

    const confirmation = screen.getByLabelText("Confirm new password");
    const confirmationKeyDown = createEvent.keyDown(confirmation, { key: "A" });
    Object.defineProperty(confirmationKeyDown, "getModifierState", {
      value: (key: string) => key === "CapsLock",
    });
    fireEvent(confirmation, confirmationKeyDown);
    expect(screen.getByRole("status").textContent).toContain("Passwords are case-sensitive.");
  });

  it("provides independent accessible show and hide controls for both new-password fields", () => {
    const { container } = render(createElement(CredentialPasswordFields, {
      password: "",
      confirmPassword: "",
      onPasswordChange: () => undefined,
      onConfirmPasswordChange: () => undefined,
    }));
    const fields = within(container);

    const newPassword = container.querySelector<HTMLInputElement>("#admin-new-password")!;
    const confirmation = container.querySelector<HTMLInputElement>("#admin-confirm-new-password")!;
    const newPasswordVisibility = fields.getByRole("button", { name: "Show new password" });

    expect(newPassword.getAttribute("type")).toBe("password");
    expect(confirmation.getAttribute("type")).toBe("password");
    expect(newPassword.getAttribute("autocomplete")).toBe("new-password");
    expect(confirmation.getAttribute("autocomplete")).toBe("new-password");

    fireEvent.click(newPasswordVisibility);
    expect(newPassword.getAttribute("type")).toBe("text");
    expect(fields.getByRole("button", { name: "Hide new password" }).getAttribute("aria-pressed")).toBe("true");
    expect(confirmation.getAttribute("type")).toBe("password");

    fireEvent.click(fields.getByRole("button", { name: "Show confirm new password" }));
    expect(confirmation.getAttribute("type")).toBe("text");
    expect(newPassword.getAttribute("type")).toBe("text");
  });
});
