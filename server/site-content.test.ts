import { describe, expect, it } from "vitest";
import { getSiteContentSlots, getSiteContentSpacingSlots } from "@shared/site-content";
import {
  isEmptySiteContentOverride,
  resolveSiteContentSlotPage,
  siteContentOverrideInputSchema,
} from "./site-content";

const textSlotId = getSiteContentSlots("tutor-profile")[0]!.id;
const spacingSlotId = getSiteContentSpacingSlots("tutor-profile")[0]!.id;

describe("site content override input", () => {
  it("accepts a text and size change for a declared text slot", () => {
    const result = siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "  Renamed  ", textSize: "larger" });

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
    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, textSize: "larger" }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, spacing: "roomy" }).success).toBe(false);

    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, spacing: "compact" }).success).toBe(true);
  });

  it("rejects an unknown size or spacing value", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, textSize: "enormous" }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: spacingSlotId, spacing: "airy" }).success).toBe(false);
  });

  it("caps override text so a heading cannot be turned into a wall of copy", () => {
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "x".repeat(241) }).success).toBe(false);
    expect(siteContentOverrideInputSchema.safeParse({ slotId: textSlotId, text: "x".repeat(240) }).success).toBe(true);
  });

  it("reads a slot's page from the registry rather than trusting the caller", () => {
    expect(resolveSiteContentSlotPage(textSlotId)).toBe("tutor-profile");
    expect(resolveSiteContentSlotPage(spacingSlotId)).toBe("tutor-profile");
    expect(resolveSiteContentSlotPage("nope")).toBeUndefined();
  });

  it("treats an override with nothing in it as a reset, so 'no row' always means default", () => {
    expect(isEmptySiteContentOverride({ slotId: textSlotId })).toBe(true);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: "   " })).toBe(true);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: null, textSize: null })).toBe(true);

    expect(isEmptySiteContentOverride({ slotId: textSlotId, text: "Renamed" })).toBe(false);
    expect(isEmptySiteContentOverride({ slotId: textSlotId, textSize: "larger" })).toBe(false);
    expect(isEmptySiteContentOverride({ slotId: spacingSlotId, spacing: "roomy" })).toBe(false);
  });
});
