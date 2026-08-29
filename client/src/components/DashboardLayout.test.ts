import { Globe2, LayoutDashboard } from "lucide-react";
import { describe, expect, it } from "vitest";
import { completeDashboardSignOut, shouldRequireDashboardExit, type DashboardNavigationItem } from "./DashboardLayout";

describe("Dashboard panel exit policy", () => {
  it("requires an explicit sign-out confirmation only for configured panel-to-public destinations", () => {
    const internalItem: DashboardNavigationItem = {
      icon: LayoutDashboard,
      label: "Dashboard",
      path: "/guardian/dashboard",
    };
    const publicExitItem: DashboardNavigationItem = {
      icon: Globe2,
      label: "Public Tutor directory",
      path: "/tutors",
      requiresSignOut: true,
    };

    expect(shouldRequireDashboardExit(internalItem)).toBe(false);
    expect(shouldRequireDashboardExit(publicExitItem)).toBe(true);
  });

  it("clears the authenticated session before navigating to the approved public destination", async () => {
    const calls: string[] = [];

    await completeDashboardSignOut(
      async () => {
        calls.push("logout");
      },
      destination => {
        calls.push(`navigate:${destination}`);
      },
      "/tutors",
    );

    expect(calls).toEqual(["logout", "navigate:/tutors"]);
  });
});
