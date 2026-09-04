import { describe, expect, it } from "vitest";
import { defaultSiteLimits, findSiteLimit, siteLimits } from "@shared/site-limits";
import { buildSiteDimensionCss } from "./SiteDimensionStyle";

/** Every dimension the Owner is offered on Admin > Modals. */
const modalLimitIds = siteLimits.filter(limit => limit.group === "Modals").map(limit => limit.id);

describe("the dialog sizes an Owner sets", () => {
  it("reaches the stylesheet, every one of them", () => {
    // A number offered in the Admin panel that no rule reads would be a dial
    // connected to nothing - the exact fault this screen was built to fix.
    const css = buildSiteDimensionCss(defaultSiteLimits());
    for (const id of modalLimitIds) {
      const meta = findSiteLimit(id)!;
      // Each number lands with its own unit: px for a size, ms for the
      // entrance, a bare percentage inside color-mix for the two opacities.
      expect(css, id).toContain(`${meta.value}${meta.unit}`);
    }
    expect(modalLimitIds).toHaveLength(11);
  });

  it("writes the widths inside a media query, because a phone ignores them", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    const [beforeQuery, insideQuery] = css.split("@media (min-width: 640px) {");

    expect(beforeQuery).not.toContain("max-width");
    for (const size of ["sm", "md", "lg"]) {
      expect(insideQuery).toContain(`[data-modal-size="${size}"]`);
    }
  });

  it("caps a dialog by the shorter of the window and the Owner's number", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.maxHeight": 900 });
    expect(css).toContain("max-height: min(92vh, 900px)");
  });

  it("sizes field boxes outside the media query, so a phone gets them too", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.fieldHeight.profile": 40, "modal.fieldHeight.journey": 52 });
    const afterQuery = css.slice(css.indexOf("}\n"));

    expect(afterQuery).toContain(".modal-field-profile { height: 40px; }");
    expect(afterQuery).toContain(".modal-field-journey { height: 52px; }");
  });

  it("keeps only the top corners rounded on a phone, all four above it", () => {
    // A sheet sits on the bottom edge, so its lower corners have nothing to round.
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.radius": 12 });
    const [phone, desktop] = css.split("@media (min-width: 640px) {");

    expect(phone).toContain("border-top-left-radius: 12px");
    expect(phone).not.toContain("border-radius:");
    expect(desktop).toContain("border-radius: 12px");
  });

  it("keeps the shadow in proportion from one number", () => {
    // Offset and reach follow the blur, so the shipped 48 gives back exactly
    // the shadow the shell used to carry as a literal.
    expect(buildSiteDimensionCss(defaultSiteLimits())).toContain("box-shadow: 0 24px 48px -24px");
    expect(buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.shadowBlur": 80 })).toContain("box-shadow: 0 40px 80px -40px");
  });

  it("dims the page with the ink token rather than a second hard-coded blue", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.backdropOpacity": 60 });
    expect(css).toContain("color-mix(in srgb, var(--j-ink) 60%, transparent)");
  });

  it("speeds both the scrim and the panel together, and allows none at all", () => {
    const still = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.motionMs": 0 });
    expect(still.match(/animation-duration: 0ms;/g)).toHaveLength(2);
  });
  it("moves when the stored numbers move", () => {
    const shipped = buildSiteDimensionCss(defaultSiteLimits());
    const widened = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.width.lg": 900 });

    expect(shipped).toContain("760px");
    expect(widened).toContain("900px");
    expect(widened).not.toContain("760px");
  });
});
