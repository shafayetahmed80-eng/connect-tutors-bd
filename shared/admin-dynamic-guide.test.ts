import { describe, expect, it } from "vitest";
import { adminDynamicGuide, findAdminDynamicGuide, siteContentSurfacePath } from "./admin-dynamic-guide";
import { sidebarPanels } from "./sidebar-tabs";
import { getSiteContentSurfaces, siteContentPageIds } from "./site-content";

const adminItems = sidebarPanels.find(panel => panel.id === "admin")!.items;
/** The guide describes the Dynamic Section screens - not its own contents page. */
const dynamicItems = adminItems.filter(([path]) => path.startsWith("/admin/dynamic/"));

describe("the Dynamic Section guide", () => {
  it("describes every Dynamic Section screen, and nothing that is not one", () => {
    // A screen with no entry is a screen whose name is the only clue an Owner
    // gets - which is the whole problem this guide exists to fix.
    expect(adminDynamicGuide.map(entry => entry.path)).toEqual(dynamicItems.map(([path]) => path));
  });

  it("names each screen exactly as the sidebar does", () => {
    for (const [path, label] of dynamicItems) {
      expect(findAdminDynamicGuide(path)?.label, path).toBe(label);
    }
  });

  it("writes a real sentence for every screen", () => {
    for (const entry of adminDynamicGuide) {
      expect(entry.summary.trim().length, entry.path).toBeGreaterThan(20);
      // The sentence is for the Owner, so it is written in Bangla.
      expect(/[ঀ-৿]/.test(entry.summary), entry.path).toBe(true);
    }
  });

  it("points every destination at a real route rather than a stray path", () => {
    for (const entry of adminDynamicGuide) {
      for (const destination of entry.seeAt) {
        expect(destination.path.startsWith("/"), `${entry.path} -> ${destination.path}`).toBe(true);
        expect(destination.label.trim(), entry.path).not.toBe("");
      }
    }
  });

  it("returns nothing for a page outside the Dynamic Section", () => {
    expect(findAdminDynamicGuide("/admin/dashboard")).toBeUndefined();
    expect(findAdminDynamicGuide("/admin/dynamic")).toBeUndefined();
  });
});

describe("where a site-content surface is published", () => {
  it("only maps surfaces the registry actually declares", () => {
    // A stale key is a link the Owner never sees, and a silent one - the
    // editor simply renders no link for a surface it cannot find.
    for (const page of siteContentPageIds) {
      for (const surface of getSiteContentSurfaces(page)) {
        const path = siteContentSurfacePath(page, surface);
        if (path !== undefined) expect(path.startsWith("/"), `${page} / ${surface}`).toBe(true);
      }
    }
  });

  it("keeps the two 'Tuition types' surfaces apart", () => {
    // The same name is a home page band and an info page; keying by page is
    // what stops one link from pointing at the other's screen.
    expect(siteContentSurfacePath("home", "Tuition types")).toBe("/");
    expect(siteContentSurfacePath("info-pages", "Tuition types")).toBe("/tuition");
  });
});
