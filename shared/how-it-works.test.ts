import { describe, expect, it } from "vitest";
import { findSiteContentSlot, getSiteContentSlots, getSiteContentSurfaces } from "./site-content";
import { howItWorksGuides, howItWorksPanels, howItWorksSceneIds, howItWorksSlotId } from "./how-it-works";
import { siteContentSurfacePath } from "./admin-dynamic-guide";

describe("the How it works guides", () => {
  it("give every step its own scene, and every scene to exactly one step", () => {
    const used = howItWorksPanels.flatMap(panel => howItWorksGuides[panel].steps.map(step => step.scene));
    expect([...used].sort()).toEqual([...howItWorksSceneIds].sort());
  });

  it("keep step ids unique inside a guide, so no two steps share a slot", () => {
    for (const panel of howItWorksPanels) {
      const ids = howItWorksGuides[panel].steps.map(step => step.id);
      expect(new Set(ids).size, panel).toBe(ids.length);
    }
  });

  it("are editable by the Owner, one slot per heading, intro, step title and step description", () => {
    for (const panel of howItWorksPanels) {
      const guide = howItWorksGuides[panel];
      expect(findSiteContentSlot(howItWorksSlotId(panel, "heading"))?.defaultText).toBe(guide.heading);
      expect(findSiteContentSlot(howItWorksSlotId(panel, "intro"))?.defaultText).toBe(guide.intro);
      for (const step of guide.steps) {
        expect(findSiteContentSlot(howItWorksSlotId(panel, "title", step.id))?.defaultText).toBe(step.title);
        expect(findSiteContentSlot(howItWorksSlotId(panel, "copy", step.id))?.defaultText).toBe(step.copy);
      }
    }
    const stepCount = howItWorksPanels.reduce((sum, panel) => sum + howItWorksGuides[panel].steps.length, 0);
    expect(getSiteContentSlots("how-it-works")).toHaveLength(howItWorksPanels.length * 2 + stepCount * 2);
  });

  it("show up in the editor under the panel they appear in, with a link to that page", () => {
    expect(getSiteContentSurfaces("how-it-works")).toEqual(["Guardian panel", "Tutor panel"]);
    expect(siteContentSurfacePath("how-it-works", "Guardian panel")).toBe(howItWorksGuides.guardian.path);
    expect(siteContentSurfacePath("how-it-works", "Tutor panel")).toBe(howItWorksGuides.tutor.path);
  });
});
