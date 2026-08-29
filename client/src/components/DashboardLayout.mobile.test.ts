import { describe, expect, it, vi } from "vitest";
import { closeMobileSidebarAfterNavigation, getMobileWorkspaceContext } from "./DashboardLayout";

describe("mobile Tutor dashboard navigation", () => {
  it("closes the drawer after a mobile navigation action so Profile controls are tappable", () => {
    const setOpenMobile = vi.fn();

    closeMobileSidebarAfterNavigation(true, setOpenMobile);

    expect(setOpenMobile).toHaveBeenCalledOnce();
    expect(setOpenMobile).toHaveBeenCalledWith(false);
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
