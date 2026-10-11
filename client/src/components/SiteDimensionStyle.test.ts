import { describe, expect, it } from "vitest";
import { CONTROL_HEIGHT_PX, defaultSiteLimits, findSiteLimit, siteLimits } from "@shared/site-limits";
import { buildSiteDimensionCss, modalPanelHeight, modalShadow } from "./SiteDimensionStyle";

/** Every dimension the Owner is offered on Admin > Modals. */
const modalLimitIds = siteLimits.filter(limit => limit.group === "Modals").map(limit => limit.id);

describe("the letter size an Owner sets for input fields", () => {
  const textLimitIds = siteLimits.filter(limit => limit.group === "Input Field Text").map(limit => limit.id);

  it("reaches the stylesheet, every one of them", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    for (const id of textLimitIds) {
      const meta = findSiteLimit(id)!;
      expect(css, id).toContain(`${meta.value}${meta.unit}`);
    }
    expect(textLimitIds).toHaveLength(4);
  });

  it("sizes text areas along with single-line fields, unlike the height rule beside it", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "inputText.journey": 18 });
    expect(css).toContain(".input-text-journey { font-size: 18px; }");
  });

  it("keeps a box's own corner rounding apart from its text size", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "inputRadius.profile": 4, "inputRadius.journey": 16 });
    expect(css).toContain(".input-text-profile { border-radius: 4px; }");
    expect(css).toContain(".input-text-journey { border-radius: 16px; }");
  });

  it("scales a value-matching icon inside a box with that box's own text", () => {
    // Lucide sets width/height as attributes on the <svg>; a CSS property
    // always outranks those regardless of specificity, so 1em can override
    // them unconditionally once the marker class is in scope.
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "inputText.profile": 16, "inputText.journey": 18 });
    expect(css).toContain(".input-text-profile svg, svg.input-text-profile { width: 1em; height: 1em; }");
    expect(css).toContain(".input-text-journey svg, svg.input-text-journey { width: 1em; height: 1em; }");
  });
  it("keeps the two panels' text sizes apart, as it does their heights", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "inputText.profile": 16, "inputText.journey": 15 });
    expect(css).toContain(".input-text-profile { font-size: 16px; }");
    expect(css).toContain(".input-text-journey { font-size: 15px; }");
  });
});
describe("the corner rounding an Owner sets for navigation and sections", () => {
  const navLimitIds = siteLimits.filter(limit => limit.group === "Navigation").map(limit => limit.id);

  it("reaches the stylesheet, every one of them", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    for (const id of navLimitIds) {
      const meta = findSiteLimit(id)!;
      expect(css, id).toContain(`${meta.value}${meta.unit}`);
    }
    expect(navLimitIds).toHaveLength(4);
  });

  it("keeps the sidebar row, the two differently-shaped tab bars, and the section card apart", () => {
    const css = buildSiteDimensionCss({
      ...defaultSiteLimits(),
      "nav.itemRadius": 4,
      "nav.tabRadius": 10,
      "nav.pillTabRadius": 20,
      "nav.sectionRadius": 24,
    });
    expect(css).toContain(".nav-item { border-radius: 4px; }");
    expect(css).toContain(".nav-tab-outer { border-radius: 10px; }");
    expect(css).toContain(".nav-pill-tab { border-radius: 20px; }");
    expect(css).toContain(".nav-section-card { border-radius: 24px; }");
  });
});
describe("the size an Owner sets for buttons", () => {
  const buttonLimitIds = siteLimits.filter(limit => limit.group === "Button Section").map(limit => limit.id);

  it("reaches the stylesheet, every one of them", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    for (const id of buttonLimitIds) {
      const meta = findSiteLimit(id)!;
      expect(css, id).toContain(`${meta.value}${meta.unit}`);
    }
    expect(buttonLimitIds).toHaveLength(6);
  });

  it("targets only the ordinary shared button, by its data-size attribute", () => {
    // An icon-only button, or one explicitly given sm/lg, was sized on
    // purpose - the selector must not catch it.
    const css = buildSiteDimensionCss(defaultSiteLimits());
    expect(css).toContain('[data-slot="button"][data-size="default"]');
  });

  it("offers no fixed width, because a button sizes to its own label", () => {
    for (const id of buttonLimitIds) {
      expect(findSiteLimit(id)!.label.toLowerCase(), id).not.toContain("width");
    }
  });

  it("keeps the shared button and the journey button apart, as every other pair here does", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "button.height": 40, "journeyButton.height": 52 });
    expect(css).toContain(`height: 40px`);
    expect(css).toContain(`height: 52px`);
  });
});
describe("the one height of a field and a button", () => {
  const heightIds = ["modal.fieldHeight.profile", "modal.fieldHeight.profilePhone", "modal.fieldHeight.journey", "button.height", "journeyButton.height"];

  it("ships every height dial at the Owner's single number, so a fresh site is uniform", () => {
    expect(CONTROL_HEIGHT_PX).toBe(44);
    for (const id of heightIds) {
      expect(findSiteLimit(id)!.value, id).toBe(CONTROL_HEIGHT_PX);
    }
  });

  it("keeps each of the five editable on its own, so one place can still be moved", () => {
    for (const id of heightIds) {
      const meta = findSiteLimit(id)!;
      expect(meta.min, id).toBeLessThanOrEqual(CONTROL_HEIGHT_PX);
      expect(meta.max, id).toBeGreaterThanOrEqual(CONTROL_HEIGHT_PX);
    }
  });

  it("writes that number into the shared button, the journey button and both field boxes", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    expect(css).toContain(`height: ${CONTROL_HEIGHT_PX}px; padding-left`);
    expect(css).toContain(`.modal-field-journey { height: ${CONTROL_HEIGHT_PX}px; }`);
    expect(css).toContain(`.modal-field-profile { height: ${CONTROL_HEIGHT_PX}px; }`);
  });
});
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
    for (const size of ["dialog", "panel"]) {
      expect(insideQuery).toContain(`[data-modal-size="${size}"]`);
    }
  });

  it("ships a dialog 440 wide and a panel 680 wide and 720 tall", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    expect(css).toContain('[data-modal-size="dialog"] { max-width: 440px; }');
    expect(css).toContain('[data-modal-size="panel"] { max-width: 680px; height: min(86vh, 720px); }');
  });

  it("stands every panel one height, so a short form and a long one line up", () => {
    // A height, not a cap: a cap lets a small panel shrink-wrap its content and
    // sit beside a tall one as a different rectangle.
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.height.panel": 640 });
    expect(css).toContain('[data-modal-size="panel"] { max-width: 680px; height: min(86vh, 640px); }');
    expect(css).not.toContain('[data-modal-size="dialog"] { max-width: 440px; height');
  });

  it("caps a dialog by the shorter of the window and the panel height", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.height.panel": 900 });
    expect(css).toContain("max-height: min(92vh, 900px)");
  });

  it("sizes field boxes outside the media query, so a phone gets them too", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.fieldHeight.profile": 40, "modal.fieldHeight.journey": 52 });
    const afterQuery = css.slice(css.indexOf("}\n"));

    expect(afterQuery).toContain(".modal-field-profile { height: 40px; }");
    expect(afterQuery).toContain(".modal-field-journey { height: 52px; }");
  });

  it("gives the profile editor's boxes their own height on a phone, 44px unless the Owner moves it", () => {
    const shipped = buildSiteDimensionCss(defaultSiteLimits());
    expect(shipped).toContain("@media (max-width: 639px) { .modal-field-profile { height: 44px; } }");
    expect(shipped).toContain(".modal-field-profile { height: 44px; }");
    expect(shipped).toContain("--profile-field-height-phone: 44px;");
    // The floor a chip picker takes follows the same two numbers, above a phone and on it.
    expect(shipped).toContain("--profile-field-height: 44px;");

    const moved = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.fieldHeight.profilePhone": 48 });
    expect(moved).toContain("@media (max-width: 639px) { .modal-field-profile { height: 48px; } }");
    expect(moved).toContain("--profile-field-height-phone: 48px;");
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
    const widened = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.width.panel": 900 });

    expect(shipped).toContain("680px");
    expect(widened).toContain("900px");
    expect(widened).not.toContain("680px");
  });
});

describe("what the Modals preview borrows from the stylesheet", () => {
  it("draws the same shadow the stylesheet gives a dialog", () => {
    const limits = { ...defaultSiteLimits(), "modal.shadowBlur": 80, "modal.shadowOpacity": 30 };
    expect(buildSiteDimensionCss(limits)).toContain(`box-shadow: ${modalShadow(limits)};`);
    expect(modalShadow(defaultSiteLimits())).toContain("0 24px 48px -24px");
  });

  it("stands a panel at 86% of the window, but never past the Owner's number", () => {
    const limits = defaultSiteLimits();
    expect(modalPanelHeight(limits, 768)).toBeCloseTo(660.48, 5);
    expect(modalPanelHeight(limits, 1200)).toBe(720);
    // The same rule the stylesheet writes.
    expect(buildSiteDimensionCss(limits)).toContain("height: min(86vh, 720px)");
  });
});
