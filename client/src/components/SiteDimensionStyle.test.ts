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
      const value = findSiteLimit(id)!.value;
      expect(css, id).toContain(`${value}px`);
    }
    expect(modalLimitIds).toHaveLength(6);
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

  it("moves when the stored numbers move", () => {
    const shipped = buildSiteDimensionCss(defaultSiteLimits());
    const widened = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.width.lg": 900 });

    expect(shipped).toContain("760px");
    expect(widened).toContain("900px");
    expect(widened).not.toContain("760px");
  });
});
