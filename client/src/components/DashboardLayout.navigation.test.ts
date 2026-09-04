import { describe, expect, it, vi } from "vitest";
import {
  DASHBOARD_SIDEBAR_MOTION_CLASS,
  getDashboardNavigationItemClassName,
  getDashboardSidebarToggleLabel,
  shouldAllowDashboardAccountSignOut,
} from "./DashboardLayout";

describe("Dashboard account-menu navigation", () => {
  it("asks the parent guard before signing out from the non-sidebar account menu", () => {
    const onBeforeNavigation = vi.fn(() => false);

    expect(shouldAllowDashboardAccountSignOut(onBeforeNavigation)).toBe(false);
    expect(onBeforeNavigation).toHaveBeenCalledWith(expect.objectContaining({ action: "signout", label: "Sign Out" }));
  });

  it("allows account-menu sign-out when no parent navigation guard is supplied", () => {
    expect(shouldAllowDashboardAccountSignOut()).toBe(true);
  });

  it("uses an explicit accessible toggle label and reduced-motion-safe desktop collapse treatment", () => {
    expect(getDashboardSidebarToggleLabel(false)).toBe("Collapse navigation");
    expect(getDashboardSidebarToggleLabel(true)).toBe("Expand navigation");
    expect(DASHBOARD_SIDEBAR_MOTION_CLASS).toContain("duration-300");
    expect(DASHBOARD_SIDEBAR_MOTION_CLASS).toContain("motion-reduce:transition-none");
  });

  it("keeps hover neutral so only the current page reads as chosen", () => {
    const active = getDashboardNavigationItemClassName(true);
    const inactive = getDashboardNavigationItemClassName(false);

    // Hover used to be a second pale blue, near enough to the active wash that
    // running the pointer down the list made every row look selected in turn.
    expect(inactive).toContain("hover:bg-[#f1f5f9]");
    expect(inactive).toContain("hover:text-[#2b4d66]");
    expect(inactive).not.toContain("hover:bg-[#eaf7ff]");
    expect(inactive).not.toContain("hover:text-j-accent");

    // Blue belongs to the current page alone, and it carries a leading bar so
    // the cue survives being collapsed to icons.
    expect(active).toContain("!bg-[#f1f8fe]");
    expect(active).toContain("!text-j-accent");
    expect(active).toContain("before:w-[3px]");
    expect(inactive).not.toContain("bg-[#f1f8fe]");
  });

  it("drops the shadow and the press-squish that made the navigation shout", () => {
    const active = getDashboardNavigationItemClassName(true);
    const inactive = getDashboardNavigationItemClassName(false);

    expect(active).not.toContain("shadow-");
    expect(active).not.toContain("active:scale-");
    expect(inactive).not.toContain("active:scale-");
    // Keyboard focus is still unmistakable.
    expect(inactive).toContain("focus-visible:ring-2");
  });
});
