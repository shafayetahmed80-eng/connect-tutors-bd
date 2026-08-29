import { describe, expect, it } from "vitest";
import { guardianDashboardNavigation } from "./GuardianDashboard";
import { closeMobileSidebarAfterNavigation, getMobileWorkspaceContext } from "@/components/DashboardLayout";

describe("Guardian workspace navigation", () => {
  it("defines the approved workspace and account groups with stable destinations", () => {
    expect(guardianDashboardNavigation.filter(item => item.sectionLabel).map(item => item.sectionLabel)).toEqual(["Workspace", "Account"]);
    expect(guardianDashboardNavigation.map(item => item.path)).toEqual([
      "/guardian/dashboard",
      "/guardian/dashboard/hire",
      "/guardian/dashboard/profile",
      "/guardian/dashboard/attendance",
      "/guardian/dashboard/posted-jobs",
      "/guardian/dashboard/notifications",
      "/guardian/dashboard/confirmation-letter",
      "/guardian/dashboard/settings",
      "/guardian/dashboard/exclusive",
      "/guardian/dashboard/how-it-works",
      "/guardian/dashboard/community",
    ]);
  });

  it("marks only intentionally deferred destinations as planned", () => {
    const planned = guardianDashboardNavigation.filter(item => item.planned).map(item => item.label);
    expect(planned).toEqual(["Exclusively yours", "Join Guardian Community"]);
    expect(guardianDashboardNavigation.find(item => item.label === "How it works")?.planned).toBe(false);
  });

  it("closes the mobile drawer after navigation and exposes current workspace context", () => {
    let open = true;
    closeMobileSidebarAfterNavigation(true, value => { open = value; });
    expect(open).toBe(false);
    expect(getMobileWorkspaceContext("Guardian workspace", "Posted jobs")).toEqual({
      workspace: "Guardian workspace",
      destination: "Posted jobs",
    });
  });
});
