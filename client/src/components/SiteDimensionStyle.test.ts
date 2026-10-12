import { describe, expect, it } from "vitest";
import { CONTROL_HEIGHT_PX, defaultSiteLimits, findSiteLimit, siteLimits, type SiteLimitId } from "@shared/site-limits";
import { buildSiteDimensionCss, FIT_PANEL_MIN_HEIGHT_PX, modalPanelHeight, modalShadow } from "./SiteDimensionStyle";

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

  it("keeps the shared button's text and padding apart from the journey button's, as every other pair here does", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "button.textSize": 13, "journeyButton.textSize": 16, "button.paddingX": 12, "journeyButton.paddingX": 24 });
    expect(css).toContain(`[data-slot="button"][data-size="default"] { font-size: 13px; height: var(--control-height); padding-left: 12px; padding-right: 12px; }`);
    expect(css).toContain(`.journey-button { font-size: 16px; height: var(--control-height); padding-left: 24px; padding-right: 24px; }`);
  });
});
describe("the one height of a field and a button", () => {
  const heightIds = ["control.height", "control.heightPhone"];

  it("ships at 40px, on a laptop and on a phone, so a fresh site is uniform", () => {
    expect(CONTROL_HEIGHT_PX).toBe(40);
    for (const id of heightIds) {
      expect(findSiteLimit(id)!.value, id).toBe(CONTROL_HEIGHT_PX);
    }
  });

  it("offers the two numbers between bounds that hold the shipped one", () => {
    for (const id of heightIds) {
      const meta = findSiteLimit(id)!;
      expect(meta.min, id).toBeLessThanOrEqual(CONTROL_HEIGHT_PX);
      expect(meta.max, id).toBeGreaterThanOrEqual(CONTROL_HEIGHT_PX);
      expect(meta.group, id).toBe("Button Section");
    }
  });

  it("no longer offers the five heights it replaced, so there is one number and nothing to keep in step", () => {
    for (const id of ["modal.fieldHeight.profile", "modal.fieldHeight.profilePhone", "modal.fieldHeight.journey", "button.height", "journeyButton.height"]) {
      expect(findSiteLimit(id), id).toBeUndefined();
    }
  });

  it("writes the number once, as a variable, with the phone's number taking over below 640px", () => {
    const shipped = buildSiteDimensionCss(defaultSiteLimits());
    expect(shipped).toContain(":root { --control-height: 40px; }");
    expect(shipped).toContain("@media (max-width: 639px) { :root { --control-height: 40px; } }");

    const moved = buildSiteDimensionCss({ ...defaultSiteLimits(), "control.height": 36, "control.heightPhone": 44 });
    expect(moved).toContain(":root { --control-height: 36px; }");
    expect(moved).toContain("@media (max-width: 639px) { :root { --control-height: 44px; } }");
  });

  it("has the shared button, the journey button and both field boxes read it, outside any media query so a phone gets it too", () => {
    const css = buildSiteDimensionCss(defaultSiteLimits());
    const queryStart = css.indexOf("@media (min-width: 640px)");
    const queryEnd = css.indexOf("\n}\n", queryStart) + 3;
    const afterQuery = css.slice(queryEnd);

    expect(css.slice(queryStart, queryEnd)).not.toContain("modal-field");
    expect(css).toContain("height: var(--control-height); padding-left");
    expect(afterQuery).toContain(".modal-field-profile { height: var(--control-height); }");
    expect(afterQuery).toContain(".modal-field-journey { height: var(--control-height); }");
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
    expect(modalLimitIds).toHaveLength(8);
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

describe("a panel that fits its content", () => {
  it("follows its content between a floor and the panel height, and only above a phone", () => {
    const css = buildSiteDimensionCss({ ...defaultSiteLimits(), "modal.height.panel": 640 });
    const [phone, desktop] = css.split("@media (min-width: 640px) {");
    const rule = `[data-modal-size="panel"][data-modal-fit] { height: auto; min-height: min(${FIT_PANEL_MIN_HEIGHT_PX}px, 86vh); max-height: min(86vh, 640px); }`;

    expect(desktop).toContain(rule);
    expect(phone).not.toContain("data-modal-fit");
    expect(FIT_PANEL_MIN_HEIGHT_PX).toBe(420);
  });

  it("outranks the fixed panel height whichever rule is written first", () => {
    // Two attribute selectors against one: the fit rule wins on specificity, not on order.
    const css = buildSiteDimensionCss(defaultSiteLimits());
    expect(css).toContain('[data-modal-size="panel"] { max-width: 680px; height: min(86vh, 720px); }');
    expect(css).toContain('[data-modal-size="panel"][data-modal-fit] { height: auto;');
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

describe("the lettering an Owner sets for job cards and the dialog they open", () => {
  const css = (over: Partial<Record<SiteLimitId, number>> = {}) => buildSiteDimensionCss({ ...defaultSiteLimits(), ...over });
  const jobLimitIds = siteLimits.filter(limit => limit.group === "Job card").map(limit => limit.id);
  const job = `[data-modal-kind="job-details"]`;

  it("offers two numbers, both between 10 and 20 pixels, and both reach the stylesheet", () => {
    expect(jobLimitIds).toEqual(["jobCard.textSize", "jobDetails.textSize"]);
    for (const id of jobLimitIds) {
      const meta = findSiteLimit(id)!;
      expect([meta.min, meta.max, meta.unit]).toEqual([10, 20, "px"]);
      expect(css(), id).toContain(`${meta.value}${meta.unit}`);
    }
  });

  it("ships a card one pixel above what it was - 15px title, 13px text, 12px badge", () => {
    expect(css()).toContain(".job-card-title { font-size: 15px; }");
    expect(css()).toContain(".job-card-text, .job-card-footer, .job-card-footer * { font-size: 13px; }");
    expect(css()).toContain(".job-card-small { font-size: 12px; }");
  });

  it("keeps the title two pixels above the number and the badge one below, wherever it is set", () => {
    const moved = css({ "jobCard.textSize": 18 });
    expect(moved).toContain(".job-card-title { font-size: 20px; }");
    expect(moved).toContain(".job-card-text, .job-card-footer, .job-card-footer * { font-size: 18px; }");
    expect(moved).toContain(".job-card-small { font-size: 17px; }");
  });

  it("sizes the card's icons with its text, so they follow it rather than stay put", () => {
    expect(css()).toContain(".job-card svg { width: 1.08em; height: 1.08em; }");
  });

  it("ships the dialog two pixels above what it was - 13px rows, 14px buttons, 18px title", () => {
    expect(css()).toContain(`${job} [data-modal-title] { font-size: 18px; }`);
    expect(css()).toContain(`${job} [data-modal-body] :is(p, span, a, strong, dt, dd, li, td, th), ${job} [data-modal-footer] :is(p, span) { font-size: 13px; }`);
    expect(css()).toContain(`${job} [data-modal-footer] :is(button, a), ${job} [data-modal-footer] :is(button, a) * { font-size: 14px; }`);
  });

  it("moves the dialog's title five above the number and its buttons one above", () => {
    const moved = css({ "jobDetails.textSize": 16 });
    expect(moved).toContain(`${job} [data-modal-title] { font-size: 21px; }`);
    expect(moved).toContain("font-size: 16px; }");
    expect(moved).toContain(`${job} [data-modal-footer] :is(button, a), ${job} [data-modal-footer] :is(button, a) * { font-size: 17px; }`);
  });

  it("keeps the two numbers apart: the card's does not reach the dialog, nor the dialog's the card", () => {
    const cardMoved = css({ "jobCard.textSize": 20 });
    expect(cardMoved).toContain(`${job} [data-modal-title] { font-size: 18px; }`);
    const detailsMoved = css({ "jobDetails.textSize": 20 });
    expect(detailsMoved).toContain(".job-card-title { font-size: 15px; }");
  });

  it("addresses the job dialog alone, so no other dialog's lettering moves with it", () => {
    for (const line of css({ "jobDetails.textSize": 19 }).split("\n")) {
      if (/\[data-modal-(title|meta|body|footer)\]/.test(line)) expect(line, line).toContain(job);
    }
  });

  it("puts a span inside a button at the button's size, not the row's", () => {
    const sheet = css();
    expect(sheet.indexOf(`${job} [data-modal-footer] :is(button, a) * `)).toBeGreaterThan(sheet.indexOf(`${job} [data-modal-footer] :is(p, span)`));
  });
});
