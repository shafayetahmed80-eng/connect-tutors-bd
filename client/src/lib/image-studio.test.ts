import { describe, expect, it } from "vitest";
import { PLATE_SAMPLE, imageFileName, imageStudioSections, imageStudioSizes, isImageStudioSection, maxScaleFor, plateLines } from "./image-studio";

describe("the Image Section sizes", () => {
  it("offers each section its own sizes, every one a whole, distinct size", () => {
    for (const section of imageStudioSections) {
      const sizes = imageStudioSizes[section];
      expect(sizes.length, section).toBeGreaterThan(0);
      expect(new Set(sizes.map(size => size.id)).size, section).toBe(sizes.length);
      for (const size of sizes) {
        expect(Number.isInteger(size.width) && Number.isInteger(size.height), size.id).toBe(true);
      }
    }
  });

  it("uses the sizes the platforms ask for", () => {
    expect(imageStudioSizes.poster.find(size => size.id === "square-post")).toMatchObject({ width: 1080, height: 1080 });
    expect(imageStudioSizes.poster.find(size => size.id === "story")).toMatchObject({ width: 1080, height: 1920 });
    expect(imageStudioSizes.banner.find(size => size.id === "facebook-cover")).toMatchObject({ width: 1640, height: 624 });
  });

  it("knows its three sections and nothing else", () => {
    expect(["poster", "banner", "logo"].every(isImageStudioSection)).toBe(true);
    expect(isImageStudioSection("video")).toBe(false);
    expect(isImageStudioSection(undefined)).toBe(false);
  });
});

describe("export", () => {
  it("caps the sharpness where the picture would be too large for a phone to make", () => {
    expect(maxScaleFor({ id: "square-post", label: "", width: 1080, height: 1080 })).toBe(3);
    // 2560×1440 at 3× is 7680×4320, past the limit; 2× (5120×2880) is not.
    expect(maxScaleFor({ id: "youtube-banner", label: "", width: 2560, height: 1440 })).toBe(2);
  });

  it("names the file after the section, the size and the pixels it really has", () => {
    const size = imageStudioSizes.banner[0];
    expect(imageFileName("banner", size, "jpg", 2)).toBe("connect-tutors-banner-facebook-cover-3280x1248.jpg");
  });
});

describe("the sample text on the plate", () => {
  const text = { bnFamily: "studio-mina", bnWeight: 700, enFamily: "studio-syne", enWeight: 800 };

  it("draws Bangla alone, English alone, or the English name over the Bangla line", () => {
    expect(plateLines({ ...text, mode: "bn" })).toEqual([{ text: PLATE_SAMPLE.bn, family: "studio-mina", weight: 700 }]);
    expect(plateLines({ ...text, mode: "en" })).toEqual([{ text: PLATE_SAMPLE.en, family: "studio-syne", weight: 800 }]);
    expect(plateLines({ ...text, mode: "mixed" }).map(line => line.family)).toEqual(["studio-syne", "studio-mina"]);
  });
});
