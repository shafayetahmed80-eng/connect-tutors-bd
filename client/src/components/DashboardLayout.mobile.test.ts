import { describe, expect, it, vi } from "vitest";
import {
  closeMobileSidebarAfterNavigation,
  getMobileWorkspaceContext,
  triggerMobileHapticFeedback,
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

