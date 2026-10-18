import QRCode from "qrcode";

/**
 * The drawing pieces every Facebook poster shares: text that fits its box, the
 * Newton's-cradle mark, the BTPA seal, a QR tile, line icons and a fine grain.
 *
 * Everything is drawn in poster pixels (1080 or 1200 wide). Text is placed by
 * its vertical centre, which reads the same for Latin and Bengali glyphs.
 */

/** Latin from DM Sans, Bengali from the poster's own Noto Sans Bengali faces (see fonts.css). */
export const POSTER_FONT_STACK = `"DM Sans", "Poster Bengali", "Noto Sans Bengali", sans-serif`;

/** The Mist poster's serif, for headlines and numbers: Latin and Bangla alike (see fonts.css). */
export const POSTER_SERIF_STACK = `"Poster Serif", "Noto Serif Bengali", Georgia, serif`;

export type PosterFace = "sans" | "serif";

const faceStack = (face: PosterFace) => (face === "serif" ? POSTER_SERIF_STACK : POSTER_FONT_STACK);

export type TextOptions = {
  size: number;
  weight?: number;
  color: string;
  align?: CanvasTextAlign;
  /** The typeface; the poster's sans unless it says serif. */
  face?: PosterFace;
  /** The widest the text may draw. It first shrinks (down to `minSize`), then ends in "…". */
  maxWidth?: number;
  minSize?: number;
  /** Letter spacing in em. */
  tracking?: number;
  alpha?: number;
};

export function setFont(ctx: CanvasRenderingContext2D, size: number, weight = 600, tracking = 0, face: PosterFace = "sans") {
  ctx.font = `${weight} ${size}px ${faceStack(face)}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = tracking ? `${(tracking * size).toFixed(2)}px` : "0px";
}

export function measure(ctx: CanvasRenderingContext2D, text: string, size: number, weight = 600, tracking = 0, face: PosterFace = "sans"): number {
  setFont(ctx, size, weight, tracking, face);
  return ctx.measureText(text).width;
}

/** Split into what a reader sees as characters, so a cut never lands inside a Bengali conjunct. */
function graphemes(text: string): string[] {
  const Segmenter = (Intl as unknown as { Segmenter?: new (locale?: string, options?: { granularity: string }) => { segment: (input: string) => Iterable<{ segment: string }> } }).Segmenter;
  if (Segmenter) return Array.from(new Segmenter(undefined, { granularity: "grapheme" }).segment(text), part => part.segment);
  return Array.from(text);
}

/** The longest start of `text` that, with "…", fits `maxWidth`. */
export function ellipsize(ctx: CanvasRenderingContext2D, text: string, maxWidth: number): string {
  if (ctx.measureText(text).width <= maxWidth) return text;
  const parts = graphemes(text);
  let low = 0;
  let high = parts.length;
  while (low < high) {
    const mid = Math.ceil((low + high) / 2);
    const candidate = `${parts.slice(0, mid).join("").trimEnd()}…`;
    if (ctx.measureText(candidate).width <= maxWidth) low = mid;
    else high = mid - 1;
  }
  return low > 0 ? `${parts.slice(0, low).join("").trimEnd()}…` : "…";
}

/** Draws one line centred on `y`; returns the width drawn. */
export function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, options: TextOptions): number {
  const weight = options.weight ?? 600;
  const tracking = options.tracking ?? 0;
  let size = options.size;
  const minSize = options.minSize ?? Math.round(options.size * 0.8);
  const face = options.face ?? "sans";
  setFont(ctx, size, weight, tracking, face);
  if (options.maxWidth) {
    while (size > minSize && ctx.measureText(text).width > options.maxWidth) {
      size -= 2;
      setFont(ctx, size, weight, tracking, face);
    }
  }
  const line = options.maxWidth ? ellipsize(ctx, text, options.maxWidth) : text;
  ctx.save();
  ctx.globalAlpha = options.alpha ?? 1;
  ctx.fillStyle = options.color;
  ctx.textAlign = options.align ?? "left";
  ctx.textBaseline = "middle";
  ctx.fillText(line, x, y);
  ctx.restore();
  return ctx.measureText(line).width;
}

/** Breaks text into at most `maxLines` lines of `maxWidth`, the last one ending in "…" if it is cut. */
export function wrapLines(ctx: CanvasRenderingContext2D, text: string, size: number, weight: number, maxWidth: number, maxLines: number, face: PosterFace = "sans"): string[] {
  setFont(ctx, size, weight, 0, face);
  const words = text.split(/\s+/).filter(Boolean);
  const lines: string[] = [];
  let current = "";
  for (let index = 0; index < words.length; index += 1) {
    const next = current ? `${current} ${words[index]}` : words[index];
    if (ctx.measureText(next).width <= maxWidth || !current) {
      current = next;
      continue;
    }
    lines.push(current);
    current = words[index];
    if (lines.length === maxLines - 1) {
      current = words.slice(index).join(" ");
      break;
    }
  }
  if (current) lines.push(current);
  return lines.slice(0, maxLines).map(line => ellipsize(ctx, line, maxWidth));
}

export function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  if (typeof ctx.roundRect === "function") {
    ctx.roundRect(x, y, w, h, radius);
    return;
  }
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

export function fillRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = color;
  ctx.fill();
}

export function strokeRoundedRect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, color: string, width = 1, alpha = 1) {
  ctx.save();
  ctx.globalAlpha = alpha;
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
  ctx.restore();
}

export function hairline(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width = 1) {
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.stroke();
}

/** A straight line drawn as dashes: `dash` long, `gap` apart. */
export function dashedLine(ctx: CanvasRenderingContext2D, x1: number, y1: number, x2: number, y2: number, color: string, width: number, dash: number, gap: number) {
  ctx.save();
  ctx.setLineDash?.([dash, gap]);
  hairline(ctx, x1, y1, x2, y2, color, width);
  ctx.restore();
}

/**
 * A linear gradient across the box (x, y, w, h) from `angle` degrees - 0 runs
 * left to right, 90 top to bottom - through `stops` (offset 0 to 1, colour).
 * Where a canvas cannot make a gradient (tests) the first stop fills it flat.
 */
export function gradientFill(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, angle: number, stops: Array<[number, string]>): CanvasGradient | string {
  if (typeof ctx.createLinearGradient !== "function") return stops[0]![1];
  const radians = (angle * Math.PI) / 180;
  const dx = Math.cos(radians);
  const dy = Math.sin(radians);
  // The gradient line runs through the centre and is as long as the box's projection on it.
  const half = (Math.abs(w * dx) + Math.abs(h * dy)) / 2;
  const cx = x + w / 2;
  const cy = y + h / 2;
  const gradient = ctx.createLinearGradient(cx - dx * half, cy - dy * half, cx + dx * half, cy + dy * half);
  for (const [offset, color] of stops) gradient.addColorStop(offset, color);
  return gradient;
}

/** A rounded rectangle filled with a gradient (see `gradientFill`). */
export function fillRoundedGradient(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, angle: number, stops: Array<[number, string]>) {
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.fillStyle = gradientFill(ctx, x, y, w, h, angle, stops);
  ctx.fill();
}

/** A soft round glow: `color` at the centre fading to nothing at `radius`. */
export function radialGlow(ctx: CanvasRenderingContext2D, cx: number, cy: number, radius: number, color: string, alpha: number) {
  if (typeof ctx.createRadialGradient !== "function") return;
  const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, radius);
  gradient.addColorStop(0, color);
  gradient.addColorStop(1, "rgba(255,255,255,0)");
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.fillStyle = gradient;
  ctx.fillRect(cx - radius, cy - radius, radius * 2, radius * 2);
  ctx.restore();
}

/** A soft shadow under whatever `draw` paints, for a card that sits above the ground. */
export function withShadow(ctx: CanvasRenderingContext2D, color: string, blur: number, offsetY: number, draw: () => void) {
  ctx.save();
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
  ctx.shadowOffsetY = offsetY;
  draw();
  ctx.restore();
}

/** How the mark's two outer balls hang, in degrees from straight down: the fifth lifted to the right at rest, the first hanging. */
export type CradlePose = { left: number; right: number };
export const CRADLE_REST: CradlePose = { left: 0, right: -22 };

/**
 * The Connect Tutors mark (BrandMark.tsx): four balls at rest, the fifth lifted.
 * `x, y` is the top-left of its 48×32 box, scaled to `width`. `pose` swings the
 * two outer balls, for the mark in motion; it rests as the logo does.
 */
export function drawCradle(ctx: CanvasRenderingContext2D, x: number, y: number, width: number, ink: string, lifted: string, stringWidth = 1.3, alpha = 1, pose: CradlePose = CRADLE_REST) {
  const s = width / 48;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(x, y - 8 * s);
  ctx.scale(s, s);
  ctx.lineCap = "butt";
  ctx.strokeStyle = ink;
  ctx.fillStyle = ink;
  ctx.lineWidth = stringWidth;
  for (const cx of [5.6, 12.8, 20, 27.2]) {
    ctx.save();
    if (cx === 5.6 && pose.left !== 0) {
      ctx.translate(cx, 11);
      ctx.rotate((pose.left * Math.PI) / 180);
      ctx.translate(-cx, -11);
    }
    ctx.beginPath();
    ctx.moveTo(cx, 11);
    ctx.lineTo(cx, 35);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx, 35, 3.6, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  ctx.save();
  ctx.translate(34.4, 11);
  ctx.rotate((pose.right * Math.PI) / 180);
  ctx.translate(-34.4, -11);
  ctx.strokeStyle = lifted;
  ctx.fillStyle = lifted;
  ctx.beginPath();
  ctx.moveTo(34.4, 11);
  ctx.lineTo(34.4, 35);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(34.4, 35, 3.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = ink;
  ctx.lineCap = "round";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(3, 11);
  ctx.lineTo(37, 11);
  ctx.stroke();
  ctx.restore();
}

/** "Connect Tutors", the second word in its own colour; returns its width. */
export function drawWordmark(ctx: CanvasRenderingContext2D, x: number, y: number, size: number, ink: string, second: string, face: PosterFace = "sans"): number {
  const first = drawText(ctx, "Connect ", x, y, { size, weight: 700, color: ink, tracking: -0.02, face });
  const rest = drawText(ctx, "Tutors", x + first, y, { size, weight: face === "serif" ? 600 : 500, color: second, tracking: -0.02, face });
  return first + rest;
}

export type SealColors = { ring: string; center: string; detail: string; innerAlpha?: number };

/** The round "Bangladesh Tuition Provider Association · BTPA · MEMBER 077" seal, centred on cx, cy. */
export function drawSeal(ctx: CanvasRenderingContext2D, cx: number, cy: number, diameter: number, colors: SealColors) {
  const s = diameter / 132;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(s, s);
  ctx.strokeStyle = colors.ring;
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, 64, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = colors.innerAlpha ?? 0.6;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.arc(0, 0, 40, 0, Math.PI * 2);
  ctx.stroke();
  ctx.globalAlpha = 1;

  // The ring text runs clockwise from the left, over the top, like the SVG textPath.
  const ring = "BANGLADESH TUITION PROVIDER ASSOCIATION ·";
  const radius = 51;
  const spacing = 1.85;
  ctx.font = `600 9px ${POSTER_FONT_STACK}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.fillStyle = colors.ring;
  ctx.textAlign = "left";
  ctx.textBaseline = "alphabetic";
  let angle = Math.PI;
  for (const char of ring) {
    const width = ctx.measureText(char).width;
    ctx.save();
    ctx.rotate(angle + Math.PI / 2);
    ctx.translate(0, -radius);
    ctx.fillText(char, 0, 0);
    ctx.restore();
    angle += (width + spacing) / radius;
  }

  ctx.textAlign = "center";
  ctx.font = `800 24px ${POSTER_FONT_STACK}`;
  ctx.fillStyle = colors.center;
  ctx.fillText("BTPA", 0, 0);
  ctx.font = `700 12px ${POSTER_FONT_STACK}`;
  if ("letterSpacing" in ctx) ctx.letterSpacing = "1.5px";
  ctx.fillStyle = colors.detail;
  ctx.fillText("MEMBER 077", 0, 20);
  if ("letterSpacing" in ctx) ctx.letterSpacing = "0px";
  ctx.restore();
}

/**
 * A white rounded tile holding the QR code. `size` is the whole tile; the code
 * keeps a one-module margin inside the tile's padding, so with the padding the
 * quiet zone is about four modules, as scanners want.
 */
export function drawQrTile(ctx: CanvasRenderingContext2D, url: string, x: number, y: number, size: number, dark: string, padding = 14, radius = 18) {
  fillRoundedRect(ctx, x, y, size, size, radius, "#FFFFFF");
  const qr = QRCode.create(url, { errorCorrectionLevel: "M" });
  const count = qr.modules.size;
  const area = size - padding * 2;
  const unit = area / (count + 2);
  const origin = { x: x + padding + unit, y: y + padding + unit };
  ctx.fillStyle = dark;
  for (let row = 0; row < count; row += 1) {
    for (let col = 0; col < count; col += 1) {
      if (!qr.modules.get(row, col)) continue;
      const left = Math.floor(origin.x + col * unit);
      const top = Math.floor(origin.y + row * unit);
      const right = Math.floor(origin.x + (col + 1) * unit);
      const bottom = Math.floor(origin.y + (row + 1) * unit);
      ctx.fillRect(left, top, right - left, bottom - top);
    }
  }
}

/** Lucide line icons (ISC licence), as SVG path data on a 24-unit grid. */
const ICONS = {
  pin: ["M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z", "M15 10a3 3 0 1 1-6 0a3 3 0 1 1 6 0"],
  calendar: ["M5 4h14a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z", "M16 2v4M8 2v4M3 10h18"],
  clock: ["M22 12a10 10 0 1 1-20 0a10 10 0 1 1 20 0", "M12 6v6l4 2"],
  user: ["M16 8a4 4 0 1 1-8 0a4 4 0 1 1 8 0", "M4 21a8 8 0 0 1 16 0"],
} as const;

export type PosterIcon = keyof typeof ICONS;

/** One line icon in a `size` square whose top-left is x, y. */
export function drawIcon(ctx: CanvasRenderingContext2D, icon: PosterIcon, x: number, y: number, size: number, color: string) {
  if (typeof Path2D !== "function") return;
  ctx.save();
  ctx.translate(x, y);
  ctx.scale(size / 24, size / 24);
  ctx.strokeStyle = color;
  ctx.lineWidth = 1.8;
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  for (const d of ICONS[icon]) ctx.stroke(new Path2D(d));
  ctx.restore();
}

let grainTile: HTMLCanvasElement | null | undefined;

/** A 256px tile of fixed grey noise, made once; null where a canvas cannot be made (tests). */
function noiseTile(): HTMLCanvasElement | null {
  if (grainTile !== undefined) return grainTile;
  grainTile = null;
  if (typeof document === "undefined") return null;
  const tile = document.createElement("canvas");
  tile.width = 256;
  tile.height = 256;
  const tileCtx = tile.getContext("2d");
  if (!tileCtx) return null;
  const image = tileCtx.createImageData(256, 256);
  let seed = 20261017;
  for (let index = 0; index < image.data.length; index += 4) {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    const value = seed >>> 24;
    image.data[index] = value;
    image.data[index + 1] = value;
    image.data[index + 2] = value;
    image.data[index + 3] = 255;
  }
  tileCtx.putImageData(image, 0, 0);
  grainTile = tile;
  return tile;
}

/** The fine paper grain over the whole poster. */
export function drawGrain(ctx: CanvasRenderingContext2D, width: number, height: number, alpha: number, blend: GlobalCompositeOperation) {
  const tile = noiseTile();
  if (!tile || typeof ctx.createPattern !== "function") return;
  const pattern = ctx.createPattern(tile, "repeat");
  if (!pattern) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.globalCompositeOperation = blend;
  ctx.fillStyle = pattern;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}

/** Waits for every face a poster draws, so the first render is not in a fallback font. */
export async function loadPosterFonts(timeoutMs = 4000, options: { serif?: boolean } = {}): Promise<void> {
  if (typeof document === "undefined" || !document.fonts?.load) return;
  const faces = [500, 600, 700, 800].flatMap(weight => [
    document.fonts.load(`${weight} 40px "DM Sans"`, "Connect Tutors 0123456789"),
    document.fonts.load(`${weight} 40px "Poster Bengali"`, "শিক্ষক প্রয়োজন ৳০১২৩৪৫৬৭৮৯"),
  ]);
  // The serif is only the Mist poster's, so the others never wait for its two files.
  if (options.serif) {
    for (const weight of [600, 700, 800]) faces.push(document.fonts.load(`${weight} 40px "Poster Serif"`, "Connect Tutors 0123456789 শিক্ষক প্রয়োজন ৳০১২৩৪৫৬৭৮৯"));
  }
  await Promise.race([
    Promise.allSettled(faces),
    new Promise(resolve => setTimeout(resolve, timeoutMs)),
  ]);
}
