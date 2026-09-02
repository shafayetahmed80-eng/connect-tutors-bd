import { describe, expect, it } from "vitest";
import { sidebarGroupSlotId, sidebarPanels, sidebarTabsSlotId } from "@shared/sidebar-tabs";
import { findSiteContentSlot } from "@shared/site-content";
import { buildAdminWorkspaceNavigation } from "./AdminWorkspaceLayout";
import { tutorDashboardNavigation } from "@/pages/TutorDashboard";
import { guardianDashboardNavigation } from "@/pages/GuardianDashboard";
import type { DashboardNavigationItem } from "./DashboardLayout";

/**
 * `@shared/sidebar-tabs` repeats each sidebar's paths and labels, because the
 * navigation arrays live in the client and carry icons and click behaviour that
 * shared code cannot import. Nothing but this test keeps the two in step: a
 * renamed menu item would otherwise leave an orphaned slot and an uneditable
 * label, with no type error to catch it.
 */
const live: Record<string, DashboardNavigationItem[]> = {
  // The Owner navigation is the superset, so it covers every declared item.
  admin: buildAdminWorkspaceNavigation(true),
  tutor: tutorDashboardNavigation,
  guardian: guardianDashboardNavigation,
};

describe("sidebar registry matches the real navigation", () => {
  it("declares exactly the paths each sidebar renders, in the same order", () => {
    for (const panel of sidebarPanels) {
      expect(panel.items.map(([path]) => path), panel.id).toEqual(live[panel.id].map(item => item.path));
    }
  });

  it("ships the label each item actually renders", () => {
    for (const panel of sidebarPanels) {
      for (const item of live[panel.id]) {
        const slot = findSiteContentSlot(sidebarTabsSlotId(panel.id, item.path));
        expect(slot?.defaultText, `${panel.id} ${item.path}`).toBe(item.label);
      }
    }
  });

  it("declares every group heading the sidebars show", () => {
    for (const panel of sidebarPanels) {
      const headings = live[panel.id]
        .map(item => item.sectionLabel)
        .filter((label, index, all): label is string => Boolean(label) && label !== all[index - 1]);

      for (const heading of headings) {
        expect(findSiteContentSlot(sidebarGroupSlotId(panel.id, heading))?.defaultText, `${panel.id} ${heading}`).toBe(heading);
      }
      expect(panel.groups, panel.id).toEqual(headings.filter((h, i, all) => all.indexOf(h) === i));
    }
  });
});
