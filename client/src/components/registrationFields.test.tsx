// @vitest-environment jsdom
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import React, { useState } from "react";
import { afterEach, describe, expect, it } from "vitest";
import {
  confirmPasswordBorder,
  getPasswordMatch,
  getPasswordStrength,
  PasswordField,
  PasswordMatch,
  PasswordStrength,
} from "./registrationFields";

afterEach(() => {
  cleanup();
});

function PasswordFieldWrapper() {
  const [val, setVal] = useState("");
  return (
    <PasswordField
      id="test-password"
      label="Password"
      placeholder="Enter password"
      value={val}
      onChange={setVal}
    >
      <PasswordStrength id="test-password-strength" password={val} />
    </PasswordField>
  );
}

describe("PasswordField", () => {
  it("renders with type password and toggles to text when button clicked", () => {
    render(<PasswordFieldWrapper />);
    const input = screen.getByPlaceholderText("Enter password");
    expect(input.getAttribute("type")).toBe("password");

    const toggleBtn = screen.getByRole("button", { name: "Show password" });
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("false");

    fireEvent.click(toggleBtn);
    expect(input.getAttribute("type")).toBe("text");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Hide password");
    expect(toggleBtn.getAttribute("aria-pressed")).toBe("true");

    fireEvent.click(toggleBtn);
    expect(input.getAttribute("type")).toBe("password");
    expect(toggleBtn.getAttribute("aria-label")).toBe("Show password");
  });
});

describe("getPasswordStrength", () => {
  it("returns 0 score and empty label for empty password", () => {
    expect(getPasswordStrength("")).toEqual({ score: 0, label: "", color: "" });
  });

  it("returns Weak for short/simple password", () => {
    const res = getPasswordStrength("abc");
    expect(res.score).toBe(0);
    expect(res.label).toBe("Weak");
  });

  it("returns Fair for length >= 8 and lowercase", () => {
    const res = getPasswordStrength("abcdefgh");
    expect(res.score).toBe(1);
    expect(res.label).toBe("Weak");

    const res2 = getPasswordStrength("abcdefgh1");
    expect(res2.score).toBe(2);
    expect(res2.label).toBe("Fair");
  });

  it("returns Strong for length, letters, and numbers", () => {
    const res = getPasswordStrength("Abcdefgh1");
    expect(res.score).toBe(3);
    expect(res.label).toBe("Strong");
  });

  it("returns Excellent for full complexity (length, lower/upper, number, special char)", () => {
    const res = getPasswordStrength("Abcdefgh1@#");
    expect(res.score).toBe(4);
    expect(res.label).toBe("Excellent");
  });
});

describe("getPasswordMatch and confirmPasswordBorder", () => {
  it("returns null when confirm password is empty", () => {
    expect(getPasswordMatch("secret123", "")).toBeNull();
  });

  it("returns mismatch when passwords differ", () => {
    const match = getPasswordMatch("secret123", "secret456");
    expect(match?.matches).toBe(false);
    expect(match?.label).toContain("do not match");
    expect(confirmPasswordBorder("secret123", "secret456")).toContain("border-[#dc5b5b]");
  });

  it("returns match when passwords match", () => {
    const match = getPasswordMatch("secret123", "secret123");
    expect(match?.matches).toBe(true);
    expect(match?.label).toBe("Passwords match");
    expect(confirmPasswordBorder("secret123", "secret123")).toContain("border-j-ok");
  });
});
