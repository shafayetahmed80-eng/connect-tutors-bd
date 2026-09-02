import { describe, expect, it } from "vitest";
import { buildAdminWorkspaceNavigation, getAdminWorkspaceDisplayState } from "./AdminWorkspaceLayout";
import { ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS } from "./AdminWorkspaceLayout";

describe("Admin workspace navigation", () => {
  it("gives every verified Admin the operational monitoring sections", () => {
    const paths = buildAdminWorkspaceNavigation(false).map(item => item.path);
    expect(paths).toEqual(expect.arrayContaining(["/admin/dashboard", "/admin/tutors", "/admin/guardians", "/admin/matching"]));
    expect(paths).not.toContain("/admin/security");
  });

  it("groups active operational work, public reference, and Owner controls explicitly", () => {
    const adminItems = buildAdminWorkspaceNavigation(false);
    expect(adminItems.filter(item => item.sectionLabel === "Operations").map(item => item.label)).toEqual([
      "Overview",
      "Tutor management",
      "Guardian activity",
      "Matching workspace",
    ]);
    expect(adminItems.find(item => item.path === "/tutors")).toMatchObject({ sectionLabel: "Public reference" });

    const ownerItems = buildAdminWorkspaceNavigation(true);
    expect(ownerItems.filter(item => item.sectionLabel === "Owner controls").map(item => item.label)).toEqual([
      "Admin activity report",
      "Admin security",
    ]);
  });

  it("gives the Owner a Dynamic Section for content control and the form option lists", () => {
    const ownerItems = buildAdminWorkspaceNavigation(true);
    expect(ownerItems.filter(item => item.sectionLabel === "Dynamic Section")).toEqual([
      expect.objectContaining({ label: "Tutor Profile", path: "/admin/dynamic/tutor-profile" }),
      expect.objectContaining({ label: "Guardian Profile", path: "/admin/dynamic/guardian-profile" }),
      expect.objectContaining({ label: "Form options", path: "/admin/dynamic/form-options" }),
      expect.objectContaining({ label: "Sidebar Tabs", path: "/admin/dynamic/sidebar-tabs" }),
      expect.objectContaining({ label: "Home page", path: "/admin/dynamic/home" }),
      expect.objectContaining({ label: "Public pages", path: "/admin/dynamic/public-pages" }),
    ]);
  });

  it("hides the Dynamic Section from Admins who are not the Owner", () => {
    const adminItems = buildAdminWorkspaceNavigation(false);
    expect(adminItems.some(item => item.sectionLabel === "Dynamic Section")).toBe(false);
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/tutor-profile");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/guardian-profile");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/form-options");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/sidebar-tabs");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/home");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/public-pages");
  });

  it("orders the Dynamic Section after Operations and before the Owner controls", () => {
    // DashboardLayout renders a heading wherever sectionLabel changes, so the
    // array order is the section order.
    const sections = buildAdminWorkspaceNavigation(true)
      .map(item => item.sectionLabel)
      .filter((label, index, all) => label !== all[index - 1]);
    expect(sections).toEqual(["Operations", "Dynamic Section", "Public reference", "Owner controls"]);
  });

  it("keeps Owner-only security management in the Owner navigation boundary", () => {
    const ownerNavigation = buildAdminWorkspaceNavigation(true);
    const security = ownerNavigation.find(item => item.path === "/admin/security");
    expect(security).toMatchObject({ label: "Admin security" });
  });

  it("shows the Owner-only Admin activity report without exposing it to other Admins", () => {
    const ownerNavigation = buildAdminWorkspaceNavigation(true);
    const report = ownerNavigation.find(item => item.path === "/admin/reports");
    expect(report).toMatchObject({ label: "Admin activity report", sectionLabel: "Owner controls" });
    expect(buildAdminWorkspaceNavigation(false).map(item => item.path)).not.toContain("/admin/reports");
  });

  it("waits for a fresh Owner check rather than briefly using stale non-Owner navigation after an Admin session changes", () => {
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: true, ownerAccessLoading: false, ownerAccessFetching: true })).toBe("loading");
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: true, ownerAccessLoading: false, ownerAccessFetching: false })).toBe("ready");
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: false, ownerAccessLoading: false, ownerAccessFetching: false })).toBe("denied");
  });

  it("does not retain an Owner result or a non-Owner result across an Admin session change", () => {
    expect(ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS).toMatchObject({
      retry: false,
      refetchOnMount: "always",
      refetchOnWindowFocus: "always",
      staleTime: 0,
      gcTime: 0,
    });
  });
});
