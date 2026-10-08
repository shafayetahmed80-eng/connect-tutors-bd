import { describe, expect, it } from "vitest";
import {
  adminCredentialLoginForm,
  adminLoginHelpLink,
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
  it("points the one link off this page at the public Admin guide", () => {
    expect(adminLoginHelpLink).toEqual({ label: "See Admin Help", href: "/admin/help" });
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
});
