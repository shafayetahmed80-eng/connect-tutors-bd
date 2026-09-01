import { describe, expect, it } from "vitest";
import { getSiteContentAnchors, siteContentPageIds } from "@shared/site-content";
import { resolveSiteContentAnchorPage, siteContentBlockInputSchema } from "./site-content";

const anchorId = getSiteContentAnchors("tutor-profile")[0]!.id;

describe("site content notice blocks", () => {
  it("declares anchors on every page, each with a unique id and a surface", () => {
    const all = siteContentPageIds.flatMap(page => getSiteContentAnchors(page));

    expect(all.length).toBeGreaterThan(0);
    expect(new Set(all.map(anchor => anchor.id)).size).toBe(all.length);
    for (const anchor of all) {
      expect(anchor.label.trim()).not.toBe("");
      expect(anchor.surface.trim()).not.toBe("");
    }
  });

  it("accepts a block aimed at a declared anchor", () => {
    const result = siteContentBlockInputSchema.safeParse({ anchorId, heading: "  Notice  ", body: "Body", tone: "warning", active: true });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data.heading).toBe("Notice");
  });

  it("refuses an anchor the pages have not made room for", () => {
    const result = siteContentBlockInputSchema.safeParse({ anchorId: "tutor-profile.anywhere", heading: "Notice" });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]?.message).toMatch(/Unknown anchor/);
  });

  it("refuses a block with neither heading nor body, which would render as an empty box", () => {
    expect(siteContentBlockInputSchema.safeParse({ anchorId }).success).toBe(false);
    expect(siteContentBlockInputSchema.safeParse({ anchorId, heading: "   ", body: "  " }).success).toBe(false);

    // Either one alone is enough.
    expect(siteContentBlockInputSchema.safeParse({ anchorId, heading: "Only a heading" }).success).toBe(true);
    expect(siteContentBlockInputSchema.safeParse({ anchorId, body: "Only a body" }).success).toBe(true);
  });

  it("defaults a new block to the info tone and visible", () => {
    const result = siteContentBlockInputSchema.safeParse({ anchorId, heading: "Notice" });

    expect(result.success).toBe(true);
    if (result.success) expect(result.data).toMatchObject({ tone: "info", active: true });
  });

  it("rejects an unknown tone and over-long copy", () => {
    expect(siteContentBlockInputSchema.safeParse({ anchorId, heading: "Notice", tone: "danger" }).success).toBe(false);
    expect(siteContentBlockInputSchema.safeParse({ anchorId, heading: "x".repeat(121) }).success).toBe(false);
    expect(siteContentBlockInputSchema.safeParse({ anchorId, body: "x".repeat(1001) }).success).toBe(false);
  });

  it("reads a block's page from the anchor registry rather than trusting the caller", () => {
    expect(resolveSiteContentAnchorPage(anchorId)).toBe("tutor-profile");
    expect(resolveSiteContentAnchorPage("request-tutor.top")).toBe("guardian-profile");
    expect(resolveSiteContentAnchorPage("made.up")).toBeUndefined();
  });
});
