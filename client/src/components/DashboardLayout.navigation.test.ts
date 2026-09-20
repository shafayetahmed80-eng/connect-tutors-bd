import { describe, expect, it, vi } from "vitest";
import {
  sidebarColourStyle,
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
    expect(inactive).toContain("sb-item");
    expect(inactive).not.toContain("sb-item-active");
    expect(inactive).not.toContain("hover:text-j-accent");

    // Blue belongs to the current page alone, and it carries a leading bar so
    // the cue survives being collapsed to icons.
    expect(active).toContain("sb-item-active");
    expect(active).toContain("before:w-[3px]");
    expect(inactive).not.toContain("sb-item-active");
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

describe("the sidebar colours an Owner chose", () => {
  it("paints nothing while every colour is untouched", () => {
    expect(sidebarColourStyle({})).toEqual({});
    expect(sidebarColourStyle({ panel: null, text: null, pill: null, pillText: null })).toEqual({});
  });

  it("derives the panel's darker foot and the softer text tones from the colours chosen", () => {
    const style = sidebarColourStyle({ panel: "#7a1f6a", text: "#fff8f0", pill: "#ffe9d0", pillText: "#3b0b33" }) as Record<string, string>;

    expect(style["--sb-panel-top"]).toBe("#7a1f6a");
    expect(style["--sb-panel-bottom"]).toContain("#7a1f6a");
    expect(style["--sb-soft"]).toContain("#fff8f0");
    expect(style["--sb-icon"]).toContain("#fff8f0");
    expect(style["--sb-pill"]).toBe("#ffe9d0");
    expect(style["--sb-ink"]).toBe("#3b0b33");
  });

  it("leaves the shipped value alone for a colour that was not chosen", () => {
    const style = sidebarColourStyle({ pill: "#ffffff" }) as Record<string, string>;
    expect(Object.keys(style)).toEqual(["--sb-pill"]);
  });
});
