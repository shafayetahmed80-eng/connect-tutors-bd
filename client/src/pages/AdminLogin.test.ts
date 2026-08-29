import { describe, expect, it } from "vitest";
import {
  adminCredentialLoginChecklist,
  adminCredentialLoginForm,
  adminLoginHelpLink,
  adminPasswordRecoveryLink,
  getAdminDashboardDestination,
} from "./AdminLogin";

describe("getAdminDashboardDestination", () => {
  it("opens the Admin workspace only for an established Admin role", () => {
    expect(getAdminDashboardDestination("admin")).toBe("/admin/matching");
  });

  it.each([undefined, null, "guardian", "tutor", "user"]) (
    "does not expose the Admin workspace to %s accounts",
    role => {
      expect(getAdminDashboardDestination(role)).toBeNull();
    },
  );
});

describe("Admin Login credential guidance", () => {
  it("uses the public Admin Help route rather than a protected Admin destination", () => {
    expect(adminLoginHelpLink).toEqual({ label: "See Admin Help", href: "/admin/help" });
  });

  it("uses a direct User ID and password form without an authenticator requirement", () => {
    expect(adminCredentialLoginForm).toEqual({
      userIdLabel: "User ID",
      passwordLabel: "Password",
      submitLabel: "Sign in to Admin",
    });
    expect(adminCredentialLoginChecklist).toEqual([
      "Assigned Admin User ID",
      "Password",
      "Protected workspace access",
    ]);
    expect(adminCredentialLoginChecklist.join(" ").toLowerCase()).not.toContain("authenticator");
    expect(adminCredentialLoginChecklist.join(" ").toLowerCase()).not.toContain("two-factor");
  });

  it("offers a generic password recovery route that requires Project Owner verification", () => {
    expect(adminPasswordRecoveryLink).toEqual({
      label: "Forgot password?",
      href: "/admin/credential-setup",
      helper: "Project Owner verification is required to reset an Admin password.",
    });
    expect(adminPasswordRecoveryLink.helper.toLowerCase()).not.toContain("email");
    expect(adminPasswordRecoveryLink.helper.toLowerCase()).not.toContain("account exists");
  });
});
