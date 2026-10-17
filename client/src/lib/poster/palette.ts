/**
 * The colour engine behind the Facebook posters' background picker.
 *
 * An Admin picks one colour - the poster's ground - and every other colour a
 * poster needs follows from it: the text on the ground, the softer text, the
 * icons, the hairlines, the QR's dark, and the surfaces set against the ground
 * (a panel, a card, a band). Nothing here touches a canvas, so the rules can be
 * tested on their own.
 *
 * Two promises hold for any colour that is picked:
 *  - the headline text reads at 7:1 or better against the ground, and every
 *    other text colour at 4.5:1 or better against what it is drawn on;
 *  - the hue is the Admin's. When a colour is too mid-toned for either white or
 *    dark text, only its lightness moves - the smallest move that makes it
 *    legible - and the poster is drawn on that colour instead.
 */

export type Rgb = { r: number; g: number; b: number };
export type Hsl = { h: number; s: number; l: number };

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));

/** "#ABC" or "abcdef" to "#aabbcc"; null for anything that is not a 3- or 6-digit hex colour. */
export function normalizeHex(input: string): string | null {
  const match = /^#?([0-9a-f]{3}|[0-9a-f]{6})$/i.exec(input.trim());
  if (!match) return null;
  const digits = match[1].toLowerCase();
  const full = digits.length === 3 ? digits.split("").map(char => char + char).join("") : digits;
  return `#${full}`;
}

export function hexToRgb(hex: string): Rgb {
  const value = Number.parseInt(hex.slice(1), 16);
  return { r: (value >> 16) & 255, g: (value >> 8) & 255, b: value & 255 };
}

export function rgbToHex({ r, g, b }: Rgb): string {
  const part = (channel: number) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, "0");
  return `#${part(r)}${part(g)}${part(b)}`;
}

export function hexToHsl(hex: string): Hsl {
  const { r, g, b } = hexToRgb(hex);
  const red = r / 255;
  const green = g / 255;
  const blue = b / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const delta = max - min;
  const l = (max + min) / 2;
  if (delta === 0) return { h: 0, s: 0, l: l * 100 };
  const s = delta / (1 - Math.abs(2 * l - 1));
  let h: number;
  if (max === red) h = ((green - blue) / delta) % 6;
  else if (max === green) h = (blue - red) / delta + 2;
  else h = (red - green) / delta + 4;
  return { h: (h * 60 + 360) % 360, s: s * 100, l: l * 100 };
}

export function hslToHex({ h, s, l }: Hsl): string {
  const saturation = clamp(s, 0, 100) / 100;
  const lightness = clamp(l, 0, 100) / 100;
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const hue = (((h % 360) + 360) % 360) / 60;
  const x = chroma * (1 - Math.abs((hue % 2) - 1));
  const [red, green, blue] = hue < 1 ? [chroma, x, 0] : hue < 2 ? [x, chroma, 0] : hue < 3 ? [0, chroma, x] : hue < 4 ? [0, x, chroma] : hue < 5 ? [x, 0, chroma] : [chroma, 0, x];
  const match = lightness - chroma / 2;
  return rgbToHex({ r: (red + match) * 255, g: (green + match) * 255, b: (blue + match) * 255 });
}

/** WCAG relative luminance, 0 (black) to 1 (white). */
export function luminance(hex: string): number {
  const { r, g, b } = hexToRgb(hex);
  const channel = (value: number) => {
    const unit = value / 255;
    return unit <= 0.03928 ? unit / 12.92 : ((unit + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG contrast ratio between two colours, 1 to 21. */
export function contrastRatio(a: string, b: string): number {
  const first = luminance(a);
  const second = luminance(b);
  return (Math.max(first, second) + 0.05) / (Math.min(first, second) + 0.05);
}

/** `hex` as a canvas rgba() colour at `alpha`. */
export function withAlpha(hex: string, alpha: number): string {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

/**
 * Moves a colour's lightness one point at a time, in `direction`, until it
 * reaches `min` contrast against `against`. It always arrives: white and black
 * are both within reach of the ground a palette is built on.
 */
export function tune(color: Hsl, against: string, min: number, direction: 1 | -1): string {
  let l = color.l;
  for (let step = 0; step <= 100; step += 1) {
    const hex = hslToHex({ ...color, l });
    if (contrastRatio(hex, against) >= min) return hex;
    if ((direction === 1 && l >= 100) || (direction === -1 && l <= 0)) return hex;
    l = clamp(l + direction, 0, 100);
  }
  return hslToHex({ ...color, l });
}

/** The warm highlight dark designs have always used: salary, kicker, rules, the seal. */
const GOLD: Hsl = { h: 40, s: 100, l: 65 };
const WHITE = "#ffffff";
/** Headline text must read this well on the ground; the rest, this well on theirs. */
export const HEADLINE_CONTRAST = 7;
export const TEXT_CONTRAST = 4.5;

/** The dark text colour for a ground of this hue: the hue, deep. */
export function darkInk(hue: number): string {
  return hslToHex({ h: hue, s: 55, l: 12 });
}

/** The deepest a ground may be to carry light text at 7:1, and the lightest to carry dark text. */
const DARK_MAX_LUMINANCE = 1.05 / HEADLINE_CONTRAST - 0.05;

function lightMinLuminance(hue: number): number {
  return HEADLINE_CONTRAST * (luminance(darkInk(hue)) + 0.05) - 0.05;
}

/** The lightness, between `from` and `to`, nearest `from` that still passes `ok` (bisection). */
function nearestLightness(color: Hsl, to: number, ok: (hex: string) => boolean): number {
  let pass = to;
  let fail = color.l;
  for (let step = 0; step < 24; step += 1) {
    const middle = (pass + fail) / 2;
    if (ok(hslToHex({ ...color, l: middle }))) pass = middle;
    else fail = middle;
  }
  return pass;
}

/**
 * The ground a poster is actually drawn on, and whether it is dark.
 *
 * A ground deep enough for white text, or light enough for dark text, is used
 * exactly as picked. One in between has only its lightness moved - towards the
 * nearer side - by the least that makes it legible.
 */
export function legibleGround(chosen: string): { ground: string; dark: boolean } {
  const hsl = hexToHsl(chosen);
  const lightMin = lightMinLuminance(hsl.h);
  const value = luminance(chosen);
  if (value >= lightMin) return { ground: chosen, dark: false };
  if (value <= DARK_MAX_LUMINANCE) return { ground: chosen, dark: true };
  const lighter = nearestLightness(hsl, 100, hex => luminance(hex) >= lightMin * 1.02);
  const darker = nearestLightness(hsl, 0, hex => luminance(hex) <= DARK_MAX_LUMINANCE * 0.98);
  return Math.abs(lighter - hsl.l) <= Math.abs(hsl.l - darker)
    ? { ground: hslToHex({ ...hsl, l: lighter }), dark: false }
    : { ground: hslToHex({ ...hsl, l: darker }), dark: true };
}

/** What a surface set against the ground is: a darker panel, a lighter card, a deep block, or a vivid band. */
export type DeepSurface = "panel" | "card" | "deep" | "band";

/** The colours for text and rules drawn on a surface that is always dark enough for light text. */
export type OnDeep = { fill: string; stroke: string; ink: string; soft: string; detail: string; accent: string; hair: string };

export type PosterPalette = {
  /** The ground drawn, which is the colour picked unless legibility moved its lightness. */
  ground: string;
  /** Light text on a dark ground; dark text on a light one. */
  dark: boolean;
  ink: string;
  soft: string;
  detail: string;
  accent: string;
  hair: string;
  /** The cradle mark's colour on the ground. */
  cradle: string;
  /** The QR's modules, drawn on a white tile. */
  qrDark: string;
  /** A pale fill for a pill on a light ground. */
  tint: string;
  /** The brand tile behind a white cradle. */
  tile: string;
  watermark: { color: string; alpha: number };
  grain: { alpha: number; blend: GlobalCompositeOperation };
  /** The surface set against the ground, and the colours for what is drawn on it. */
  deep: OnDeep;
};

/** Light-text colours for a surface of `fill`, in the hue `h`. */
function onSurface(fill: string, h: number, s: number, vivid = false): OnDeep {
  const soft = vivid
    ? tune({ h, s: 100, l: 92 }, fill, TEXT_CONTRAST, 1)
    : tune({ h, s: clamp(s * 0.5, 12, 34), l: 84 }, fill, TEXT_CONTRAST, 1);
  const detail = vivid
    ? tune({ h, s: 100, l: 88 }, fill, TEXT_CONTRAST, 1)
    : tune({ h, s: clamp(s, 55, 100), l: 76 }, fill, TEXT_CONTRAST, 1);
  return {
    fill,
    stroke: "rgba(255,255,255,0.08)",
    ink: WHITE,
    soft,
    detail,
    accent: tune(GOLD, fill, TEXT_CONTRAST, 1),
    hair: "rgba(255,255,255,0.14)",
  };
}

/** Every colour a poster needs, from the one the Admin picked. */
export function derivePalette(chosen: string, surface: DeepSurface = "deep"): PosterPalette {
  const { ground, dark } = legibleGround(chosen);
  const hsl = hexToHsl(ground);
  const { h } = hsl;
  const s = hsl.s;

  const deepInk = darkInk(h);
  const ink = dark ? WHITE : deepInk;
  const soft = dark
    ? tune({ h, s: clamp(s * 0.5, 12, 34), l: 84 }, ground, TEXT_CONTRAST, 1)
    : tune({ h, s: clamp(s * 0.55, 20, 45), l: 32 }, ground, TEXT_CONTRAST, -1);
  const detail = dark
    ? tune({ h, s: clamp(s, 55, 100), l: 76 }, ground, TEXT_CONTRAST, 1)
    : tune({ h, s: clamp(s, 50, 85), l: 30 }, ground, TEXT_CONTRAST, -1);
  const accent = dark
    ? tune(GOLD, ground, TEXT_CONTRAST, 1)
    : tune({ h: 36, s: 90, l: 30 }, ground, TEXT_CONTRAST, -1);

  // The deep surface: always dark enough for light text, whichever way the ground leans.
  const lightGroundFill = hslToHex({ h, s: clamp(s * 0.9, 35, 70), l: 15 });
  let fill: string;
  if (surface === "band") fill = tune({ h, s: clamp(s * 1.1, 60, 85), l: 34 }, WHITE, TEXT_CONTRAST, -1);
  else if (!dark) fill = lightGroundFill;
  else if (surface === "panel") fill = hslToHex({ ...hsl, l: hsl.l * 0.68 });
  else if (surface === "card") fill = hslToHex({ ...hsl, l: Math.min(hsl.l + 5, 30) });
  else fill = hslToHex({ ...hsl, l: hsl.l * 0.82 });

  return {
    ground,
    dark,
    ink,
    soft,
    detail,
    accent,
    hair: dark ? "rgba(255,255,255,0.16)" : withAlpha(deepInk, 0.16),
    cradle: dark ? WHITE : deepInk,
    qrDark: dark ? ground : deepInk,
    tint: hslToHex({ h, s: clamp(s, 25, 60), l: 92 }),
    tile: tune({ h, s: 70, l: 34 }, WHITE, TEXT_CONTRAST, -1),
    watermark: dark ? { color: WHITE, alpha: 0.035 } : { color: tune({ h, s: 70, l: 36 }, ground, 3, -1), alpha: 0.045 },
    grain: dark ? { alpha: 0.07, blend: "soft-light" } : { alpha: 0.05, blend: "multiply" },
    deep: onSurface(fill, h, s, surface === "band"),
  };
}
