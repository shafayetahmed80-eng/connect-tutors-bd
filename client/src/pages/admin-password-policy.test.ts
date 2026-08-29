import { describe, expect, it } from "vitest";
import { adminPasswordPolicy, getAdminPasswordFeedback } from "./admin-password-policy";

describe("Admin password strength policy", () => {
  it("states the exact enforced password contract and clearly separates recommendations", () => {
    expect(adminPasswordPolicy).toEqual({
      title: "Password strength policy",
      required: [
        "Use 8–128 characters.",
        "Enter the same password in both fields.",
      ],
      recommended: "For stronger protection, use 12+ characters with a mix of letters, numbers, and symbols.",
    });
  });

  it("provides live, non-persistent feedback for length, confirmation, and strength", () => {
    expect(getAdminPasswordFeedback("short", "short")).toMatchObject({
      meetsMinimum: false,
      strength: "Too short",
      lengthMet: false,
      confirmationMet: true,
    });

    expect(getAdminPasswordFeedback("safeAdmin1!", "different")).toMatchObject({
      meetsMinimum: false,
      strength: "Strong",
      lengthMet: true,
      confirmationMet: false,
    });

    expect(getAdminPasswordFeedback("SafeAdminPassword1!", "SafeAdminPassword1!")).toMatchObject({
      meetsMinimum: true,
      strength: "Strong",
      lengthMet: true,
      confirmationMet: true,
    });
  });

  it("marks an overlong password as invalid even when its confirmation matches", () => {
    const password = "A1!".repeat(43);
    expect(getAdminPasswordFeedback(password, password)).toMatchObject({
      meetsMinimum: false,
      strength: "Too long",
      lengthMet: false,
      confirmationMet: true,
    });
  });
});
