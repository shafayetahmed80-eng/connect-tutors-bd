import { describe, expect, it } from "vitest";
import { findInfoPageCopy, homeCopy, infoPageActions, infoPageCopy } from "./public-content";
import { findSiteContentSlot, getSiteContentSlots, getSiteContentSurfaces } from "./site-content";

/**
 * The pages import their copy from `public-content`, so a slot's default and
 * what renders are the same string by construction. What these guard is the
 * other half: that every piece of copy actually reached the registry, and so
 * can be edited at all.
 */
describe("home page slots", () => {
  it("covers the page top to bottom, one surface per section", () => {
    expect(getSiteContentSurfaces("home")).toEqual([
      "Hero",
      "Proof strip",
      "Tuition types",
      "Belief banner",
      "How it works",
      "Room to learn",
      "FAQ",
      "Final call to action",
    ]);
  });

  it("declares a slot for every repeated item, not just the first", () => {
    // A card or step left out of the registry would be the one piece of the
    // page still needing a deploy, and nothing else would say so.
    for (const card of homeCopy.tuition.cards) {
      expect(findSiteContentSlot(`home.tuition.${card.id}.title`)?.defaultText, card.id).toBe(card.title);
      expect(findSiteContentSlot(`home.tuition.${card.id}.copy`)?.defaultText, card.id).toBe(card.copy);
    }
    for (const step of homeCopy.journey.steps) {
      expect(findSiteContentSlot(`home.journey.${step.id}.title`)?.defaultText, step.id).toBe(step.title);
      expect(findSiteContentSlot(`home.journey.${step.id}.copy`)?.defaultText, step.id).toBe(step.copy);
    }
    for (const item of homeCopy.faq.items) {
      expect(findSiteContentSlot(`home.faq.${item.id}.question`)?.defaultText, item.id).toBe(item.question);
      expect(findSiteContentSlot(`home.faq.${item.id}.answer`)?.defaultText, item.id).toBe(item.answer);
    }
    for (const item of homeCopy.proof.items) {
      expect(findSiteContentSlot(`home.proof.${item.id}.title`)?.defaultText, item.id).toBe(item.title);
    }
    for (const bullet of homeCopy.stories.bullets) {
      expect(findSiteContentSlot(`home.stories.${bullet.id}`)?.defaultText, bullet.id).toBe(bullet.text);
    }
  });

  it("splits each accented heading into editable pieces", () => {
    // One slot per heading would either drop the accent colour or hand an Owner
    // raw markup to keep it.
    for (const [id, heading] of [
      ["home.hero.title", homeCopy.hero.title],
      ["home.tuition.title", homeCopy.tuition.title],
      ["home.journey.title", homeCopy.journey.title],
      ["home.stories.title", homeCopy.stories.title],
      ["home.faq.title", homeCopy.faq.title],
    ] as const) {
      expect(findSiteContentSlot(`${id}.lead`)?.defaultText, id).toBe(heading.lead);
      expect(findSiteContentSlot(`${id}.accent`)?.defaultText, id).toBe(heading.accent);
    }
    expect(findSiteContentSlot("home.hero.title.tail")?.defaultText).toBe(homeCopy.hero.title.tail);
  });

  it("offers no size control, because these pages render copy as plain strings", () => {
    // A sized wrapper here would land inside selectors like `h1 span`, which is
    // what colours part of a heading - it would recolour the whole thing.
    for (const slot of getSiteContentSlots("home")) {
      expect(slot.kind, slot.id).toBe("text-only");
    }
    for (const slot of getSiteContentSlots("info-pages")) {
      expect(slot.kind, slot.id).toBe("text-only");
    }
  });

  it("gives every slot a non-empty default and a unique id", () => {
    const slots = getSiteContentSlots("home");
    expect(slots.length).toBeGreaterThan(60);
    for (const slot of slots) {
      expect(slot.defaultText.trim(), slot.id).not.toBe("");
    }
    const ids = slots.map(slot => slot.id);
    expect(new Set(ids).size).toBe(ids.length);
  });
});

describe("public information page slots", () => {
  it("declares all three pieces of copy for every route", () => {
    for (const page of infoPageCopy) {
      expect(findSiteContentSlot(`info.${page.key}.eyebrow`)?.defaultText, page.path).toBe(page.eyebrow);
      expect(findSiteContentSlot(`info.${page.key}.title`)?.defaultText, page.path).toBe(page.title);
      expect(findSiteContentSlot(`info.${page.key}.copy`)?.defaultText, page.path).toBe(page.copy);
    }
  });

  it("declares the two shared call-to-action labels", () => {
    expect(findSiteContentSlot("info.action.requestTutor")?.defaultText).toBe(infoPageActions.requestTutor);
    expect(findSiteContentSlot("info.action.joinTutor")?.defaultText).toBe(infoPageActions.joinTutor);
  });

  it("resolves a route to its copy, and nothing for a route it does not own", () => {
    expect(findInfoPageCopy("/contact")?.eyebrow).toBe("Contact");
    expect(findInfoPageCopy("/tutors")?.eyebrow).toBe("For tutors");
    expect(findInfoPageCopy("/not-a-page")).toBeUndefined();
  });
});
