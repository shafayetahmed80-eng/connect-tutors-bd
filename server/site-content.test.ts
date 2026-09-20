import { describe, expect, it } from "vitest";
import { communityLinkSlotId, DEFAULT_COMMUNITY_LINK } from "@shared/community";
import { getSiteContentSizeSlots, getSiteContentSlots, getSiteContentSpacingSlots } from "@shared/site-content";
import {
  isEmptySiteContentOverride,
  resolveSiteContentSlotPage,
  siteContentOverrideInputSchema,
} from "./site-content";

const textSlotId = getSiteContentSlots("tutor-profile")[0]!.id;
const communitySlotId = communityLinkSlotId("tutor");
const spacingSlotId = getSiteContentSpacingSlots("tutor-profile")[0]!.id;
const sizeSlotId = getSiteContentSizeSlots("tutor-profile")[0]!.id;

describe("a panel's community link", () => {
  it("takes a full http or https address", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: communitySlotId, text: DEFAULT_COMMUNITY_LINK }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: communitySlotId, text: "http://example.org/group" }).success).toBe(true);
  });

  it("refuses anything a browser cannot open, so no sidebar is left with a dead row", () => {
    for (const bad of ["facebook.com/groups/connecttutors", "javascript:alert(1)", "not a link"]) {
      expect(siteContentOverrideInputSchema.safeParse({ slotId: communitySlotId, text: bad }).success).toBe(false);
    }
  });

  it("clears back to the shipped address rather than storing a blank", () => {
    const result = siteContentOverrideInputSchema.safeParse({ slotId: communitySlotId, text: null });
    expect(result.success).toBe(true);
    if (result.success) expect(isEmptySiteContentOverride(result.data)).toBe(true);
  });

  it("belongs to the Admin Control page, not the Dynamic Section's copy editors", () => {
    expect(resolveSiteContentSlotPage(communitySlotId)).toBe("admin-control");
  });
});

describe("site content override input", () => {
  it("accepts a text and size change for a declared text slot", () => {
    const result = siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "  Renamed  ", textSizePx: 18 });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.text).toBe("Renamed");
  });

  it("refuses a slot the registry does not declare, so nothing unreadable is stored", () => {
    const result = siteContentOverrideInputSchema.safeParse({ slotId: "tutor-profile.made-up", text: "Anything" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/Unknown content slot/);
  });

  it("keeps text and spacing on their own slot kinds rather than storing a value nothing reads", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, text: "Nope" }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, textSizePx: 18 }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, spacing: "roomy" }).success).toBe(false);

    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, spacing: "compact" }).success).toBe(true);
  });

  it("rejects a size outside the supported range, or an unknown spacing", () => {
    // The bounds are the only guard now that the size is a free number.
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSizePx: 9 }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSizePx: 49 }).success).toBe(false);
    // A fraction would render, but nothing offers one and it hides typos.
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSizePx: 13.5 }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSizePx: 10 }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSizePx: 48 }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, spacing: "airy" }).success).toBe(false);
  });

  it("accepts a size for a size-only slot but refuses text or spacing on it", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: sizeSlotId, textSizePx: 14 }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: sizeSlotId, text: "Nope" }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: sizeSlotId, spacing: "roomy" }).success).toBe(false);
  });

  it("caps override text so a heading cannot be turned into a wall of copy", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "x".repeat(241) }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "x".repeat(240) }).success).toBe(true);
  });

  it("reads a slot's page from the registry rather than trusting the caller", () => {
    expect(resolveSiteContentSlotPage(textSlotId)).toBe("tutor-profile");
    expect(resolveSiteContentSlotPage(spacingSlotId)).toBe("tutor-profile");
    expect(resolveSiteContentSlotPage(sizeSlotId)).toBe("tutor-profile");
    expect(resolveSiteContentSlotPage("nope")).toBeUndefined();
  });

  it("treats an override with nothing in it as a reset, so 'no row' always means default", () => {
    expect(isEmptySiteContentOverride({ slotId: textSlotId })).toBe(true);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: "   " })).toBe(true);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: null, textSizePx: null })).toBe(true);

    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: "Renamed" })).toBe(false);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, textSizePx: 18 })).toBe(false);
    expect(isEmptySiteContentOverride({ slotId: spacingSlotId, spacing: "roomy" })).toBe(false);
  });
});

describe("site contact override", () => {
  const phoneSlot = "site.contact.whatsapp";

  it("accepts a valid Bangladesh number, in any of the shapes an Admin might type", () => {
    for (const entry of ["8801516131411", "+880 1516 131411", "01516131411"]) {
      expect(siteContentOverrideInputSchema.safeParse({ slotId: phoneSlot, text: entry }).success, entry).toBe(true);
    }
  });

  it("refuses a number that would leave every wa.me link dead", () => {
    const result = siteContentOverrideInputSchema.safeParse({ slotId: phoneSlot, text: "12345" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/Bangladesh mobile number/);
  });

  it("still allows the slot to be cleared back to the shipped number", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: phoneSlot, text: "" }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: phoneSlot, text: null }).success).toBe(true);
  });

  it("leaves ordinary copy slots unvalidated as phone numbers", () => {
    const textSlot = getSiteContentSlots("tutor-profile")[0]!.id;
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlot, text: "Anything at all" }).success).toBe(true);
  });
});

describe("a colour-only slot", () => {
  const colourSlot = "sidebar-tabs.admin.colour.panel";

  it("takes a colour and nothing else", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: colourSlot, colourHex: "#1677e8" }).success).toBe(true);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: colourSlot, colourHex: null }).success).toBe(true);

    const withText = siteContentOverrideInputSchema.safeParse({ slotId: colourSlot, text: "Blue" });
    expect(withText.success).toBe(false);
    if (!withText.success) expect(withText.error.issues[0]?.message).toMatch(/only accepts a colour/);
  });

  it("refuses anything that is not a six-digit colour", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: colourSlot, colourHex: "blue" }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: colourSlot, colourHex: "#abc" }).success).toBe(false);
  });

  it("keeps a colour off every other kind of slot", () => {
    const textSlot = getSiteContentSlots("tutor-profile")[0]!.id;
    const result = siteContentOverrideInputSchema.safeParse({ slotId: textSlot, colourHex: "#1677e8" });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/does not accept a colour/);
  });

  it("counts a cleared colour as no override at all", () => {
    expect(isEmptySiteContentOverride({ slotId: colourSlot, colourHex: null })).toBe(true);
    expect(isEmptySiteContentOverride({ slotId: colourSlot, colourHex: "#1677e8" })).toBe(false);
  });
});
