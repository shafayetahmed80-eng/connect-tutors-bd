import { describe, expect, it } from "vitest";
import {
  findPosterTemplate,
  formatPosterPhone,
  photoCrop,
  posterFileName,
  posterIconNames,
  parsePosterBadge,
  posterPhotoFrame,
  posterTemplates,
  wrapWords,
} from "./poster-studio";

describe("poster studio helpers", () => {
  it("prints the WhatsApp number the way it is read", () => {
    expect(formatPosterPhone("8801516131411")).toBe("+880 1516-131411");
    expect(formatPosterPhone("+880 1516-131411")).toBe("+880 1516-131411");
    expect(formatPosterPhone("123")).toBe("+123");
  });

  it("wraps words to the width and folds any overflow into the last line", () => {
    const measure = (text: string) => text.length * 10;
    expect(wrapWords(measure, "aa bb cc dd", 50, 3)).toEqual(["aa bb", "cc dd"]);
    expect(wrapWords(measure, "aa bb cc dd ee ff", 50, 2)).toEqual(["aa bb", "cc dd ee ff"]);
    expect(wrapWords(measure, "averyveryverylongword x", 50, 3)).toEqual(["averyveryverylongword", "x"]);
    expect(wrapWords(measure, "   ", 50, 3)).toEqual([]);
  });

  it("crops the photo to cover its frame without stretching, moved by x and y", () => {
    const frame = { width: 600, height: 600 };
    const centre = photoCrop({ width: 1200, height: 800 }, frame, 1, 0, 0);
    expect(centre.sw / centre.sh).toBeCloseTo(1);
    expect(centre.sh).toBeCloseTo(800);
    expect(centre.sx).toBeCloseTo(200);

    expect(photoCrop({ width: 1200, height: 800 }, frame, 1, -1, 0).sx).toBeCloseTo(0);
    expect(photoCrop({ width: 1200, height: 800 }, frame, 1, 1, 0).sx).toBeCloseTo(400);
    const zoomed = photoCrop({ width: 1200, height: 800 }, frame, 2, 0, 0);
    expect(zoomed.sw).toBeCloseTo(400);
    // Zoom below 1 would leave gaps, so it is held at 1.
    expect(photoCrop({ width: 1200, height: 800 }, frame, 0.5, 0, 0).sw).toBeCloseTo(800);
  });

  it("puts the photo frame on the right, above the band", () => {
    const frame = posterPhotoFrame(1080, 1350);
    expect(frame.x + frame.width).toBeCloseTo(1080);
    expect(frame.height).toBeLessThan(1350);
  });

  it("ships the female-tutor template with the Owner's words, badge and QR", () => {
    const template = findPosterTemplate("female-tutor")!;
    expect(template).toBe(posterTemplates[0]);
    expect(template.content.headline).toHaveLength(3);
    expect(template.content.badge).toContain("BTPA");
    expect(template.content.showQr).toBe(true);
    for (const feature of template.content.features) expect(posterIconNames).toContain(feature.icon);
    expect(findPosterTemplate("nope")).toBeUndefined();
  });

  it("names the file for the template, size and scale", () => {
    expect(posterFileName("female-tutor", { id: "portrait-post", width: 1080, height: 1350 }, "png", 2)).toBe("connect-tutors-poster-female-tutor-portrait-post-2160x2700.png");
  });

  it("splits the badge into the seal's label, number and foot, or leaves odd text alone", () => {
    expect(parsePosterBadge("Since 2015 | BTPA Member · Code: BTPA-077")).toEqual({ label: "BTPA MEMBER", big: "077", foot: "SINCE 2015" });
    expect(parsePosterBadge("Est. 2019 | Licensed · No. 42")).toEqual({ label: "LICENSED", big: "42", foot: "EST. 2019" });
    expect(parsePosterBadge("Trusted by parents")).toBeNull();
    expect(parsePosterBadge("Since 2015 | Member")).toBeNull();
  });
});
