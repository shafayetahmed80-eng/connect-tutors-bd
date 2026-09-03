import { describe, expect, it } from "vitest";
import {
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
  it("keeps the two routes off this page pointing at public destinations", () => {
    expect(adminLoginHelpLink).toEqual({ label: "See Admin Help", href: "/admin/help" });
    expect(adminPasswordRecoveryLink.href).toBe("/admin/credential-setup");
  });

  it("uses a direct User ID and password form without an authenticator requirement", () => {
    expect(adminCredentialLoginForm).toEqual({
      userIdLabel: "User ID",
      passwordLabel: "Password",
      submitLabel: "Sign in to Admin",
    });
    const labels = Object.values(adminCredentialLoginForm).join(" ").toLowerCase();
    expect(labels).not.toContain("authenticator");
    expect(labels).not.toContain("two-factor");
  });

  it("offers a generic password recovery route that requires Project Owner verification", () => {
    expect(adminPasswordRecoveryLink).toEqual({
      label: "Forgot password?",
      href: "/admin/credential-setup",
    });
  });
});
