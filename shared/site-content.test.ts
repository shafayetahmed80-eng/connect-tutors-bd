import { describe, expect, it } from "vitest";
import {
  MAX_SITE_CONTENT_TEXT_LENGTH,
  MAX_SITE_CONTENT_TEXT_PX,
  MIN_SITE_CONTENT_TEXT_PX,
  clampSiteContentTextPx,
  findSiteContentSlot,
  getSiteContentSizeSlots,
  getSiteContentSlots,
  getSiteContentSpacingSlots,
  getSiteContentSurfaces,
  resolveSiteContentSpacingClass,
  resolveSiteContentTextStyle,
  siteContentPageIds,
  siteContentSlotDefaultPx,
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
      ...getSiteContentSizeSlots(page).map(slot => slot.id),
    ]);
    expect(new Set(allIds).size).toBe(allIds.length);
  });

  it("covers both surfaces behind each admin page", () => {
    expect(getSiteContentSurfaces("tutor-profile")).toEqual(["Tutor dashboard", "Public tutor profile"]);
    expect(getSiteContentSurfaces("guardian-profile")).toEqual(["Guardian dashboard", "Request a tutor"]);
  });

  it("emits no style at all until an admin sets a size", () => {
    // An untouched slot must not carry an inline size, or one-off sizes like
    // text-[13px] would be silently replaced on every page.
    expect(resolveSiteContentTextStyle(null)).toBeUndefined();
    expect(resolveSiteContentTextStyle(undefined)).toBeUndefined();
  });

  it("applies the admin's size verbatim, in pixels", () => {
    expect(resolveSiteContentTextStyle(13)).toEqual({ fontSize: "13px" });
    expect(resolveSiteContentTextStyle(24)).toEqual({ fontSize: "24px" });
  });

  it("clamps a stored size into the supported range rather than rendering it", () => {
    // A value outside the range can only arrive from an older row or a hand-
    // edited database, and an unclamped one would render a broken page.
    expect(clampSiteContentTextPx(2)).toBe(MIN_SITE_CONTENT_TEXT_PX);
    expect(clampSiteContentTextPx(400)).toBe(MAX_SITE_CONTENT_TEXT_PX);
    expect(clampSiteContentTextPx(13.6)).toBe(14);
    expect(resolveSiteContentTextStyle(999)).toEqual({ fontSize: `${MAX_SITE_CONTENT_TEXT_PX}px` });
  });

  it("reports the pixel size every slot ships at, so the editor can show it", () => {
    expect(siteContentSlotDefaultPx(anchoredSlot)).toBe(14);
    expect(siteContentSlotDefaultPx({ ...anchoredSlot, defaultTextClass: "text-xs" })).toBe(12);
    expect(siteContentSlotDefaultPx({ ...anchoredSlot, defaultTextClass: "text-3xl" })).toBe(30);

    // Every declared slot must map to a real number, or the editor shows NaN.
    for (const page of siteContentPageIds) {
      for (const slot of getSiteContentSlots(page)) {
        expect(Number.isFinite(siteContentSlotDefaultPx(slot)), slot.id).toBe(true);
      }
    }
  });

  it("gives the profile record rows a size slot the admin can reach", () => {
    const slot = getSiteContentSizeSlots("tutor-profile").find(candidate => candidate.id === "tutor-profile.size.record-row");

    expect(slot).toBeDefined();
    expect(slot?.defaultPx).toBe(12);
    expect(slot?.surface).toBe("Tutor dashboard");
  });

  it("falls back to the default padding for an unset or unknown spacing", () => {
    expect(resolveSiteContentSpacingClass(null)).toBe(resolveSiteContentSpacingClass("default"));
    expect(resolveSiteContentSpacingClass("compact")).not.toBe(resolveSiteContentSpacingClass("roomy"));
  });

  it("does not resolve a slot the registry has never declared", () => {
    expect(findSiteContentSlot("tutor-profile.does-not-exist")).toBeUndefined();
  });
});
