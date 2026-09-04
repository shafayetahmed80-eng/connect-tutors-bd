import { describe, expect, it } from "vitest";
import {
  findSidebarPanel,
  sidebarFontSlotId,
  sidebarGroupSlotId,
  sidebarHeightSlotId,
  sidebarPaddingSlotId,
  sidebarPanelIds,
  sidebarPanels,
  sidebarTabsSlotId,
} from "./sidebar-tabs";
import { findSiteContentSizeSlot, findSiteContentSlot, getSiteContentSurfaces } from "./site-content";

describe("sidebar tab slot ids", () => {
  it("derives a stable, unique id from each item's path", () => {
    expect(sidebarTabsSlotId("tutor", "/tutor/dashboard/profile")).toBe("sidebar-tabs.tutor.item.tutor-dashboard-profile");
    expect(sidebarTabsSlotId("admin", "/tutors")).toBe("sidebar-tabs.admin.item.tutors");

    // The path is the key, so the same path under two panels stays distinct.
    expect(sidebarTabsSlotId("tutor", "/x")).not.toBe(sidebarTabsSlotId("guardian", "/x"));
  });

  it("keeps a group id readable and free of punctuation", () => {
    expect(sidebarGroupSlotId("tutor", "Active workspace")).toBe("sidebar-tabs.tutor.group.active-workspace");
    expect(sidebarGroupSlotId("admin", "Dynamic Section")).toBe("sidebar-tabs.admin.group.dynamic-section");
  });

  it("never collides an item id with a group or size id", () => {
    const ids = sidebarPanels.flatMap(panel => [
      ...panel.items.map(([path]) => sidebarTabsSlotId(panel.id, path)),
      ...panel.groups.map(heading => sidebarGroupSlotId(panel.id, heading)),
      sidebarFontSlotId(panel.id),
      sidebarPaddingSlotId(panel.id),
      sidebarHeightSlotId(panel.id),
    ]);

    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("sidebar panel registry", () => {
  it("declares all three panels with items and headings", () => {
    expect(sidebarPanels.map(panel => panel.id)).toEqual([...sidebarPanelIds]);
    for (const panel of sidebarPanels) {
      expect(panel.items.length, panel.id).toBeGreaterThan(0);
      expect(panel.groups.length, panel.id).toBeGreaterThan(0);
      expect(panel.fontPx, panel.id).toBeGreaterThan(0);
      expect(panel.paddingPx, panel.id).toBeGreaterThan(0);
      expect(panel.heightPx, panel.id).toBeGreaterThan(0);
    }
    expect(findSidebarPanel("nope")).toBeUndefined();
  });

  it("registers every declared item, heading and size as a real content slot", () => {
    // The editor can only offer what the site-content registry knows about, so
    // an entry declared here but not expanded there would be uneditable.
    for (const panel of sidebarPanels) {
      for (const [path, label] of panel.items) {
        const slot = findSiteContentSlot(sidebarTabsSlotId(panel.id, path));
        expect(slot, `${panel.id} ${path}`).toBeDefined();
        expect(slot?.defaultText).toBe(label);
        expect(slot?.page).toBe("sidebar-tabs");
      }
      for (const heading of panel.groups) {
        expect(findSiteContentSlot(sidebarGroupSlotId(panel.id, heading))?.defaultText, heading).toBe(heading);
      }
      expect(findSiteContentSizeSlot(sidebarFontSlotId(panel.id))?.metric).toBe("fontSize");
      expect(findSiteContentSizeSlot(sidebarPaddingSlotId(panel.id))?.metric).toBe("padding");
      const heightSlot = findSiteContentSizeSlot(sidebarHeightSlotId(panel.id));
      expect(heightSlot?.metric, panel.id).toBe("height");
      expect(heightSlot?.defaultPx, panel.id).toBe(panel.heightPx);
    }
  });

  it("gives the admin editor one surface per panel, in declaration order", () => {
    expect(getSiteContentSurfaces("sidebar-tabs")).toEqual(["Admin panel", "Tutor dashboard", "Guardian dashboard"]);
  });
});
