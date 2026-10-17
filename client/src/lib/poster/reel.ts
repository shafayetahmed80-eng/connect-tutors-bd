import { POSTER_WORDS, tuitionCount, type PosterLocale } from "@shared/poster-copy";
import {
  drawCradle,
  drawGrain,
  drawIcon,
  drawQrTile,
  drawText,
  drawWordmark,
  fillRoundedRect,
  measure,
  radialGlow,
  roundedRectPath,
  wrapLines,
} from "./canvas-kit";
import { derivePalette, hexToHsl, hslToHex, withAlpha } from "./palette";
import type { PosterTuition } from "./types";

/**
 * The scrolling video of the Facebook Posts page: the tuitions in the Area
 * Grouped order - a heading for each place, a glowing box for each tuition -
 * rising from the bottom of the frame to the top, between a title card and a
 * card with the Job Board's QR code and the WhatsApp number.
 *
 * The whole list is laid out once and painted once into a few tall strips;
 * each frame of the video is then only those strips, moved, over a fixed
 * background. That keeps the soft glow - a blur, which is slow to draw - out of
 * the per-frame work, so a modest laptop keeps up at thirty frames a second.
 */

export type ReelSize = "reels" | "feed" | "square";
export type ReelSpeed = "slow" | "normal" | "fast";

export const REEL_WIDTH = 1080;
export const REEL_SIZES: Record<ReelSize, { width: number; height: number }> = {
  reels: { width: REEL_WIDTH, height: 1920 },
  feed: { width: REEL_WIDTH, height: 1350 },
  square: { width: REEL_WIDTH, height: 1080 },
};

/** How many seconds a line takes to rise the frame's full height. */
export const REEL_CROSS_SECONDS: Record<ReelSpeed, number> = { slow: 6, normal: 4.5, fast: 3 };
/** The title is read before anything moves; the last card is read before the video ends. */
export const REEL_HOLD_START = 2;
export const REEL_HOLD_END = 3;
/** The list comes up to speed, and slows to a stop, over this long rather than starting with a jolt. */
export const REEL_RAMP = 0.9;
export const REEL_FPS = 30;
/** The video's own ground: the near-black of a code editor, like the sample the Owner sent. */
export const REEL_DEFAULT_GROUND = "#14161c";
/** The sample's own glow, red into violet, for the default ground and any colour too grey to give a hue. */
export const REEL_DEFAULT_GLOW: [string, string] = ["#ff4d5e", "#8b5cf6"];

export type ReelInput = {
  locale: PosterLocale;
  tuitions: PosterTuition[];
  /** "Dhaka" when every tuition is in it, for the title card. */
  city: string | null;
  /** "১৭ অক্টোবর ২০২৬". */
  date: string;
  /** The QR link: the live Job Board. */
  url: string;
  /** "connecttutorsbd.com/job-board". */
  boardAddress: string;
  /** "+8801516131411", or null when the site has none. */
  whatsapp: string | null;
};

/** The words the video adds to the poster's own. */
export const REEL_WORDS = {
  bn: { total: "মোট", other: "অন্যান্য এলাকা", whatsapp: "WhatsApp", jobId: "JOB ID" },
  en: { total: "Total", other: "Other areas", whatsapp: "WhatsApp", jobId: "JOB ID" },
} as const;

// ---- Colours ---------------------------------------------------------------

export type ReelLook = {
  ground: string;
  dark: boolean;
  ink: string;
  soft: string;
  detail: string;
  hair: string;
  cradle: string;
  lifted: string;
  qrDark: string;
  grain: { alpha: number; blend: GlobalCompositeOperation };
  glowA: string;
  glowB: string;
  card: { fill: string; border: string; ink: string; soft: string; detail: string; accent: string; hair: string };
};

/**
 * The two colours of the glow, from the ground: a hue either side of it, so a
 * navy ground glows teal into violet and a green one green into blue. A grey
 * ground has no hue to lean on, so it - and the video's own ground - takes the
 * sample's red into violet.
 */
export function reelGlow(ground: string, isDefault = false): [string, string] {
  const { h, s } = hexToHsl(ground);
  if (isDefault || s < 12) return REEL_DEFAULT_GLOW;
  return [hslToHex({ h: (h + 325) % 360, s: 90, l: 60 }), hslToHex({ h: (h + 45) % 360, s: 85, l: 66 })];
}

/** Every colour the video needs, from the ground the Admin picked (or the video's own). */
export function reelLook(ground?: string | null): ReelLook {
  const chosen = ground ?? REEL_DEFAULT_GROUND;
  const palette = derivePalette(chosen, "card");
  const [glowA, glowB] = reelGlow(palette.ground, !ground);
  return {
    ground: palette.ground,
    dark: palette.dark,
    ink: palette.ink,
    soft: palette.soft,
    detail: palette.detail,
    hair: palette.hair,
    cradle: palette.cradle,
    lifted: palette.dark ? glowA : palette.accent,
    qrDark: palette.qrDark,
    grain: palette.grain,
    glowA,
    glowB,
    card: {
      fill: palette.deep.fill,
      border: "rgba(255,255,255,0.18)",
      ink: palette.deep.ink,
      soft: palette.deep.soft,
      detail: palette.deep.detail,
      accent: palette.deep.accent,
      hair: palette.deep.hair,
    },
  };
}

/** The tutor pill on a card: the Job Board's colours for male, female and either, made light enough for a dark box. */
const KIND = {
  male: { fill: "rgba(22,163,74,0.24)", ink: "#86efac" },
  female: { fill: "rgba(219,39,119,0.24)", ink: "#f9a8d4" },
  any: { fill: "rgba(124,58,237,0.26)", ink: "#c4b5fd" },
} as const;

// ---- Layout ----------------------------------------------------------------

const SIDE = 64;
const CARD = {
  pad: 36,
  radius: 28,
  idRow: 46,
  pillHeight: 44,
  headSize: 38,
  headLine: 50,
  subjectSize: 29,
  subjectLine: 40,
  footRow: 50,
  salarySize: 40,
  gapAfterId: 20,
  gapAfterHead: 8,
  gapBeforeRule: 24,
  gapAfterRule: 24,
};
const AREA = { height: 96, iconSize: 34, nameSize: 42, countSize: 26 };
const GAP = { afterArea: 26, betweenCards: 34, betweenAreas: 72, edge: 48 };
/** How far a card's glow reaches past its edge: what a strip must keep room for. */
const GLOW_REACH = 70;

export type ReelArea = { key: string; label: string; count: string; items: PosterTuition[] };

/** The tuitions under their places, in the order each place first appears - the Area Grouped text post's order. */
export function groupByArea(tuitions: PosterTuition[], locale: PosterLocale): ReelArea[] {
  const groups = new Map<string, ReelArea>();
  for (const tuition of tuitions) {
    const key = tuition.area ?? "";
    const group = groups.get(key) ?? { key, label: tuition.area ?? REEL_WORDS[locale].other, count: "", items: [] };
    group.items.push(tuition);
    groups.set(key, group);
  }
  return Array.from(groups.values()).map(group => ({ ...group, count: tuitionCount(group.items.length, locale) }));
}

/** "মোট ১২টি টিউশন" / "Total 12 tuitions" - the title card's headline. */
export function reelTitle(count: number, locale: PosterLocale): string {
  return `${REEL_WORDS[locale].total} ${tuitionCount(count, locale)}`;
}

type CardBlock = { kind: "card"; top: number; height: number; tuition: PosterTuition; headline: string[]; subjects: string[]; foot: string };
type AreaBlock = { kind: "area"; top: number; height: number; area: ReelArea };
type TitleBlock = { kind: "title"; top: number; height: number };
type EndBlock = { kind: "end"; top: number; height: number };
export type ReelBlock = TitleBlock | AreaBlock | CardBlock | EndBlock;

export type ReelLayout = {
  width: number;
  frameHeight: number;
  /** Top to bottom: the title card, then each place and its tuitions, then the closing card. */
  blocks: ReelBlock[];
  /** The whole strip, title card to closing card. */
  height: number;
};

/** What a card's foot says on the left: how often and when. */
function footLine(tuition: PosterTuition): string {
  return [tuition.weekPhrase, tuition.time].filter(Boolean).join(" · ");
}

/**
 * Where everything goes. The title card and the closing card are each a frame
 * tall, so the video opens on the title alone and ends on the closing card
 * alone; between them each block is as tall as its wrapped text needs.
 */
export function layoutReel(ctx: CanvasRenderingContext2D, input: ReelInput, size: ReelSize): ReelLayout {
  const { width, height: frameHeight } = REEL_SIZES[size];
  const inner = width - SIDE * 2 - CARD.pad * 2;
  const blocks: ReelBlock[] = [{ kind: "title", top: 0, height: frameHeight }];
  let y = frameHeight + GAP.edge;
  const areas = groupByArea(input.tuitions, input.locale);
  areas.forEach((area, index) => {
    if (index > 0) y += GAP.betweenAreas;
    blocks.push({ kind: "area", top: y, height: AREA.height, area });
    y += AREA.height + GAP.afterArea;
    area.items.forEach((tuition, itemIndex) => {
      if (itemIndex > 0) y += GAP.betweenCards;
      const headline = wrapLines(ctx, [tuition.classes, tuition.curricula].filter(Boolean).join(" · "), CARD.headSize, 800, inner, 2);
      const subjects = tuition.subjects ? wrapLines(ctx, tuition.subjects, CARD.subjectSize, 600, inner, 2) : [];
      const foot = footLine(tuition);
      const height = CARD.pad + CARD.idRow + CARD.gapAfterId
        + headline.length * CARD.headLine + CARD.gapAfterHead
        + subjects.length * CARD.subjectLine
        + CARD.gapBeforeRule + 1 + CARD.gapAfterRule + CARD.footRow + CARD.pad;
      blocks.push({ kind: "card", top: y, height, tuition, headline, subjects, foot });
      y += height;
    });
  });
  y += GAP.edge;
  blocks.push({ kind: "end", top: y, height: frameHeight });
  return { width, frameHeight, blocks, height: y + frameHeight };
}

// ---- Timing ----------------------------------------------------------------

export type ReelTimeline = {
  /** How far the strip travels, in pixels: from the title card filling the frame to the closing card filling it. */
  distance: number;
  holdStart: number;
  /** Seconds in motion, the two ramps included. */
  move: number;
  holdEnd: number;
  total: number;
  ramp: number;
  /** The steady speed, pixels a second. */
  speed: number;
};

export function reelTimeline(layout: ReelLayout, speed: ReelSpeed): ReelTimeline {
  const distance = Math.max(0, layout.height - layout.frameHeight);
  const pxPerSecond = layout.frameHeight / REEL_CROSS_SECONDS[speed];
  // A steady run, plus the ramps: each ramp covers half the ground a steady run would in that time.
  const move = distance > 0 ? distance / pxPerSecond + REEL_RAMP : 0;
  const ramp = Math.min(REEL_RAMP, move / 2);
  return { distance, holdStart: REEL_HOLD_START, move, holdEnd: REEL_HOLD_END, total: REEL_HOLD_START + move + REEL_HOLD_END, ramp, speed: pxPerSecond };
}

/**
 * How far the strip has risen at `t` seconds: still through the opening hold,
 * then up to speed, steady, down to a stop, and still again to the end.
 */
export function reelOffsetAt(t: number, timeline: ReelTimeline): number {
  const { distance, move, ramp } = timeline;
  const s = t - timeline.holdStart;
  if (s <= 0 || distance <= 0) return 0;
  if (s >= move) return distance;
  if (ramp <= 0) return (distance * s) / move;
  const top = distance / (move - ramp);
  if (s < ramp) return (0.5 * top * s * s) / ramp;
  if (s > move - ramp) {
    const left = move - s;
    return distance - (0.5 * top * left * left) / ramp;
  }
  return 0.5 * top * ramp + top * (s - ramp);
}

// ---- Painting --------------------------------------------------------------

/** The fixed backdrop: the ground, a glow in two corners, fine wavy lines like the sample's, and grain. */
export function paintReelBackground(ctx: CanvasRenderingContext2D, width: number, height: number, look: ReelLook) {
  ctx.fillStyle = look.ground;
  ctx.fillRect(0, 0, width, height);
  radialGlow(ctx, width * 0.12, height * 0.18, width * 0.9, look.glowA, look.dark ? 0.12 : 0.1);
  radialGlow(ctx, width * 0.92, height * 0.86, width * 0.9, look.glowB, look.dark ? 0.12 : 0.1);
  ctx.save();
  ctx.strokeStyle = look.ink;
  ctx.globalAlpha = look.dark ? 0.05 : 0.07;
  ctx.lineWidth = 1.6;
  const spacing = 110;
  for (let row = -1; row <= Math.ceil(height / spacing) + 1; row += 1) {
    ctx.beginPath();
    for (let x = -20; x <= width + 20; x += 20) {
      const y = row * spacing + 26 * Math.sin(x / 170 + row * 0.9) + 14 * Math.sin(x / 61 + row * 1.7);
      if (x === -20) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();
  drawGrain(ctx, width, height, look.grain.alpha, look.grain.blend);
}

/** Whether this canvas can blur what it draws: a string here in Chrome, Edge and Firefox; missing in an older Safari. */
function canBlur(ctx: CanvasRenderingContext2D): boolean {
  return typeof (ctx as { filter?: unknown }).filter === "string";
}

/** The glowing box: a soft halo in the two glow colours, the dark body, a hairline edge and a glowing rim. */
function glowBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, look: ReelLook) {
  const r = CARD.radius;
  const sweep = ctx.createLinearGradient(x, 0, x + w, 0);
  sweep.addColorStop(0, look.glowA);
  sweep.addColorStop(1, look.glowB);
  ctx.save();
  if (canBlur(ctx)) {
    ctx.filter = "blur(26px)";
    ctx.globalAlpha = look.dark ? 0.6 : 0.5;
    roundedRectPath(ctx, x - 4, y - 4, w + 8, h + 8, r + 4);
    ctx.fillStyle = sweep;
    ctx.fill();
    ctx.filter = "none";
  } else {
    // Without canvas blur (an older Safari) the halo is a coloured shadow instead.
    ctx.shadowColor = withAlpha(look.glowB, 0.7);
    ctx.shadowBlur = 44;
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = look.card.fill;
    ctx.fill();
  }
  ctx.restore();
  fillRoundedRect(ctx, x, y, w, h, r, look.card.fill);
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = look.card.border;
  ctx.stroke();
  ctx.globalAlpha = 0.85;
  roundedRectPath(ctx, x + 0.5, y + 0.5, w - 1, h - 1, r);
  ctx.lineWidth = 2;
  ctx.strokeStyle = sweep;
  ctx.stroke();
  ctx.restore();
}

function paintArea(ctx: CanvasRenderingContext2D, block: AreaBlock, look: ReelLook, width: number) {
  const cy = block.top + block.height / 2 - 6;
  drawIcon(ctx, "pin", SIDE, cy - AREA.iconSize / 2, AREA.iconSize, look.detail);
  const countWidth = measure(ctx, block.area.count, AREA.countSize, 700);
  drawText(ctx, block.area.count, width - SIDE, cy, { size: AREA.countSize, weight: 700, color: look.soft, align: "right" });
  drawText(ctx, block.area.label, SIDE + AREA.iconSize + 16, cy, {
    size: AREA.nameSize,
    weight: 800,
    color: look.ink,
    maxWidth: width - SIDE * 2 - AREA.iconSize - 16 - countWidth - 24,
    minSize: 30,
    tracking: -0.01,
  });
  const rule = ctx.createLinearGradient(SIDE, 0, width - SIDE, 0);
  rule.addColorStop(0, look.glowA);
  rule.addColorStop(1, withAlpha(look.glowB, 0));
  ctx.save();
  ctx.globalAlpha = 0.8;
  ctx.fillStyle = rule;
  ctx.fillRect(SIDE, block.top + block.height - 6, width - SIDE * 2, 3);
  ctx.restore();
}

function paintCard(ctx: CanvasRenderingContext2D, block: CardBlock, look: ReelLook, input: ReelInput, width: number) {
  const x = SIDE;
  const w = width - SIDE * 2;
  glowBox(ctx, x, block.top, w, block.height, look);
  const left = x + CARD.pad;
  const right = x + w - CARD.pad;
  const words = REEL_WORDS[input.locale];
  const tuition = block.tuition;
  let y = block.top + CARD.pad;

  // The Job ID, and the tutor wanted in a pill at the right.
  const idY = y + CARD.idRow / 2;
  drawText(ctx, `# ${words.jobId} ${tuition.jobId}`, left, idY, { size: 26, weight: 700, color: look.card.detail, tracking: 0.04 });
  const kind = KIND[tuition.tutorKind];
  const pillText = tuition.tutorPill;
  const pillWidth = measure(ctx, pillText, 22, 700, input.locale === "en" ? 0.06 : 0) + 36;
  fillRoundedRect(ctx, right - pillWidth, idY - CARD.pillHeight / 2, pillWidth, CARD.pillHeight, CARD.pillHeight / 2, kind.fill);
  drawText(ctx, pillText, right - pillWidth / 2, idY, { size: 22, weight: 700, color: kind.ink, align: "center", tracking: input.locale === "en" ? 0.06 : 0 });
  y += CARD.idRow + CARD.gapAfterId;

  // What is to be taught: the class and curriculum, then the subjects.
  for (const line of block.headline) {
    drawText(ctx, line, left, y + CARD.headLine / 2, { size: CARD.headSize, weight: 800, color: look.card.ink, tracking: -0.01 });
    y += CARD.headLine;
  }
  y += CARD.gapAfterHead;
  for (const line of block.subjects) {
    drawText(ctx, line, left, y + CARD.subjectLine / 2, { size: CARD.subjectSize, weight: 600, color: look.card.soft });
    y += CARD.subjectLine;
  }

  y += CARD.gapBeforeRule;
  ctx.fillStyle = look.card.hair;
  ctx.fillRect(left, y, right - left, 1);
  y += 1 + CARD.gapAfterRule;

  // How often and when on the left, the salary on the right.
  const footY = y + CARD.footRow / 2;
  let salaryLeft = right;
  if (tuition.salary) {
    const per = POSTER_WORDS[input.locale].perMonthShort;
    const perWidth = drawText(ctx, per, right, footY + 4, { size: 22, weight: 600, color: look.card.soft, align: "right" });
    const amountWidth = drawText(ctx, tuition.salary, right - perWidth - 10, footY, { size: CARD.salarySize, weight: 800, color: look.card.accent, align: "right", tracking: -0.01 });
    salaryLeft = right - perWidth - 10 - amountWidth;
  }
  if (block.foot) {
    drawIcon(ctx, "calendar", left, footY - 13, 26, look.card.detail);
    drawText(ctx, block.foot, left + 38, footY, { size: 27, weight: 600, color: look.card.detail, maxWidth: Math.max(80, salaryLeft - left - 38 - 24), minSize: 22 });
  }
}

/** The opening card: the mark, "Tutors needed", the count, the city and the date. */
function paintTitle(ctx: CanvasRenderingContext2D, block: TitleBlock, look: ReelLook, input: ReelInput, width: number) {
  const center = width / 2;
  const middle = block.top + block.height / 2;
  const markWidth = 104;
  const wordSize = 52;
  const wordWidth = measure(ctx, "Connect ", wordSize, 700, -0.02) + measure(ctx, "Tutors", wordSize, 500, -0.02);
  const brandWidth = markWidth + 20 + wordWidth;
  const brandLeft = center - brandWidth / 2;
  const brandY = middle - 230;
  drawCradle(ctx, brandLeft, brandY - (markWidth * 32) / 48 / 2, markWidth, look.cradle, look.lifted);
  drawWordmark(ctx, brandLeft + markWidth + 20, brandY, wordSize, look.ink, look.soft);

  const words = POSTER_WORDS[input.locale];
  const kicker = input.locale === "en" ? words.tutorsNeeded.toUpperCase() : words.tutorsNeeded;
  const tracking = input.locale === "en" ? 0.16 : 0.02;
  const kickerWidth = measure(ctx, kicker, 28, 700, tracking) + 64;
  const kickerY = middle - 90;
  ctx.save();
  roundedRectPath(ctx, center - kickerWidth / 2, kickerY - 30, kickerWidth, 60, 30);
  const edge = ctx.createLinearGradient(center - kickerWidth / 2, 0, center + kickerWidth / 2, 0);
  edge.addColorStop(0, look.glowA);
  edge.addColorStop(1, look.glowB);
  ctx.lineWidth = 2;
  ctx.strokeStyle = edge;
  ctx.stroke();
  ctx.restore();
  drawText(ctx, kicker, center, kickerY, { size: 28, weight: 700, color: look.ink, align: "center", tracking });

  drawText(ctx, reelTitle(input.tuitions.length, input.locale), center, middle + 40, { size: 92, weight: 800, color: look.ink, align: "center", maxWidth: width - SIDE * 2, minSize: 60, tracking: -0.02 });
  const sub = [input.city, input.date].filter(Boolean).join(" · ");
  drawText(ctx, sub, center, middle + 140, { size: 34, weight: 600, color: look.soft, align: "center", maxWidth: width - SIDE * 2 });
}

/** The QR tile's side on each frame size: the closing card has to fit a square frame too. */
const QR_SIDE: Record<number, number> = { 1920: 360, 1350: 320, 1080: 250 };

/** The closing card: "Apply now", the Job Board's QR code and address, the WhatsApp number and the mark. */
function paintEnd(ctx: CanvasRenderingContext2D, block: EndBlock, look: ReelLook, input: ReelInput, width: number) {
  const center = width / 2;
  const words = POSTER_WORDS[input.locale];
  const qr = QR_SIDE[block.height] ?? 300;
  const short = block.height <= 1080;
  const rows = {
    title: 80,
    qr: qr + (short ? 34 : 48),
    scan: short ? 44 : 52,
    address: short ? 48 : 56,
    whatsapp: input.whatsapp ? (short ? 48 : 56) : 0,
    brand: short ? 70 : 96,
  };
  const total = rows.title + rows.qr + rows.scan + rows.address + rows.whatsapp + rows.brand;
  let y = block.top + (block.height - total) / 2;

  drawText(ctx, words.applyNow, center, y + rows.title / 2, { size: short ? 58 : 66, weight: 800, color: look.ink, align: "center", maxWidth: width - SIDE * 2, tracking: -0.01 });
  y += rows.title + (short ? 18 : 28);
  ctx.save();
  if (canBlur(ctx)) {
    ctx.filter = "blur(30px)";
    ctx.globalAlpha = 0.55;
    const halo = ctx.createLinearGradient(center - qr / 2, 0, center + qr / 2, 0);
    halo.addColorStop(0, look.glowA);
    halo.addColorStop(1, look.glowB);
    roundedRectPath(ctx, center - qr / 2, y, qr, qr, 22);
    ctx.fillStyle = halo;
    ctx.fill();
    ctx.filter = "none";
  }
  ctx.restore();
  drawQrTile(ctx, input.url, center - qr / 2, y, qr, look.qrDark, 16, 22);
  y += rows.qr - (short ? 18 : 28);
  drawText(ctx, words.scanForAll, center, y + rows.scan / 2, { size: short ? 26 : 30, weight: 600, color: look.soft, align: "center", maxWidth: width - SIDE * 2 });
  y += rows.scan;
  drawText(ctx, input.boardAddress, center, y + rows.address / 2, { size: short ? 30 : 34, weight: 700, color: look.detail, align: "center", maxWidth: width - SIDE * 2 });
  y += rows.address;
  if (input.whatsapp) {
    drawText(ctx, `${REEL_WORDS[input.locale].whatsapp}  ${input.whatsapp}`, center, y + rows.whatsapp / 2, { size: short ? 30 : 34, weight: 700, color: look.ink, align: "center" });
    y += rows.whatsapp;
  }
  const markWidth = short ? 56 : 68;
  const wordSize = short ? 30 : 36;
  const wordWidth = measure(ctx, "Connect ", wordSize, 700, -0.02) + measure(ctx, "Tutors", wordSize, 500, -0.02);
  const brandLeft = center - (markWidth + 14 + wordWidth) / 2;
  const brandY = y + rows.brand / 2 + 6;
  drawCradle(ctx, brandLeft, brandY - (markWidth * 32) / 48 / 2, markWidth, look.cradle, look.lifted);
  drawWordmark(ctx, brandLeft + markWidth + 14, brandY, wordSize, look.ink, look.soft);
}

/** Paints one block where the layout put it. The context may be shifted, to paint into a strip. */
export function paintReelBlock(ctx: CanvasRenderingContext2D, block: ReelBlock, look: ReelLook, input: ReelInput, width: number) {
  if (block.kind === "title") paintTitle(ctx, block, look, input, width);
  else if (block.kind === "area") paintArea(ctx, block, look, width);
  else if (block.kind === "card") paintCard(ctx, block, look, input, width);
  else paintEnd(ctx, block, look, input, width);
}

/** The tallest strip a reel is painted in: well inside every browser's canvas limit, Safari's included. */
export const REEL_STRIP_HEIGHT = 4096;

/**
 * Where the strips go: one run of `REEL_STRIP_HEIGHT` after another down the
 * part of the layout that holds anything, each with the blocks that reach into
 * it (a block on a seam is painted into both, clipped by each).
 */
export function reelStrips(layout: ReelLayout, stripHeight = REEL_STRIP_HEIGHT): Array<{ top: number; height: number; blocks: ReelBlock[] }> {
  const strips: Array<{ top: number; height: number; blocks: ReelBlock[] }> = [];
  for (let top = 0; top < layout.height; top += stripHeight) {
    const height = Math.min(stripHeight, layout.height - top);
    const blocks = layout.blocks.filter(block => block.top - GLOW_REACH < top + height && block.top + block.height + GLOW_REACH > top);
    strips.push({ top, height, blocks });
  }
  return strips;
}

