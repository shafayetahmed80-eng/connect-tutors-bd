import { describe, expect, it } from "vitest";
import { adminHelpQuickLinks, adminHelpSafetyPoints } from "./AdminHelp";

describe("Admin Help public navigation contract", () => {
  it("guides visitors to the existing sign-in page without granting privileged access", () => {
    expect(adminHelpQuickLinks).toContainEqual({ label: "Go to Admin Login", href: "/admin/login" });
    expect(adminHelpQuickLinks).not.toContainEqual(expect.objectContaining({ href: "/admin/matching" }));
  });

  it("keeps public guidance focused on safe sign-in and two-factor setup", () => {
    expect(adminHelpSafetyPoints).toEqual(
      expect.arrayContaining([
        expect.stringContaining("invitation"),
        expect.stringContaining("Authenticator"),
        expect.stringContaining("recovery"),
      ]),
    );
  });
});
