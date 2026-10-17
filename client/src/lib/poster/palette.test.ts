import { describe, expect, it } from "vitest";
import {
  contrastRatio,
  derivePalette,
  hexToHsl,
  hexToRgb,
  hslToHex,
  legibleGround,
  luminance,
  normalizeHex,
  rgbToHex,
  tune,
  withAlpha,
  type DeepSurface,
} from "./palette";

/** A fixed pseudo-random run of colours, so a failure names the colour that caused it. */
function randomColours(count: number): string[] {
  let seed = 20261017;
  const next = () => {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 2 ** 32;
  };
  return Array.from({ length: count }, () => rgbToHex({ r: next() * 255, g: next() * 255, b: next() * 255 }));
}

const EDGES = ["#000000", "#ffffff", "#808080", "#ff0000", "#00ff00", "#0000ff", "#ffff00", "#ff00ff", "#00ffff", "#7f7f00", "#3a3a3a", "#c8c8c8", "#ffc24d", "#0e2442", "#e2eef3"];
const COLOURS = [...EDGES, ...randomColours(900)];
const SURFACES: DeepSurface[] = ["panel", "card", "deep", "band"];

describe("hex handling", () => {
  it("reads three- and six-digit hex, with or without the hash, in any case", () => {
    expect(normalizeHex("#ABC")).toBe("#aabbcc");
    expect(normalizeHex("0E2442")).toBe("#0e2442");
    expect(normalizeHex("  #0E2442 ")).toBe("#0e2442");
    for (const bad of ["", "#12", "#12345", "#1234567", "red", "#ggg", "##123456"]) expect(normalizeHex(bad), bad).toBeNull();
  });

  it("converts between hex, rgb and hsl without drifting", () => {
    expect(hexToRgb("#0e2442")).toEqual({ r: 14, g: 36, b: 66 });
    expect(rgbToHex({ r: 14, g: 36, b: 66 })).toBe("#0e2442");
    for (const hex of COLOURS.slice(0, 300)) {
      const back = hexToRgb(hslToHex(hexToHsl(hex)));
      const original = hexToRgb(hex);
      for (const channel of ["r", "g", "b"] as const) expect(Math.abs(back[channel] - original[channel]), hex).toBeLessThanOrEqual(1);
    }
  });

  it("measures luminance and contrast the WCAG way", () => {
    expect(luminance("#ffffff")).toBeCloseTo(1, 5);
    expect(luminance("#000000")).toBeCloseTo(0, 5);
    expect(contrastRatio("#000000", "#ffffff")).toBeCloseTo(21, 3);
    expect(contrastRatio("#ffffff", "#000000")).toBeCloseTo(21, 3);
    expect(contrastRatio("#777777", "#ffffff")).toBeCloseTo(4.48, 1);
  });

  it("writes a colour as an rgba() canvas colour", () => {
    expect(withAlpha("#0e2442", 0.16)).toBe("rgba(14,36,66,0.16)");
  });

  it("tunes a colour's lightness until it clears the contrast asked for", () => {
    const tuned = tune({ h: 210, s: 60, l: 40 }, "#0e2442", 4.5, 1);
    expect(contrastRatio(tuned, "#0e2442")).toBeGreaterThanOrEqual(4.5);
    // It stops at the first lightness that does, not at white.
    expect(hexToHsl(tuned).l).toBeLessThan(80);
  });
});

describe("the ground a poster is drawn on", () => {
  it("is the colour picked, exactly, when it is deep or light enough for text", () => {
    for (const exact of ["#0e2442", "#0b3d2e", "#3a0b17", "#000000", "#ffffff", "#e2eef3", "#fffefa", "#f7e3e7"]) {
      expect(legibleGround(exact).ground, exact).toBe(exact);
    }
    expect(legibleGround("#0e2442").dark).toBe(true);
    expect(legibleGround("#e2eef3").dark).toBe(false);
  });

  it("moves only the lightness of a mid-toned colour, towards the nearer side", () => {
    const picked = "#808080";
    const { ground, dark } = legibleGround(picked);
    expect(ground).not.toBe(picked);
    const before = hexToHsl(picked);
    const after = hexToHsl(ground);
    expect(after.s).toBeCloseTo(before.s, 0);
    expect(dark ? after.l < before.l : after.l > before.l).toBe(true);
    // Mid blue: lighter is the closer legible side.
    expect(legibleGround("#3aa0d0").dark).toBe(false);
  });

  it("keeps the picked hue and settles in one step, for any colour", () => {
    for (const colour of COLOURS) {
      const first = legibleGround(colour);
      expect(legibleGround(first.ground).ground, colour).toBe(first.ground);
      const before = hexToHsl(colour);
      const after = hexToHsl(first.ground);
      if (before.s > 15 && before.l > 4 && before.l < 96) {
        const gap = Math.abs(((after.h - before.h + 540) % 360) - 180);
        expect(gap, colour).toBeLessThanOrEqual(3);
      }
    }
  });
});

describe("the palette derived from a ground", () => {
  it("reads the headline at 7:1 and every other text at 4.5:1 on the ground, for any colour", () => {
    for (const colour of COLOURS) {
      for (const surface of SURFACES) {
        const p = derivePalette(colour, surface);
        const label = `${colour} / ${surface}`;
        expect(contrastRatio(p.ink, p.ground), `${label} ink`).toBeGreaterThanOrEqual(6.99);
        expect(contrastRatio(p.soft, p.ground), `${label} soft`).toBeGreaterThanOrEqual(4.49);
        expect(contrastRatio(p.detail, p.ground), `${label} detail`).toBeGreaterThanOrEqual(4.49);
        expect(contrastRatio(p.accent, p.ground), `${label} accent`).toBeGreaterThanOrEqual(4.49);
      }
    }
  });

  it("reads what is drawn on the deep surface at 4.5:1, whichever way the ground leans", () => {
    for (const colour of COLOURS) {
      for (const surface of SURFACES) {
        const { deep } = derivePalette(colour, surface);
        const label = `${colour} / ${surface}`;
        for (const role of ["ink", "soft", "detail", "accent"] as const) {
          expect(contrastRatio(deep[role], deep.fill), `${label} ${role}`).toBeGreaterThanOrEqual(4.49);
        }
      }
    }
  });

  it("keeps the QR's dark and the brand tile dark enough to scan and to carry a white cradle", () => {
    for (const colour of COLOURS) {
      const p = derivePalette(colour);
      expect(contrastRatio(p.qrDark, "#ffffff"), `${colour} qr`).toBeGreaterThanOrEqual(6.99);
      expect(contrastRatio(p.tile, "#ffffff"), `${colour} tile`).toBeGreaterThanOrEqual(4.49);
    }
  });

  it("flips to dark text on a light ground and white text on a dark one", () => {
    const night = derivePalette("#0e2442");
    expect(night.dark).toBe(true);
    expect(night.ink).toBe("#ffffff");
    expect(night.cradle).toBe("#ffffff");
    expect(night.qrDark).toBe("#0e2442");
    expect(night.grain.blend).toBe("soft-light");

    const day = derivePalette("#e2eef3");
    expect(day.dark).toBe(false);
    expect(day.ink).not.toBe("#ffffff");
    expect(luminance(day.ink)).toBeLessThan(0.05);
    expect(day.grain.blend).toBe("multiply");
    // A light poster still sets its panels and bands dark, with light text on them.
    expect(luminance(day.deep.fill)).toBeLessThan(0.05);
    expect(day.deep.ink).toBe("#ffffff");
  });

  it("sets each kind of surface against the ground its own way", () => {
    const ground = "#0b3d2e";
    const base = hexToHsl(ground).l;
    expect(hexToHsl(derivePalette(ground, "panel").deep.fill).l).toBeLessThan(base);
    expect(hexToHsl(derivePalette(ground, "card").deep.fill).l).toBeGreaterThan(base);
    expect(hexToHsl(derivePalette(ground, "deep").deep.fill).l).toBeLessThan(base);
    const band = hexToHsl(derivePalette(ground, "band").deep.fill);
    expect(band.s).toBeGreaterThanOrEqual(60);
    expect(band.l).toBeGreaterThan(base);
  });

  it("names the same hue on every role, so one colour reads as one poster", () => {
    const p = derivePalette("#2e1a47");
    const hue = hexToHsl(p.ground).h;
    for (const role of [p.soft, p.detail, p.deep.fill, p.tint, p.tile]) {
      const gap = Math.abs(((hexToHsl(role).h - hue + 540) % 360) - 180);
      expect(gap).toBeLessThanOrEqual(6);
    }
  });
});
