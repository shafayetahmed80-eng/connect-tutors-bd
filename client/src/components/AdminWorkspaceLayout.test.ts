import { describe, expect, it } from "vitest";
import { buildAdminWorkspaceNavigation, getAdminWorkspaceDisplayState } from "./AdminWorkspaceLayout";
import { groupNavigationRows } from "./DashboardLayout";
import { ADMIN_WORKSPACE_OWNER_QUERY_OPTIONS } from "./AdminWorkspaceLayout";

describe("Admin workspace navigation", () => {
  it("gives every verified Admin the operational monitoring sections", () => {
    const paths = buildAdminWorkspaceNavigation(false).map(item => item.path);
    expect(paths).toEqual(expect.arrayContaining(["/admin/dashboard", "/admin/tutor-profiles", "/admin/guardians", "/admin/matching"]));
    expect(paths).not.toContain("/admin/security");
    // Tutor management was replaced by Tutor Profiles; /admin/tutors only redirects now.
    expect(paths).not.toContain("/admin/tutors");
  });

  it("groups active operational work, public reference, and Owner controls explicitly", () => {
    const adminItems = buildAdminWorkspaceNavigation(false);
    expect(adminItems.filter(item => item.sectionLabel === "Operations").map(item => item.label)).toEqual([
      "Overview",
      "Admin Profile",
      "Tutor Profiles",
      "Guardian Profiles",
      "Tutor Chats",
      "Change requests",
      "Posted jobs",
      "Appointed Jobs",
      "Confirmed Jobs",
      "Admin Posted Jobs",
      "Applied Tutors",
      "Tutor Matching",
      "Shortlist Requests",
      "Appoint Requests",
      "Confirm Requests",
      "Cancel Requests",
      "Matching workspace",
    ]);

    const ownerItems = buildAdminWorkspaceNavigation(true);
    expect(ownerItems.filter(item => item.sectionLabel === "Owner controls").map(item => item.label)).toEqual([
      "Admin Profiles",
      "Admin activity report",
      "Admin security",
    ]);
  });

  it("folds the Guardian Requests and the Dynamic Section into collapsible rows, with the counts on the rows that ask", () => {
    const items = buildAdminWorkspaceNavigation(true, 0, { shortlist: 6, appoint: 2, confirm: 1, cancel: 0 });
    const rows = groupNavigationRows(items).filter(row => row.kind === "subgroup");
    expect(rows.map(row => row.kind === "subgroup" && row.subgroup.label)).toEqual(["Guardian Requests", "Profile forms", "Site content", "Option lists", "Appearance", "Controls"]);
    const requests = rows[0];
    expect(requests.kind === "subgroup" && requests.members.map(member => [member.item.label, member.item.badge])).toEqual([
      ["Shortlist Requests", undefined], ["Appoint Requests", 2], ["Confirm Requests", 1], ["Cancel Requests", 0],
    ]);
    // An Admin who is not the Owner has no Dynamic Section rows, and keeps Guardian Requests.
    expect(groupNavigationRows(buildAdminWorkspaceNavigation(false)).filter(row => row.kind === "subgroup")).toHaveLength(1);
  });

  it("counts the change requests waiting beside their tab, and draws nothing for none", () => {
    expect(buildAdminWorkspaceNavigation(false, 4).find(item => item.path === "/admin/change-requests")).toMatchObject({ label: "Change requests", badge: 4 });
    expect(buildAdminWorkspaceNavigation(false).find(item => item.path === "/admin/change-requests")?.badge).toBe(0);
  });

  it("counts the Tutor threads with an unread reply waiting", () => {
    expect(buildAdminWorkspaceNavigation(false, 0, undefined, 3).find(item => item.path === "/admin/tutor-chats")).toMatchObject({ label: "Tutor Chats", badge: 3 });
    expect(buildAdminWorkspaceNavigation(false).find(item => item.path === "/admin/tutor-chats")?.badge).toBe(0);
  });

  it("gives the Owner a Dynamic Section for content control and the form option lists", () => {
    const ownerItems = buildAdminWorkspaceNavigation(true);
    expect(ownerItems.filter(item => item.sectionLabel === "Dynamic Section")).toEqual([
      expect.objectContaining({ label: "Section guide", path: "/admin/dynamic" }),
      expect.objectContaining({ label: "Tutor Profile", path: "/admin/dynamic/tutor-profile" }),
      expect.objectContaining({ label: "Guardian Profile", path: "/admin/dynamic/guardian-profile" }),
      expect.objectContaining({ label: "Home page", path: "/admin/dynamic/home" }),
      expect.objectContaining({ label: "Public pages", path: "/admin/dynamic/public-pages" }),
      expect.objectContaining({ label: "Legal pages", path: "/admin/dynamic/legal-pages" }),
      expect.objectContaining({ label: "Form options", path: "/admin/dynamic/form-options" }),
      expect.objectContaining({ label: "Institutes & departments", path: "/admin/dynamic/institutes" }),
      expect.objectContaining({ label: "Schools & colleges", path: "/admin/dynamic/schools" }),
      expect.objectContaining({ label: "Cities & locations", path: "/admin/dynamic/locations" }),
      expect.objectContaining({ label: "Sidebar Tabs", path: "/admin/dynamic/sidebar-tabs" }),
      expect.objectContaining({ label: "Modals", path: "/admin/dynamic/modals" }),
      expect.objectContaining({ label: "Input Field Text", path: "/admin/dynamic/input-field-text" }),
      expect.objectContaining({ label: "Button Section", path: "/admin/dynamic/button-section" }),
      expect.objectContaining({ label: "Navigation & Sections", path: "/admin/dynamic/navigation" }),
      expect.objectContaining({ label: "Limits", path: "/admin/dynamic/limits" }),
      expect.objectContaining({ label: "Admin Control", path: "/admin/dynamic/admin-control" }),
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
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/institutes");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/locations");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/legal-pages");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/limits");
    expect(adminItems.map(item => item.path)).not.toContain("/admin/dynamic/admin-control");
  });

  it("orders the Dynamic Section after Operations and before the Owner controls", () => {
    // DashboardLayout renders a heading wherever sectionLabel changes, so the
    // array order is the section order.
    const sections = buildAdminWorkspaceNavigation(true)
      .map(item => item.sectionLabel)
      .filter((label, index, all) => label !== all[index - 1]);
    expect(sections).toEqual(["Operations", "Dynamic Section", "Owner controls", "Account"]);
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

  it("waits for a fresh Owner check rather than briefly using another Admin session's navigation", () => {
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: true, ownerAccessLoading: false, ownerAccessFromOtherSession: true })).toBe("loading");
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: true, ownerAccessLoading: true, ownerAccessFromOtherSession: false })).toBe("loading");
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: true, ownerAccessLoading: false, ownerAccessFromOtherSession: false })).toBe("ready");
    expect(getAdminWorkspaceDisplayState({ authLoading: false, isAdmin: false, ownerAccessLoading: false, ownerAccessFromOtherSession: false })).toBe("denied");
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

describe("Sign Out in the sidebar", () => {
  it("ends the Admin sidebar with a Sign Out that signs out rather than navigating", () => {
    // The Tutor sidebar has always had one. When the Guardian and Admin panels
    // gained the workspace header their sidebar account menu was removed, which
    // left them without any sidebar Sign Out while the Tutor kept one - three
    // panels, three different answers. This is the Admin half of the fix.
    const items = buildAdminWorkspaceNavigation(true);
    const signOut = items[items.length - 1];

    expect(signOut).toMatchObject({ label: "Sign Out", sectionLabel: "Account", action: "signout" });
  });

  it("shows it to every Admin, not only the Owner", () => {
    for (const isOwner of [true, false]) {
      const items = buildAdminWorkspaceNavigation(isOwner);
      expect(items.filter(item => item.action === "signout"), `isOwner=${isOwner}`).toHaveLength(1);
      expect(items[items.length - 1].label, `isOwner=${isOwner}`).toBe("Sign Out");
    }
  });
});
