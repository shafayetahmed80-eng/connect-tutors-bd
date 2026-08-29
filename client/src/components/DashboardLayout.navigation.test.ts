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

  it("uses premium active, focus, and press states without making planned destinations look complete", () => {
    const active = getDashboardNavigationItemClassName(true);
    const inactive = getDashboardNavigationItemClassName(false);

    expect(active).toContain("bg-[#eaf7ff]");
    expect(active).toContain("shadow-[0_8px_18px_rgba(17,111,196,0.12)]");
    expect(inactive).toContain("focus-visible:ring-2");
    expect(inactive).toContain("active:scale-[0.98]");
    expect(inactive).not.toContain("bg-[#eaf7ff]");
  });
});
