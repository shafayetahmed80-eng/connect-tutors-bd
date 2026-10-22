import { describe, expect, it, vi } from "vitest";
import {
  closeMobileSidebarAfterNavigation,
  getMobileWorkspaceContext,
  triggerMobileHapticFeedback,
  getMobileBottomNavItems,
  isBottomNavActive,
} from "./DashboardLayout";

describe("mobile Tutor dashboard navigation", () => {
  it("closes the drawer after a mobile navigation action so Profile controls are tappable", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(true, setOpenMobile);

    expect(setOpenMobile).toHaveBeenCalledOnce();
    expect(setOpenMobile).toHaveBeenCalledWith(false);
  });

  it("supports a smooth tactile cushion delay before closing the mobile drawer", () => {
    vi.useFakeTimers();
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(true, setOpenMobile, 90);

    expect(setOpenMobile).not.toHaveBeenCalled();
    vi.advanceTimersByTime(90);
    expect(setOpenMobile).toHaveBeenCalledOnce();
    expect(setOpenMobile).toHaveBeenCalledWith(false);
    vi.useRealTimers();
  });

  it("triggers subtle haptic feedback on supported mobile devices", () => {
    const vibrate = vi.fn();
    vi.stubGlobal("navigator", { vibrate });

    triggerMobileHapticFeedback();

    expect(vibrate).toHaveBeenCalledWith(8);
    vi.unstubAllGlobals();
  });

  it("handles missing navigator or vibration gracefully without throwing", () => {
    vi.stubGlobal("navigator", {});

    expect(() => triggerMobileHapticFeedback()).not.toThrow();
    vi.unstubAllGlobals();
  });

  it("does not alter desktop sidebar state after a navigation action", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(false, setOpenMobile);

    expect(setOpenMobile).not.toHaveBeenCalled();
  });

  it("keeps the protected workspace title and active destination visible on mobile", () => {
    expect(getMobileWorkspaceContext("Tutor Portal", "Tutor requests")).toEqual({
      workspace: "Tutor Portal",
      destination: "Tutor requests",
    });
    expect(getMobileWorkspaceContext("Admin workspace", undefined)).toEqual({
      workspace: "Admin workspace",
      destination: "Menu",
    });
  });
});
describe("mobile bottom quick navigation bar", () => {
  it("determines active bottom nav items accurately without root dashboard bleeding", () => {
    expect(isBottomNavActive("/tutor/dashboard", "/tutor/dashboard")).toBe(true);
    expect(isBottomNavActive("/tutor/dashboard/jobs", "/tutor/dashboard")).toBe(false);
    expect(isBottomNavActive("/tutor/dashboard/jobs", "/tutor/dashboard/jobs")).toBe(true);
    expect(isBottomNavActive("/tutor/dashboard/jobs/101", "/tutor/dashboard/jobs")).toBe(true);
    expect(isBottomNavActive("/admin/applied-tutors/55", "/admin/applied-tutors")).toBe(true);
    expect(isBottomNavActive("/guardian/dashboard/profile", "/guardian/dashboard/posted-jobs")).toBe(false);
  });

  it("builds 5-slot bottom nav for Tutor panel with Home, Jobs, Status, Profile, and Menu toggle", () => {
    const dummyNav = [
      { path: "/tutor/dashboard", label: "Dashboard", icon: () => null },
      { path: "/tutor/dashboard/jobs", label: "Job Board", icon: () => null },
      { path: "/tutor/dashboard/status", label: "Status", icon: () => null },
      { path: "/tutor/dashboard/profile", label: "Profile", icon: () => null },
    ];
    const items = getMobileBottomNavItems("tutor", dummyNav as any);

    expect(items).toHaveLength(5);
    expect(items.map(i => i.key)).toEqual(["home", "jobs", "status", "profile", "menu"]);
    expect(items[0].path).toBe("/tutor/dashboard");
    expect(items[1].path).toBe("/tutor/dashboard/jobs");
    expect(items[2].path).toBe("/tutor/dashboard/status");
    expect(items[3].path).toBe("/tutor/dashboard/profile");
    expect(items[4].isMenuToggle).toBe(true);
    expect(items[4].label).toBe("Menu");
  });

  it("builds 5-slot bottom nav for Guardian panel with Home, Jobs, Applied, Profile, and Menu toggle", () => {
    const dummyNav = [
      { path: "/guardian/dashboard", label: "Dashboard", icon: () => null },
      { path: "/guardian/dashboard/posted-jobs", label: "Posted jobs", icon: () => null },
      { path: "/guardian/dashboard/applied-tutors", label: "Applied Tutors", icon: () => null, badge: 3 },
      { path: "/guardian/dashboard/profile", label: "Profile", icon: () => null },
    ];
    const items = getMobileBottomNavItems("guardian", dummyNav as any);

    expect(items).toHaveLength(5);
    expect(items.map(i => i.key)).toEqual(["home", "jobs", "applied", "profile", "menu"]);
    expect(items[2].badge).toBe(3);
    expect(items[4].isMenuToggle).toBe(true);
  });

  it("builds 5-slot bottom nav for Admin panel with Jobs, Applied, Chats, Appointed, and Menu toggle", () => {
    const dummyNav = [
      { path: "/admin/posted-jobs", label: "Posted jobs", icon: () => null },
      { path: "/admin/applied-tutors", label: "Applied Tutors", icon: () => null },
      { path: "/admin/tutor-chats", label: "Tutor Chats", icon: () => null, badge: 2 },
      { path: "/admin/appointed-jobs", label: "Appointed Jobs", icon: () => null },
    ];
    const items = getMobileBottomNavItems("admin", dummyNav as any);

    expect(items).toHaveLength(5);
    expect(items.map(i => i.key)).toEqual(["jobs", "applied", "chats", "appointed", "menu"]);
    expect(items[0].path).toBe("/admin/posted-jobs");
    expect(items[1].path).toBe("/admin/applied-tutors");
    expect(items[2].badge).toBe(2);
    expect(items[3].path).toBe("/admin/appointed-jobs");
    expect(items[4].isMenuToggle).toBe(true);
  });
});
