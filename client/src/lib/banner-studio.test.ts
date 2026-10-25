// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import {
  bannerTemplates,
  bannerThemes,
  findBannerTemplate,
  findBannerTheme,
  formatBannerPhone,
  getBannerSafeZone,
  renderBanner,
  type BannerRenderInput,
} from "./banner-studio";

describe("banner-studio", () => {
  it("provides rich templates and themes", () => {
    expect(bannerTemplates.length).toBeGreaterThanOrEqual(4);
    expect(bannerThemes.length).toBeGreaterThanOrEqual(5);

    const defaultTemplate = findBannerTemplate("brand-hero");
    expect(defaultTemplate.name).toContain("ব্র্যান্ড");

    const unknownTemplate = findBannerTemplate("non-existent");
    expect(unknownTemplate).toBe(bannerTemplates[0]);

    const navyTheme = findBannerTheme("navy");
    expect(navyTheme.accent).toBe("#38bdf8");

    const fallbackTheme = findBannerTheme("unknown-theme");
    expect(fallbackTheme).toBe(bannerThemes[0]);
  });

  it("formats Bangladesh phone numbers accurately", () => {
    expect(formatBannerPhone("8801516131411")).toBe("+880 1516-131411");
    expect(formatBannerPhone("01516131411")).toBe("+880 1516-131411");
    expect(formatBannerPhone("+8801711223344")).toBe("+880 1711-223344");
    expect(formatBannerPhone("12345")).toBe("12345");
  });

  it("calculates accurate platform safe zones for Facebook Cover, YouTube, and Link Share", () => {
    // Facebook cover: 1640x624
    const fbSafe = getBannerSafeZone("facebook-cover", 1640, 624);
    expect(fbSafe.x).toBeGreaterThan(100);
    expect(fbSafe.width).toBeLessThan(1640);
    expect(fbSafe.height).toBe(624);
    expect(fbSafe.description).toContain("Mobile Safe Zone");

    // YouTube banner: 2560x1440
    const ytSafe = getBannerSafeZone("youtube-banner", 2560, 1440);
    expect(ytSafe.x).toBeGreaterThan(450);
    expect(ytSafe.y).toBeGreaterThan(450);
    expect(ytSafe.width).toBe(1546);
    expect(ytSafe.height).toBe(423);
    expect(ytSafe.description).toContain("All-Device Safe Area");

    // Share banner: 1200x630
    const shareSafe = getBannerSafeZone("share-banner", 1200, 630);
    expect(shareSafe.x).toBe(60);
    expect(shareSafe.y).toBe(32); // Math.round(630 * 0.05) = 31.5 -> 32
    expect(shareSafe.width).toBe(1080);
    expect(shareSafe.height).toBe(566);
  });

  it("renders banner on a mock canvas without crashing", () => {
    const canvas = document.createElement("canvas");
    const template = bannerTemplates[0];
    const theme = bannerThemes[0];

    const input: BannerRenderInput = {
      width: 1640,
      height: 624,
      scale: 1,
      sizeId: "facebook-cover",
      template,
      theme,
      content: template.content,
      fonts: {
        headline: "Anek Bangla",
        headlineWeight: 700,
        body: "Noto Sans Bengali",
        bodyWeight: 500,
        english: "DM Sans",
        englishWeight: 700,
      },
      showSafeZoneOverlay: true,
    };

    expect(() => renderBanner(canvas, input)).not.toThrow();
    expect(canvas.width).toBe(1640);
    expect(canvas.height).toBe(624);
  });
});
