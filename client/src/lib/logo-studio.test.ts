import { describe, expect, it } from "vitest";
import { allLogoVariants, buildLogo, logoColourways, logoFileName, logoForms, type LogoFonts } from "./logo-studio";
import { buildZip, crc32 } from "./zip";

const fonts: LogoFonts = { bnFamily: "studio-mina", bnWeight: 700, enFamily: "studio-dm-sans", enRegular: 400, enBold: 800 };
/** A fixed-width stand-in for the canvas: 0.5 of the size per letter. */
const measure = (text: string, font: string) => text.length * Number(/(\d+(?:\.\d+)?)px/.exec(font)![1]) * 0.5;
const way = (id: string) => logoColourways.find(item => item.id === id)!;

describe("the logo", () => {
  it("draws the cradle: four resting balls, the lifted one in the accent, and the bar", () => {
    const { svg } = buildLogo({ form: "icon", name: "mixed", colourway: way("site-blue"), fonts, measure });
    expect((svg.match(/<circle/g) ?? []).length).toBe(5);
    expect(svg).toContain('fill="#ffc24d"');
    expect(svg).toContain('stroke-linecap="round"');
  });

  it("gives the icon a rounded square on a coloured way and nothing behind it on a transparent one", () => {
    const blue = buildLogo({ form: "icon", name: "en", colourway: way("site-blue"), fonts, measure });
    expect(blue.width).toBe(blue.height);
    expect(blue.svg).toContain('<rect width="400" height="400" rx="88" fill="#0b4b86"/>');
    expect(buildLogo({ form: "icon", name: "en", colourway: way("white"), fonts, measure }).svg).not.toContain("<rect");
  });

  it("keeps the icon free of text and gives each other form its own shape", () => {
    expect(buildLogo({ form: "icon", name: "mixed", colourway: way("colour"), fonts, measure }).svg).not.toContain("<text");
    const horizontal = buildLogo({ form: "horizontal", name: "mixed", colourway: way("colour"), fonts, measure });
    const vertical = buildLogo({ form: "vertical", name: "mixed", colourway: way("colour"), fonts, measure });
    const wordmark = buildLogo({ form: "wordmark", name: "mixed", colourway: way("colour"), fonts, measure });
    expect(horizontal.width).toBeGreaterThan(horizontal.height * 2);
    expect(vertical.height).toBeGreaterThan(vertical.width * 0.5);
    expect(wordmark.svg).not.toContain("<circle");
  });

  it("sets Connect light and Tutors heavy in English, and the Bangla name in its own font", () => {
    const { svg } = buildLogo({ form: "horizontal", name: "mixed", colourway: way("site-blue"), fonts, measure });
    expect(svg).toContain('font-family="studio-dm-sans" font-weight="400">Connect ');
    expect(svg).toContain('font-family="studio-dm-sans" font-weight="800">Tutors');
    expect(svg).toContain('font-family="studio-mina" font-weight="700">কানেক্ট টিউটর্স');
  });

  it("shows only the language asked for", () => {
    expect(buildLogo({ form: "wordmark", name: "en", colourway: way("black"), fonts, measure }).svg).not.toContain("কানেক্ট");
    const bangla = buildLogo({ form: "wordmark", name: "bn", colourway: way("black"), fonts, measure }).svg;
    expect(bangla).toContain("কানেক্ট");
    expect(bangla).not.toContain("Connect");
  });

  it("makes the whole logo one colour on the white and black ways", () => {
    for (const [id, colour] of [["white", "#ffffff"], ["black", "#000000"]] as const) {
      const { svg } = buildLogo({ form: "horizontal", name: "mixed", colourway: way(id), fonts, measure });
      const fills = new Set([...svg.matchAll(/(?:fill|stroke)="(#[0-9a-f]{6})"/g)].map(match => match[1]));
      expect(fills, id).toEqual(new Set([colour]));
    }
  });

  it("grows the picture with the name instead of cutting it", () => {
    const short = buildLogo({ form: "wordmark", name: "en", colourway: way("colour"), fonts, measure });
    const both = buildLogo({ form: "wordmark", name: "mixed", colourway: way("colour"), fonts, measure });
    expect(both.height).toBeGreaterThan(short.height);
  });

  it("escapes anything unsafe in a font name", () => {
    const { svg } = buildLogo({ form: "wordmark", name: "en", colourway: way("colour"), fonts: { ...fonts, enFamily: 'a"b<c' }, measure });
    expect(svg).toContain("a&quot;b&lt;c");
  });

  it("names every file after its form, language, colour way and size", () => {
    expect(logoFileName("icon", "site-blue", "mixed", "svg")).toBe("connect-tutors-logo-icon-site-blue.svg");
    expect(logoFileName("horizontal", "on-white", "mixed", "png", 2)).toBe("connect-tutors-logo-horizontal-en-bn-on-white@2x.png");
    expect(logoFileName("wordmark", "black", "bn", "svg")).toBe("connect-tutors-logo-wordmark-bn-black.svg");
  });

  it("lists every form in every colour way", () => {
    expect(allLogoVariants()).toHaveLength(logoForms.length * logoColourways.length);
  });
});

describe("the zip writer", () => {
  it("computes the standard CRC-32", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926);
  });

  it("writes a readable archive: signatures, entry count, UTF-8 names and the stored bytes", () => {
    const zip = buildZip([{ path: "logo/আইকন.svg", data: new TextEncoder().encode("<svg/>") }, { path: "logo/b.png", data: new Uint8Array([1, 2, 3]) }]);
    const view = new DataView(zip.buffer, zip.byteOffset, zip.byteLength);
    expect(view.getUint32(0, true)).toBe(0x04034b50);
    expect(view.getUint32(zip.length - 22, true)).toBe(0x06054b50);
    expect(view.getUint16(zip.length - 22 + 10, true)).toBe(2);
    expect(view.getUint16(6, true) & 0x0800).toBe(0x0800);
    const text = new TextDecoder().decode(zip);
    expect(text).toContain("logo/আইকন.svg");
    expect(text).toContain("<svg/>");
  });
});
