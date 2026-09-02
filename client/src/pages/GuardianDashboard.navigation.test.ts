import { describe, expect, it } from "vitest";
import { guardianDashboardNavigation } from "./GuardianDashboard";
import { closeMobileSidebarAfterNavigation, getMobileWorkspaceContext } from "@/components/DashboardLayout";

describe("Guardian workspace navigation", () => {
  it("defines the approved workspace and account groups with stable destinations", () => {
    expect(guardianDashboardNavigation.filter(item => item.sectionLabel).map(item => item.sectionLabel)).toEqual(["Workspace", "Account", "Account"]);
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
      "/guardian/dashboard/sign-out",
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

describe("Sign Out in the Guardian sidebar", () => {
  it("ends the sidebar with a Sign Out that signs out rather than navigating", () => {
    // All three panels answer this the same way now. The Guardian sidebar had
    // an account dropdown at its foot until the workspace header replaced it,
    // and removing that left the Guardian with no sidebar Sign Out at all
    // while the Tutor kept one.
    const signOut = guardianDashboardNavigation[guardianDashboardNavigation.length - 1];

    expect(signOut).toMatchObject({ label: "Sign Out", sectionLabel: "Account", action: "signout" });
    expect(guardianDashboardNavigation.filter(item => item.action === "signout")).toHaveLength(1);
  });

  it("does not mark it as planned, the way an unbuilt destination is", () => {
    // A planned item renders disabled. Sign Out works today.
    expect(guardianDashboardNavigation.find(item => item.action === "signout")?.planned).toBeUndefined();
  });
});
