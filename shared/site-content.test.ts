import { describe, expect, it } from "vitest";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  findSiteContentSlot,
  getSiteContentSlots,
  getSiteContentSpacingSlots,
  getSiteContentSurfaces,
  resolveSiteContentSpacingClass,
  resolveSiteContentTextClass,
  siteContentPageIds,
  siteContentTextSizes,
  type SiteContentSlot,
} from "./site-content";

const anchoredSlot: SiteContentSlot = {
  id: "test.slot",
  page: "tutor-profile",
  surface: "Test surface",
  group: "Test",
  label: "Test slot",
  defaultText: "Test",
  defaultTextClass: "text-sm",
};

describe("site content slots", () => {
  it("declares every slot with a unique id, a surface, a group and shipped copy", () => {
    for (const page of siteContentPageIds) {
      const slots = getSiteContentSlots(page);
      expect(slots.length).toBeGreaterThan(0);

      for (const slot of slots) {
        expect(slot.defaultText.trim()).not.toBe("");
        expect(slot.surface.trim()).not.toBe("");
        expect(slot.group.trim()).not.toBe("");
        expect(slot.defaultText.length).toBeLessThanOrEqual(MAX_SITE_CONTENT_TEXT_LENGTH);
      }
    }

    // Ids must be unique across every page, since the database keys on them.
    const allIds = siteContentPageIds.flatMap(page => [
      ...getSiteContentSlots(page).map(slot => slot.id),
      ...getSiteContentSpacingSlots(page).map(slot => slot.id),
    ]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("covers both surfaces behind each admin page", () => {
    expect(getSiteContentSurfaces("tutor-profile")).toEqual(["Tutor dashboard", "Public tutor profile"]);
    expect(getSiteContentSurfaces("guardian-profile")).toEqual(["Guardian dashboard", "Request a tutor"]);
  });

  it("leaves the call site's own size class alone until an admin changes it", () => {
    // An untouched slot must not emit a class, or one-off sizes like
    // text-[13px] would be silently replaced on every page.
    expect(resolveSiteContentTextClass(anchoredSlot, null)).toBe("");
    expect(resolveSiteContentTextClass(anchoredSlot, undefined)).toBe("");
    expect(resolveSiteContentTextClass(anchoredSlot, "default")).toBe("");
  });

  it("steps along the type ramp from the slot's anchor", () => {
    expect(resolveSiteContentTextClass(anchoredSlot, "smaller")).toBe("text-xs");
    expect(resolveSiteContentTextClass(anchoredSlot, "larger")).toBe("text-base");
    expect(resolveSiteContentTextClass(anchoredSlot, "largest")).toBe("text-lg");
  });

  it("clamps at both ends of the ramp so an override cannot fall off the scale", () => {
    const smallest: SiteContentSlot = { ...anchoredSlot, defaultTextClass: "text-xs" };
    const largest: SiteContentSlot = { ...anchoredSlot, defaultTextClass: "text-3xl" };

    expect(resolveSiteContentTextClass(smallest, "smaller")).toBe("text-xs");
    expect(resolveSiteContentTextClass(largest, "largest")).toBe("text-3xl");

    for (const size of siteContentTextSizes) {
      const resolved = resolveSiteContentTextClass(largest, size);
      expect(resolved === "" || resolved.startsWith("text-")).toBe(true);
    }
  });

  it("falls back to the default padding for an unset or unknown spacing", () => {
    expect(resolveSiteContentSpacingClass(null)).toBe(resolveSiteContentSpacingClass("default"));
    expect(resolveSiteContentSpacingClass("compact")).not.toBe(resolveSiteContentSpacingClass("roomy"));
  });

  it("does not resolve a slot the registry has never declared", () => {
    expect(findSiteContentSlot("tutor-profile.does-not-exist")).toBeUndefined();
  });
});
