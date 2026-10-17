import { POSTER_WORDS, tuitionCount } from "@shared/poster-copy";
import {
  dashedLine,
  drawCradle,
  drawGrain,
  drawIcon,
  drawQrTile,
  drawSeal,
  drawText,
  drawWordmark,
  fillRoundedGradient,
  fillRoundedRect,
  gradientFill,
  measure,
  radialGlow,
  roundedRectPath,
  strokeRoundedRect,
  withShadow,
  type PosterFace,
  type SealColors,
} from "./canvas-kit";
import { derivePalette, hexToHsl, hslToHex, tune, withAlpha } from "./palette";
import { TALL_POSTER_WIDTH, type CombinedPosterInput, type PosterTuition, type SinglePosterInput } from "./types";

/**
 * The Mist posters: a pale gradient ground, white cards edged in the tutor
 * kind's colour, serif headlines and numbers, a blue price tag. One tuition in
 * a card, up to four in a square or landscape list, and up to twelve in a tall
 * list grouped by curriculum.
 *
 * Only the ground and what is drawn straight on it follow the colour an Admin
 * picks. The cards, the pills, the chips and the price tag are the design's, so
 * whatever the ground, what is written on them reads as it was drawn.
 */

/** The ground Mist ships with: the sample's pale sky blue. */
export const MIST_DEFAULT_GROUND = "#e2eef3";

const WHITE = "#FFFFFF";
const CARD_INK = "#12363F";
const CARD_SOFT = "#5B7480";
const EDGE = 10;

/** The tutor kind's colour: the pill and the card's left edge. */
const KIND_COLOUR = { male: "#123B5A", female: "#2B83A8", any: "#8E4FB5" } as const;

const CHIP = {
  id: { fill: "#EAF1F3", ink: CARD_INK },
  klass: { fill: "#DFEEE6", ink: "#1D4D3C" },
  subject: { fill: "#ECE9E2", ink: "#4A483F" },
  medium: { fill: "#FBEFD6", ink: "#1D6A89" },
} as const;

export type MistTokens = {
  dark: boolean;
  /** The gradient's three stops: top-left, middle (the colour picked), bottom-right. */
  ground: [string, string, string];
  glow: { color: string; alpha: number };
  ink: string;
  soft: string;
  /** The headline's accent word and the section dots. */
  accent: string;
  /** Dashed rules and outlines on the ground. */
  rule: string;
  barFill: string;
  /** The dark label (the date) and its text. */
  labelFill: string;
  labelInk: string;
  /** The footer pill. */
  frost: string;
  frostEdge: string;
  /** The brand tile, and the price tag's two ends. */
  tile: string;
  tagFrom: string;
  tagTo: string;
  qrDark: string;
  seal: SealColors;
  grain: { alpha: number; blend: GlobalCompositeOperation };
};

const clampPercent = (value: number) => Math.min(100, Math.max(0, value));

/** The tokens for a Mist poster on the Admin's ground colour, or Mist's own. */
export function mistTokens(ground?: string | null): MistTokens {
  const p = derivePalette(ground || MIST_DEFAULT_GROUND, "deep");
  const base = hexToHsl(p.ground);
  const accent = p.dark ? p.detail : tune({ h: base.h, s: Math.min(70, Math.max(45, base.s)), l: 38 }, p.ground, 4.5, -1);
  return {
    dark: p.dark,
    ground: [
      hslToHex({ h: base.h, s: base.s * 0.75, l: clampPercent(base.l + (p.dark ? 6 : 4)) }),
      p.ground,
      hslToHex({ h: base.h - 18, s: base.s * 0.8, l: clampPercent(base.l - (p.dark ? 4 : 6)) }),
    ],
    glow: p.dark ? { color: WHITE, alpha: 0.07 } : { color: "#FFF1DA", alpha: 0.6 },
    ink: p.ink,
    soft: p.soft,
    accent,
    rule: p.dark ? "rgba(255,255,255,0.7)" : withAlpha(p.ink, 0.75),
    barFill: p.dark ? "rgba(255,255,255,0.09)" : withAlpha(p.ink, 0.07),
    labelFill: p.dark ? "rgba(255,255,255,0.16)" : p.deep.fill,
    labelInk: WHITE,
    frost: p.dark ? "rgba(255,255,255,0.1)" : "rgba(255,255,255,0.62)",
    frostEdge: p.dark ? "rgba(255,255,255,0.4)" : withAlpha(accent, 0.55),
    tile: p.tile,
    tagFrom: p.tile,
    tagTo: hslToHex({ ...hexToHsl(p.tile), l: clampPercent(hexToHsl(p.tile).l + 9) }),
    qrDark: p.qrDark,
    seal: p.dark ? { ring: p.accent, center: WHITE, detail: p.accent, innerAlpha: 0.6 } : { ring: p.ink, center: p.ink, detail: accent, innerAlpha: 0.5 },
    grain: { alpha: p.dark ? 0.05 : 0.035, blend: p.dark ? "soft-light" : "multiply" },
  };
}

function mistBackground(ctx: CanvasRenderingContext2D, width: number, height: number, t: MistTokens) {
  ctx.fillStyle = gradientFill(ctx, 0, 0, width, height, 62, [[0, t.ground[0]], [0.55, t.ground[1]], [1, t.ground[2]]]);
  ctx.fillRect(0, 0, width, height);
  radialGlow(ctx, width * 0.96, Math.min(height * 0.05, 140), width * 0.72, t.glow.color, t.glow.alpha);
  drawGrain(ctx, width, height, t.grain.alpha, t.grain.blend);
}

/** The text's size, shrunk until it fits `maxWidth` (never below `min`). */
function fitSize(ctx: CanvasRenderingContext2D, text: string, size: number, weight: number, maxWidth: number, min: number, face: PosterFace = "sans", tracking = 0): number {
  let fitted = size;
  while (fitted > min && measure(ctx, text, fitted, weight, tracking, face) > maxWidth) fitted -= 2;
  return fitted;
}

/** The brand: the cradle on a deep tile, the wordmark in serif. Returns the right edge of the wordmark. */
function mistBrand(ctx: CanvasRenderingContext2D, t: MistTokens, x: number, cy: number, tile: number, wordSize: number): number {
  fillRoundedRect(ctx, x, cy - tile / 2, tile, tile, tile * 0.27, t.tile);
  const mark = tile * 0.72;
  drawCradle(ctx, x + (tile - mark) / 2, cy - (mark * 32) / 48 / 2, mark, WHITE, "#FFC24D", 1.6);
  const width = drawWordmark(ctx, x + tile + 16, cy, wordSize, t.ink, t.accent, "serif");
  return x + tile + 16 + width;
}

/** The outlined "Tutors needed" pill, right-aligned at `right`. */
function needPill(ctx: CanvasRenderingContext2D, t: MistTokens, locale: "bn" | "en", right: number, cy: number, height: number, size: number) {
  const words = POSTER_WORDS[locale];
  const text = locale === "en" ? words.tutorsNeeded.toUpperCase() : words.tutorsNeeded;
  const tracking = locale === "en" ? 0.14 : 0.02;
  const width = measure(ctx, text, size, 700, tracking) + height;
  strokeRoundedRect(ctx, right - width, cy - height / 2, width, height, height / 2, t.rule, 2);
  drawText(ctx, text, right - width + height / 2, cy, { size, weight: 700, color: t.ink, tracking });
}

/** The dark label pill: the date. */
function labelPill(ctx: CanvasRenderingContext2D, t: MistTokens, text: string, x: number, cy: number, height: number, size: number): number {
  const width = measure(ctx, text, size, 600) + height * 0.9;
  fillRoundedRect(ctx, x, cy - height / 2, width, height, 8, t.labelFill);
  drawText(ctx, text, x + height * 0.45, cy, { size, weight: 600, color: t.labelInk });
  return width;
}

/** "Choose your" in ink and "tuition" in the accent. */
function mistTitle(ctx: CanvasRenderingContext2D, t: MistTokens, locale: "bn" | "en", x: number, cy: number, size: number, maxWidth: number) {
  const title = POSTER_WORDS[locale].mistTitle;
  const fitted = fitSize(ctx, title, size, 800, maxWidth, Math.round(size * 0.7), "serif", -0.01);
  const split = title.lastIndexOf(" ") + 1;
  const head = drawText(ctx, title.slice(0, split), x, cy, { size: fitted, weight: 800, color: t.ink, face: "serif", tracking: -0.01 });
  drawText(ctx, title.slice(split), x + head, cy, { size: fitted, weight: 800, color: t.accent, face: "serif", tracking: -0.01 });
}

type ChipSpec = { text: string; fill: string; ink: string; weight?: number; face?: PosterFace };
type ChipLook = { size: number; height: number; padX: number; gap: number };

const chipWidth = (ctx: CanvasRenderingContext2D, spec: ChipSpec, look: ChipLook, cap = Infinity) =>
  Math.min(cap, measure(ctx, spec.text, look.size, spec.weight ?? 600, 0, spec.face) + look.padX * 2);

function drawChip(ctx: CanvasRenderingContext2D, spec: ChipSpec, x: number, cy: number, look: ChipLook, width: number) {
  fillRoundedRect(ctx, x, cy - look.height / 2, width, look.height, 7, spec.fill);
  drawText(ctx, spec.text, x + look.padX, cy, { size: look.size, weight: spec.weight ?? 600, color: spec.ink, face: spec.face, maxWidth: width - look.padX * 2, minSize: Math.round(look.size * 0.85) });
}

/**
 * Chips left to right: the lead ones, as many of the middle ones as fit, then
 * the tail ones - so the class and the curriculum always show and the subjects
 * give way. Returns where the last chip ends.
 */
function chipRow(ctx: CanvasRenderingContext2D, lead: ChipSpec[], middle: ChipSpec[], tail: ChipSpec[], x: number, cy: number, maxRight: number, look: ChipLook): number {
  const available = maxRight - x;
  const widths = new Map<ChipSpec, number>();
  const width = (spec: ChipSpec) => {
    if (!widths.has(spec)) widths.set(spec, chipWidth(ctx, spec, look));
    return widths.get(spec)!;
  };
  let used = [...lead, ...tail].reduce((sum, spec) => sum + width(spec), 0) + Math.max(0, lead.length + tail.length - 1) * look.gap;
  const chosen: ChipSpec[] = [];
  for (const spec of middle) {
    const next = used + look.gap + width(spec);
    if (next > available) break;
    chosen.push(spec);
    used = next;
  }
  // Not even the lead and tail fit: the last of them shortens to what is left.
  const row = [...lead, ...chosen, ...tail];
  let cursor = x;
  row.forEach((spec, index) => {
    const remaining = maxRight - cursor;
    const w = Math.min(width(spec), Math.max(remaining, look.padX * 3));
    drawChip(ctx, spec, cursor, cy, look, w);
    cursor += w + (index < row.length - 1 ? look.gap : 0);
  });
  return cursor;
}

/** The tutor kind's pill. Returns its width. */
function kindPill(ctx: CanvasRenderingContext2D, job: PosterTuition, x: number, cy: number, height: number, size: number, locale: "bn" | "en"): number {
  const tracking = locale === "en" ? 0.08 : 0;
  const width = measure(ctx, job.tutorPill, size, 800, tracking) + height * 0.95;
  fillRoundedRect(ctx, x, cy - height / 2, width, height, height / 2, KIND_COLOUR[job.tutorKind]);
  drawText(ctx, job.tutorPill, x + height * 0.475, cy, { size, weight: 800, color: WHITE, tracking });
  return width;
}

/** The blue price tag: the amount in serif and the small per-month words. Returns its width. */
function salaryTag(ctx: CanvasRenderingContext2D, t: MistTokens, salary: string, per: string, right: number, cy: number, look: { height: number; amountSize: number; perSize: number; padX: number }): number {
  const amount = measure(ctx, salary, look.amountSize, 800, -0.01, "serif");
  const perWidth = measure(ctx, per, look.perSize, 600);
  const width = look.padX * 2 + amount + 10 + perWidth;
  const x = right - width;
  fillRoundedGradient(ctx, x, cy - look.height / 2, width, look.height, 11, 0, [[0, t.tagFrom], [1, t.tagTo]]);
  drawText(ctx, salary, x + look.padX, cy, { size: look.amountSize, weight: 800, color: WHITE, face: "serif", tracking: -0.01 });
  drawText(ctx, per, x + look.padX + amount + 10, cy + look.amountSize * 0.12, { size: look.perSize, weight: 600, color: WHITE, alpha: 0.92 });
  return width;
}

type CardBox = { x: number; y: number; w: number; h: number };
type CardLook = {
  rows: 2 | 3;
  pad: number;
  idSize: number;
  idHeight: number;
  pillSize: number;
  pillHeight: number;
  placeSize: number;
  chip: ChipLook;
  tag: { height: number; amountSize: number; perSize: number; padX: number };
};

/** The white card with its coloured edge, its shadow and the clipped edge stripe. */
function cardSurface(ctx: CanvasRenderingContext2D, box: CardBox, colour: string, radius: number) {
  withShadow(ctx, "rgba(16,48,60,0.16)", 24, 8, () => fillRoundedRect(ctx, box.x, box.y, box.w, box.h, radius, WHITE));
  ctx.save();
  roundedRectPath(ctx, box.x, box.y, box.w, box.h, radius);
  ctx.clip?.();
  ctx.fillStyle = colour;
  ctx.fillRect(box.x, box.y, EDGE, box.h);
  ctx.restore();
}

/** One tuition's card in a list. */
function mistCard(ctx: CanvasRenderingContext2D, t: MistTokens, locale: "bn" | "en", job: PosterTuition, box: CardBox, look: CardLook) {
  const words = POSTER_WORDS[locale];
  cardSurface(ctx, box, KIND_COLOUR[job.tutorKind], 16);
  const left = box.x + EDGE + look.pad;
  const right = box.x + box.w - look.pad;
  let contentRight = right;
  if (job.salary) {
    const tagWidth = salaryTag(ctx, t, job.salary, words.perMonthShort, right, box.y + box.h / 2, look.tag);
    contentRight = right - tagWidth - 24;
  }

  const topCy = box.y + look.pad + look.idHeight / 2;
  const bottomCy = box.y + box.h - look.pad - look.chip.height / 2;

  // Row one: the Job ID chip, the tutor pill and - on a two-row card - the place.
  const id: ChipSpec = { text: `# ${job.jobId}`, fill: CHIP.id.fill, ink: CHIP.id.ink, weight: 700, face: "serif" };
  const idLook: ChipLook = { size: look.idSize, height: look.idHeight, padX: 14, gap: 0 };
  const idWidth = chipWidth(ctx, id, idLook);
  drawChip(ctx, id, left, topCy, idLook, idWidth);
  const pillWidth = kindPill(ctx, job, left + idWidth + 12, topCy, look.pillHeight, look.pillSize, locale);
  let after = left + idWidth + 12 + pillWidth + 18;

  const placeLine = (cy: number, from: number, to: number) => {
    if (!job.areaLine || to - from < 80) return;
    drawIcon(ctx, "pin", from, cy - look.placeSize * 0.4, look.placeSize * 0.8, CARD_SOFT);
    drawText(ctx, job.areaLine, from + look.placeSize * 0.8 + 10, cy, { size: look.placeSize, weight: 700, color: CARD_INK, maxWidth: to - from - look.placeSize * 0.8 - 10, minSize: Math.round(look.placeSize * 0.8) });
  };

  if (look.rows === 2) {
    placeLine(topCy, after, contentRight);
  } else {
    const middleCy = (topCy + bottomCy) / 2;
    placeLine(middleCy, left, contentRight);
    after = left;
  }

  // The last row: class, subjects, curriculum, then the days if there is room.
  const end = chipRow(
    ctx,
    [{ text: job.classes, fill: CHIP.klass.fill, ink: CHIP.klass.ink }],
    job.subjectChips.map(text => ({ text, fill: CHIP.subject.fill, ink: CHIP.subject.ink })),
    job.curricula ? [{ text: job.curricula, fill: CHIP.medium.fill, ink: CHIP.medium.ink }] : [],
    left,
    bottomCy,
    contentRight,
    look.chip,
  );
  if (job.weekPhrase) {
    const room = contentRight - end - 16;
    if (room > measure(ctx, job.weekPhrase, look.chip.size, 600) * 0.8) {
      drawText(ctx, job.weekPhrase, end + 16, bottomCy, { size: look.chip.size, weight: 600, color: CARD_SOFT, maxWidth: room, minSize: Math.round(look.chip.size * 0.8) });
    }
  }
}

/** The footer: a frosted pill holding the seal, the scan words and the QR. */
function mistFooter(ctx: CanvasRenderingContext2D, t: MistTokens, input: CombinedPosterInput, box: CardBox) {
  const words = POSTER_WORDS[input.locale];
  roundedRectPath(ctx, box.x, box.y, box.w, box.h, 28);
  ctx.fillStyle = t.frost;
  ctx.fill();
  ctx.save();
  ctx.setLineDash?.([10, 8]);
  strokeRoundedRect(ctx, box.x, box.y, box.w, box.h, 28, t.frostEdge, 2);
  ctx.restore();
  const seal = Math.min(box.h - 36, 108);
  drawSeal(ctx, box.x + 28 + seal / 2, box.y + box.h / 2, seal, t.seal);
  const tile = box.h - 28;
  const qrLeft = box.x + box.w - 14 - tile;
  drawQrTile(ctx, input.url, qrLeft, box.y + 14, tile, t.qrDark, 11, 16);
  const textLeft = box.x + 28 + seal + 24;
  const textWidth = qrLeft - 24 - textLeft;
  drawText(ctx, words.scanForAll, textLeft, box.y + box.h / 2 - 20, { size: 29, weight: 700, color: t.ink, maxWidth: textWidth, minSize: 22 });
  drawText(ctx, input.boardAddress, textLeft, box.y + box.h / 2 + 22, { size: 26, weight: 600, color: t.soft, maxWidth: textWidth, minSize: 20 });
}

// ---- Combined: square ----------------------------------------------------

const SQUARE_CARD: CardLook = {
  rows: 2,
  pad: 20,
  idSize: 24,
  idHeight: 40,
  pillSize: 18,
  pillHeight: 36,
  placeSize: 28,
  chip: { size: 21, height: 36, padX: 13, gap: 9 },
  tag: { height: 60, amountSize: 34, perSize: 20, padX: 18 },
};

function mistHeaderBlock(ctx: CanvasRenderingContext2D, t: MistTokens, input: CombinedPosterInput, left: number, right: number) {
  mistBrand(ctx, t, left, 84, 64, 38);
  needPill(ctx, t, input.locale, right, 84, 48, input.locale === "bn" ? 24 : 21);
  labelPill(ctx, t, input.date, left, 160, 44, 22);
  mistTitle(ctx, t, input.locale, left, 244, 72, right - left);
  drawText(ctx, input.sub, left, 300, { size: 28, weight: 500, color: t.soft, maxWidth: right - left });
}

export function drawMistCombinedSquare(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, ground?: string | null) {
  const t = mistTokens(ground);
  const W = 1080;
  mistBackground(ctx, W, W, t);
  const left = 60;
  const right = 1020;
  mistHeaderBlock(ctx, t, input, left, right);
  const cardH = 124;
  const gap = 10;
  const top = 338;
  input.tuitions.slice(0, 4).forEach((job, index) => {
    mistCard(ctx, t, input.locale, job, { x: left, y: top + index * (cardH + gap), w: right - left, h: cardH }, SQUARE_CARD);
  });
  mistFooter(ctx, t, input, { x: left, y: 884, w: right - left, h: 156 });
}

// ---- Combined: landscape -------------------------------------------------

const LANDSCAPE_CARD: CardLook = {
  rows: 3,
  pad: 18,
  idSize: 22,
  idHeight: 36,
  pillSize: 17,
  pillHeight: 32,
  placeSize: 25,
  chip: { size: 19, height: 32, padX: 12, gap: 8 },
  tag: { height: 54, amountSize: 30, perSize: 18, padX: 16 },
};

export function drawMistCombinedLandscape(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, ground?: string | null) {
  const t = mistTokens(ground);
  const W = 1200;
  const H = 675;
  mistBackground(ctx, W, H, t);
  const left = 48;
  const column = 340;
  mistBrand(ctx, t, left, 76, 56, 32);
  labelPill(ctx, t, input.date, left, 152, 40, 20);
  const [head, tail] = balancedLines(ctx, POSTER_WORDS[input.locale].mistTitle, 50, 800, "serif");
  [[head, t.ink], [tail, t.accent]].forEach(([text, color], index) => {
    drawText(ctx, text, left, 224 + index * 56, { size: 50, weight: 800, color, face: "serif", tracking: -0.01, maxWidth: column, minSize: 36 });
  });
  drawText(ctx, input.subShort, left, 340, { size: 24, weight: 500, color: t.soft, maxWidth: column });
  needPill(ctx, t, input.locale, left + column, 390, 40, input.locale === "bn" ? 22 : 19);

  mistFooterCompact(ctx, t, input, { x: left, y: 428, w: column, h: 214 });

  const cardX = left + column + 40;
  const cardW = W - 48 - cardX;
  const cardH = 140;
  const gap = 9;
  input.tuitions.slice(0, 4).forEach((job, index) => {
    mistCard(ctx, t, input.locale, job, { x: cardX, y: 44 + index * (cardH + gap), w: cardW, h: cardH }, LANDSCAPE_CARD);
  });
}

/** The landscape footer: the QR and seal side by side, the scan words under them, in the left column. */
function mistFooterCompact(ctx: CanvasRenderingContext2D, t: MistTokens, input: CombinedPosterInput, box: CardBox) {
  const words = POSTER_WORDS[input.locale];
  roundedRectPath(ctx, box.x, box.y, box.w, box.h, 24);
  ctx.fillStyle = t.frost;
  ctx.fill();
  ctx.save();
  ctx.setLineDash?.([10, 8]);
  strokeRoundedRect(ctx, box.x, box.y, box.w, box.h, 24, t.frostEdge, 2);
  ctx.restore();
  const tile = 118;
  drawQrTile(ctx, input.url, box.x + 18, box.y + 18, tile, t.qrDark, 9, 14);
  drawSeal(ctx, box.x + 18 + tile + 22 + 38, box.y + 18 + tile / 2, 76, t.seal);
  drawText(ctx, words.scanForAll, box.x + 18, box.y + 18 + tile + 26, { size: 22, weight: 700, color: t.ink, maxWidth: box.w - 36, minSize: 17 });
  drawText(ctx, input.host, box.x + 18, box.y + 18 + tile + 56, { size: 22, weight: 600, color: t.soft, maxWidth: box.w - 36, minSize: 17 });
}

/** A title broken into two lines of the most even width; the second takes the accent. */
function balancedLines(ctx: CanvasRenderingContext2D, title: string, size: number, weight: number, face: PosterFace): [string, string] {
  const words = title.split(" ");
  if (words.length < 2) return [title, ""];
  let best: [string, string] = [title, ""];
  let gap = Infinity;
  for (let split = 1; split < words.length; split += 1) {
    const head = words.slice(0, split).join(" ");
    const tail = words.slice(split).join(" ");
    const difference = Math.abs(measure(ctx, head, size, weight, -0.01, face) - measure(ctx, tail, size, weight, -0.01, face));
    if (difference < gap) {
      gap = difference;
      best = [head, tail];
    }
  }
  return best;
}

// ---- Combined: tall list -------------------------------------------------

const TALL = { top: 338, barHeight: 56, countHeight: 44, cardHeight: 112, gap: 12, groupGap: 18, footerHeight: 152, bottom: 48 };

const TALL_CARD: CardLook = {
  rows: 2,
  pad: 18,
  idSize: 22,
  idHeight: 36,
  pillSize: 17,
  pillHeight: 32,
  placeSize: 25,
  chip: { size: 19, height: 32, padX: 12, gap: 8 },
  tag: { height: 54, amountSize: 30, perSize: 18, padX: 16 },
};

/** The tuitions in groups by curriculum, in the order each curriculum first appears. */
export function groupTuitions(tuitions: PosterTuition[]): Array<{ key: string; label: string; items: PosterTuition[] }> {
  const groups = new Map<string, { key: string; label: string; items: PosterTuition[] }>();
  for (const job of tuitions) {
    const group = groups.get(job.group.key) ?? { key: job.group.key, label: job.group.label, items: [] };
    group.items.push(job);
    groups.set(job.group.key, group);
  }
  return Array.from(groups.values());
}

/** How tall the tall poster is: its header, each group's bar and cards, and the footer. */
export function mistTallHeight(input: CombinedPosterInput): number {
  const groups = groupTuitions(input.tuitions);
  let y = TALL.top;
  for (const group of groups) y += TALL.barHeight + TALL.countHeight + group.items.length * (TALL.cardHeight + TALL.gap) + TALL.groupGap;
  return Math.round(y + 6 + TALL.footerHeight + TALL.bottom);
}

/** A section bar: the curriculum on a faint band with a dot, dashed rule under it. */
function sectionBar(ctx: CanvasRenderingContext2D, t: MistTokens, label: string, locale: "bn" | "en", box: CardBox) {
  ctx.fillStyle = t.barFill;
  ctx.fillRect(box.x, box.y, box.w, box.h);
  ctx.fillStyle = t.accent;
  ctx.beginPath();
  ctx.arc(box.x + 22, box.y + box.h / 2, 6, 0, Math.PI * 2);
  ctx.fill();
  const text = locale === "en" ? label.toUpperCase() : label;
  drawText(ctx, text, box.x + 44, box.y + box.h / 2, { size: 25, weight: 800, color: t.ink, tracking: locale === "en" ? 0.12 : 0.01, maxWidth: box.w - 70 });
  dashedLine(ctx, box.x, box.y + box.h, box.x + box.w, box.y + box.h, t.rule, 2, 9, 7);
}

export function drawMistTall(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, ground?: string | null) {
  const t = mistTokens(ground);
  const W = TALL_POSTER_WIDTH;
  const H = mistTallHeight(input);
  mistBackground(ctx, W, H, t);
  const left = 60;
  const right = 1020;
  mistHeaderBlock(ctx, t, input, left, right);
  let y = TALL.top;
  for (const group of groupTuitions(input.tuitions)) {
    sectionBar(ctx, t, group.label, input.locale, { x: left, y, w: right - left, h: TALL.barHeight });
    y += TALL.barHeight;
    const count = tuitionCount(group.items.length, input.locale);
    ctx.fillStyle = t.accent;
    ctx.beginPath();
    ctx.arc(left + 22, y + TALL.countHeight / 2 + 2, 5, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, count, left + 40, y + TALL.countHeight / 2 + 2, { size: 22, weight: 700, color: t.soft, tracking: input.locale === "en" ? 0.04 : 0 });
    y += TALL.countHeight;
    for (const job of group.items) {
      mistCard(ctx, t, input.locale, job, { x: left, y, w: right - left, h: TALL.cardHeight }, TALL_CARD);
      y += TALL.cardHeight + TALL.gap;
    }
    y += TALL.groupGap;
  }
  mistFooter(ctx, t, input, { x: left, y: y + 6, w: right - left, h: TALL.footerHeight });
}

// ---- Single --------------------------------------------------------------

/** A fact in the single poster's row: a line icon, the label and the value in serif. */
function factCell(ctx: CanvasRenderingContext2D, t: MistTokens, icon: "calendar" | "clock", label: string, value: string, x: number, cy: number, size: { icon: number; label: number; value: number }, maxWidth: number) {
  drawIcon(ctx, icon, x, cy - size.icon / 2, size.icon, t.accent);
  const textX = x + size.icon + 16;
  drawText(ctx, label, textX, cy - size.value * 0.55, { size: size.label, weight: 600, color: CARD_SOFT, maxWidth: maxWidth - size.icon - 16 });
  drawText(ctx, value, textX, cy + size.value * 0.5, { size: size.value, weight: 700, color: CARD_INK, face: "serif", maxWidth: maxWidth - size.icon - 16 });
}

type SingleLook = {
  box: CardBox;
  pad: number;
  idSize: number;
  idHeight: number;
  pillSize: number;
  pillHeight: number;
  headlineSize: number;
  chip: ChipLook;
  placeSize: number;
  rows: { id: number; headline: number; chips: number; place: number; rule: number; facts: number };
  fact: { icon: number; label: number; value: number };
};

function mistSingleCard(ctx: CanvasRenderingContext2D, t: MistTokens, input: SinglePosterInput, look: SingleLook) {
  const job = input.tuition;
  const words = POSTER_WORDS[input.locale];
  const { box } = look;
  cardSurface(ctx, box, KIND_COLOUR[job.tutorKind], 22);
  const left = box.x + EDGE + look.pad;
  const right = box.x + box.w - look.pad;
  const width = right - left;
  const at = (offset: number) => box.y + offset;

  const id: ChipSpec = { text: `# JOB ID : ${job.jobId}`, fill: CHIP.id.fill, ink: CHIP.id.ink, weight: 700, face: "serif" };
  const idLook: ChipLook = { size: look.idSize, height: look.idHeight, padX: 16, gap: 0 };
  const idWidth = chipWidth(ctx, id, idLook);
  drawChip(ctx, id, left, at(look.rows.id), idLook, idWidth);
  kindPill(ctx, job, left + idWidth + 14, at(look.rows.id), look.pillHeight, look.pillSize, input.locale);

  drawText(ctx, job.classes, left, at(look.rows.headline), { size: look.headlineSize, weight: 800, color: CARD_INK, face: "serif", maxWidth: width, minSize: Math.round(look.headlineSize * 0.6), tracking: -0.01 });

  chipRow(
    ctx,
    job.curricula ? [{ text: job.curricula, fill: CHIP.medium.fill, ink: CHIP.medium.ink }] : [],
    job.subjectChips.map(text => ({ text, fill: CHIP.subject.fill, ink: CHIP.subject.ink })),
    [],
    left,
    at(look.rows.chips),
    right,
    look.chip,
  );

  if (job.area) {
    drawIcon(ctx, "pin", left, at(look.rows.place) - look.placeSize * 0.5, look.placeSize, t.accent);
    drawText(ctx, job.area, left + look.placeSize + 14, at(look.rows.place), { size: look.placeSize, weight: 600, color: CARD_INK, maxWidth: width - look.placeSize - 14, minSize: Math.round(look.placeSize * 0.75) });
  }

  const facts: Array<{ icon: "calendar" | "clock"; label: string; value: string }> = [];
  if (job.week) facts.push({ icon: "calendar", label: words.weekLabel, value: job.week });
  if (job.time) facts.push({ icon: "clock", label: words.timeLabel, value: job.time });
  if (facts.length) {
    dashedLine(ctx, left, at(look.rows.rule), right, at(look.rows.rule), "rgba(18,54,63,0.28)", 2, 9, 7);
    const column = width / 2;
    facts.forEach((fact, index) => factCell(ctx, t, fact.icon, fact.label, fact.value, left + index * column, at(look.rows.facts), look.fact, column - 24));
  }
}

/** The big price tag of a single poster: the label above, the amount in serif. */
function bigTag(ctx: CanvasRenderingContext2D, t: MistTokens, input: SinglePosterInput, box: CardBox, sizes: { label: number; amount: number }) {
  const words = POSTER_WORDS[input.locale];
  fillRoundedGradient(ctx, box.x, box.y, box.w, box.h, 22, 0, [[0, t.tagFrom], [1, t.tagTo]]);
  drawText(ctx, words.salaryLabel, box.x + 34, box.y + box.h * 0.24, { size: sizes.label, weight: 600, color: WHITE, alpha: 0.92 });
  drawText(ctx, input.tuition.salary ?? "", box.x + 34, box.y + box.h * 0.68, { size: sizes.amount, weight: 800, color: WHITE, face: "serif", tracking: -0.01, maxWidth: box.w - 68, minSize: Math.round(sizes.amount * 0.6) });
}

export function drawMistSingleSquare(ctx: CanvasRenderingContext2D, input: SinglePosterInput, ground?: string | null) {
  const t = mistTokens(ground);
  const W = 1080;
  const words = POSTER_WORDS[input.locale];
  mistBackground(ctx, W, W, t);
  const left = 60;
  const right = 1020;
  mistBrand(ctx, t, left, 90, 68, 40);
  needPill(ctx, t, input.locale, right, 90, 50, input.locale === "bn" ? 25 : 22);

  mistSingleCard(ctx, t, input, {
    box: { x: left, y: 160, w: right - left, h: 560 },
    pad: 42,
    idSize: 28,
    idHeight: 54,
    pillSize: 22,
    pillHeight: 46,
    headlineSize: 108,
    chip: { size: 27, height: 48, padX: 18, gap: 12 },
    placeSize: 38,
    rows: { id: 62, headline: 190, chips: 292, place: 372, rule: 428, facts: 488 },
    fact: { icon: 38, label: 22, value: 34 },
  });

  if (input.tuition.salary) bigTag(ctx, t, input, { x: left, y: 750, w: 520, h: 164 }, { label: 26, amount: 84 });
  const tile = 196;
  const qrX = right - tile;
  drawQrTile(ctx, input.url, qrX, 750, tile, t.qrDark, 14, 20);
  drawText(ctx, words.scanToApply, qrX + tile / 2, 750 + tile + 28, { size: 24, weight: 600, color: t.ink, align: "center", maxWidth: 300 });
  drawSeal(ctx, left + 46, 984, 92, t.seal);
  drawText(ctx, input.host, left + 112, 984, { size: 30, weight: 600, color: t.ink });
}

export function drawMistSingleLandscape(ctx: CanvasRenderingContext2D, input: SinglePosterInput, ground?: string | null) {
  const t = mistTokens(ground);
  const W = 1200;
  const H = 675;
  const words = POSTER_WORDS[input.locale];
  mistBackground(ctx, W, H, t);
  const left = 48;
  const right = 1152;
  mistBrand(ctx, t, left, 68, 56, 32);
  needPill(ctx, t, input.locale, right, 68, 42, input.locale === "bn" ? 22 : 19);

  mistSingleCard(ctx, t, input, {
    box: { x: left, y: 120, w: 722, h: 507 },
    pad: 34,
    idSize: 24,
    idHeight: 46,
    pillSize: 19,
    pillHeight: 40,
    headlineSize: 86,
    chip: { size: 23, height: 42, padX: 15, gap: 10 },
    placeSize: 32,
    rows: { id: 58, headline: 156, chips: 244, place: 310, rule: 364, facts: 424 },
    fact: { icon: 32, label: 20, value: 30 },
  });

  const columnLeft = 814;
  const columnWidth = right - columnLeft;
  if (input.tuition.salary) bigTag(ctx, t, input, { x: columnLeft, y: 120, w: columnWidth, h: 130 }, { label: 22, amount: 62 });
  const tile = 190;
  const qrX = columnLeft + (columnWidth - tile) / 2;
  drawQrTile(ctx, input.url, qrX, 276, tile, t.qrDark, 14, 20);
  drawText(ctx, words.scanToApply, columnLeft + columnWidth / 2, 276 + tile + 28, { size: 22, weight: 600, color: t.ink, align: "center", maxWidth: columnWidth });
  drawText(ctx, input.host, columnLeft + columnWidth / 2, 276 + tile + 60, { size: 22, weight: 600, color: t.soft, align: "center", maxWidth: columnWidth });
  drawSeal(ctx, columnLeft + columnWidth / 2, 585, 80, t.seal);
}
