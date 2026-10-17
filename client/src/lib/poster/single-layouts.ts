import { POSTER_WORDS } from "@shared/poster-copy";
import {
  drawCradle,
  drawGrain,
  drawIcon,
  drawQrTile,
  drawSeal,
  drawText,
  drawWordmark,
  fillRoundedRect,
  hairline,
  measure,
  strokeRoundedRect,
  type PosterIcon,
  type SealColors,
} from "./canvas-kit";
import { derivePalette, type OnDeep } from "./palette";
import type { ClassicSingleTheme, SinglePosterInput } from "./types";

/**
 * The one-tuition posters: Navy and Cream, square and landscape. The
 * measurements follow the approved mockups (Tuition Poster Mockup canvas).
 *
 * Every colour comes from a `SingleTokens`: the shipped hand-tuned set for the
 * design as it has always looked, or - when an Admin picks a ground colour -
 * the set derived from that colour (see `palette.ts`). The layout never names a
 * colour, so both draw the same poster.
 */

type SingleTokens = {
  ground: string;
  ink: string;
  soft: string;
  icon: string;
  accent: string;
  hair: string;
  wordmarkSecond: string;
  kicker: string;
  /** The map-pin before the place. */
  pin: string;
  /** The cradle mark drawn straight on the ground (Cream draws it on a tile). */
  cradle: string;
  /** Cream's blue brand tile. */
  tile: string;
  pill: { fill?: string; border?: string; ink: string };
  seal: SealColors;
  qrDark: string;
  /** The landscape panel (Navy) and the bottom band (Cream): a dark surface with light text. */
  deep: OnDeep;
  watermark: { color: string; alpha: number };
  grain: { alpha: number; blend: GlobalCompositeOperation };
};

const SHIPPED: Record<ClassicSingleTheme, SingleTokens> = {
  navy: {
    ground: "#0E2442",
    ink: "#FFFFFF",
    soft: "#C3D1E2",
    icon: "#8CC4FF",
    accent: "#FFC24D",
    hair: "rgba(255,255,255,0.16)",
    wordmarkSecond: "#8CC4FF",
    kicker: "#FFC24D",
    pin: "#FFC24D",
    cradle: "#FFFFFF",
    tile: "#0B5FA8",
    pill: { border: "rgba(255,255,255,0.24)", ink: "#C3D1E2" },
    seal: { ring: "#FFC24D", center: "#FFFFFF", detail: "#FFC24D", innerAlpha: 0.6 },
    qrDark: "#0E2442",
    deep: { fill: "#091A31", stroke: "rgba(255,255,255,0.08)", ink: "#FFFFFF", soft: "#C3D1E2", detail: "#8CC4FF", accent: "#FFC24D", hair: "rgba(255,255,255,0.14)" },
    watermark: { color: "#FFFFFF", alpha: 0.035 },
    grain: { alpha: 0.07, blend: "soft-light" },
  },
  cream: {
    ground: "#FFFEFA",
    ink: "#102849",
    soft: "#4E6683",
    icon: "#0B5FA8",
    accent: "#FFC24D",
    hair: "rgba(16,40,73,0.14)",
    wordmarkSecond: "#1677E8",
    kicker: "#0B5FA8",
    pin: "#0B5FA8",
    cradle: "#102849",
    tile: "#0B5FA8",
    pill: { fill: "#EAF5FF", ink: "#34506F" },
    seal: { ring: "#102849", center: "#102849", detail: "#0B5FA8", innerAlpha: 0.5 },
    qrDark: "#102849",
    deep: { fill: "#102849", stroke: "rgba(255,255,255,0.08)", ink: "#FFFFFF", soft: "#C3D1E2", detail: "#8CC4FF", accent: "#FFC24D", hair: "rgba(255,255,255,0.14)" },
    watermark: { color: "#0B5FA8", alpha: 0.045 },
    grain: { alpha: 0.05, blend: "multiply" },
  },
};

/** The tokens for a design drawn on the Admin's own ground colour. */
function derivedTokens(theme: ClassicSingleTheme, ground: string): SingleTokens {
  const p = derivePalette(ground, theme === "navy" ? "panel" : "deep");
  const navy = theme === "navy";
  return {
    ground: p.ground,
    ink: p.ink,
    soft: p.soft,
    icon: p.detail,
    accent: p.accent,
    hair: p.hair,
    wordmarkSecond: p.detail,
    kicker: navy ? p.accent : p.detail,
    pin: navy ? p.accent : p.detail,
    cradle: p.cradle,
    tile: p.tile,
    pill: p.dark ? { border: "rgba(255,255,255,0.24)", ink: p.soft } : { fill: p.tint, ink: p.soft },
    seal: p.dark ? { ring: p.accent, center: p.ink, detail: p.accent, innerAlpha: 0.6 } : { ring: p.ink, center: p.ink, detail: p.detail, innerAlpha: 0.5 },
    qrDark: p.qrDark,
    deep: p.deep,
    watermark: p.watermark,
    grain: p.grain,
  };
}

/** The design's own colours, or - given a ground colour - the ones derived from it. */
export function singleTokens(theme: ClassicSingleTheme, ground?: string | null): SingleTokens {
  return ground ? derivedTokens(theme, ground) : SHIPPED[theme];
}

const kickerTracking = (locale: SinglePosterInput["locale"]) => (locale === "bn" ? 0.02 : 0.14);

function background(ctx: CanvasRenderingContext2D, width: number, height: number, t: SingleTokens) {
  ctx.fillStyle = t.ground;
  ctx.fillRect(0, 0, width, height);
  drawGrain(ctx, width, height, t.grain.alpha, t.grain.blend);
}

/** The brand: the cradle (in a blue tile on Cream) and the wordmark. */
function brand(ctx: CanvasRenderingContext2D, theme: ClassicSingleTheme, t: SingleTokens, x: number, cy: number, markWidth: number, tile: number, wordSize: number) {
  if (theme === "cream") {
    fillRoundedRect(ctx, x, cy - tile / 2, tile, tile, tile * 0.26, t.tile);
    const w = tile * 0.74;
    // The tile is always deep, so its cradle is white with a gold lifted ball.
    drawCradle(ctx, x + (tile - w) / 2, cy - (w * 32) / 48 / 2, w, "#FFFFFF", t.deep.accent, 1.6);
    drawWordmark(ctx, x + tile + 18, cy, wordSize, t.ink, t.wordmarkSecond);
    return;
  }
  drawCradle(ctx, x, cy - (markWidth * 32) / 48 / 2, markWidth, t.cradle, t.accent);
  drawWordmark(ctx, x + markWidth + 18, cy, wordSize, t.ink, t.wordmarkSecond);
}

/** The Job ID pill, right-aligned at `right`. */
function jobPill(ctx: CanvasRenderingContext2D, t: SingleTokens, jobId: string, right: number, cy: number, size: number, padX: number, height: number) {
  const label = `# JOB ID : ${jobId}`;
  const width = measure(ctx, label, size, 600, 0.06) + padX * 2;
  const x = right - width;
  if (t.pill.fill) fillRoundedRect(ctx, x, cy - height / 2, width, height, height / 2, t.pill.fill);
  if (t.pill.border) strokeRoundedRect(ctx, x, cy - height / 2, width, height, height / 2, t.pill.border, 1.5);
  drawText(ctx, label, x + padX, cy, { size, weight: 600, color: t.pill.ink, tracking: 0.06 });
}

/** The kicker: a short accent rule, then "শিক্ষক প্রয়োজন". */
function kicker(ctx: CanvasRenderingContext2D, input: SinglePosterInput, t: SingleTokens, x: number, cy: number, size: number, barWidth: number, barHeight: number) {
  ctx.fillStyle = t.accent;
  ctx.fillRect(x, cy - barHeight / 2, barWidth, barHeight);
  drawText(ctx, POSTER_WORDS[input.locale].kicker, x + barWidth + 16, cy, {
    size,
    weight: input.locale === "bn" ? 600 : 700,
    color: t.kicker,
    tracking: kickerTracking(input.locale),
  });
}

/** "ক্লাস ৮" big, the curriculum on the same baseline beside it. */
function headline(ctx: CanvasRenderingContext2D, input: SinglePosterInput, t: SingleTokens, x: number, cy: number, size: number, sideSize: number, maxWidth: number) {
  const classWidth = drawText(ctx, input.tuition.classes, x, cy, { size, weight: 800, color: t.ink, maxWidth: maxWidth * 0.72, tracking: -0.01 });
  const sideX = x + classWidth + 24;
  // Share the baseline: a middle-aligned smaller line sits lower by the difference in half-heights.
  const sideCy = cy + (size - sideSize) * 0.32;
  drawText(ctx, input.tuition.curricula, sideX, sideCy, { size: sideSize, weight: 500, color: t.soft, maxWidth: x + maxWidth - sideX });
}

type Fact = { icon: PosterIcon; label: string; value: string };

function facts(input: SinglePosterInput): Fact[] {
  const words = POSTER_WORDS[input.locale];
  const list: Fact[] = [];
  if (input.tuition.week) list.push({ icon: "calendar", label: words.weekLabel, value: input.tuition.week });
  if (input.tuition.time) list.push({ icon: "clock", label: words.timeLabel, value: input.tuition.time });
  list.push({ icon: "user", label: words.tutorLabel, value: input.tuition.tutor });
  return list;
}

/** The three facts in equal columns divided by hairlines, under a rule at `ruleY`. */
function factRow(ctx: CanvasRenderingContext2D, input: SinglePosterInput, t: SingleTokens, x: number, width: number, ruleY: number, top: number, iconSize: number, labelSize: number, valueSize: number, padLeft: number) {
  hairline(ctx, x, ruleY, x + width, ruleY, t.hair);
  const list = facts(input);
  const column = width / 3;
  const labelLine = labelSize * 1.3;
  const valueLine = valueSize * 1.3;
  const cellHeight = labelLine + valueLine;
  list.forEach((fact, index) => {
    const x0 = x + index * column;
    const inner = index === 0 ? x0 : x0 + padLeft;
    if (index > 0) hairline(ctx, x0, top, x0, top + cellHeight, t.hair);
    drawIcon(ctx, fact.icon, inner, top + cellHeight / 2 - iconSize / 2, iconSize, t.icon);
    const textX = inner + iconSize + 16;
    const textWidth = x0 + column - textX - 8;
    drawText(ctx, fact.label, textX, top + labelLine / 2, { size: labelSize, weight: 500, color: t.soft, maxWidth: textWidth });
    drawText(ctx, fact.value, textX, top + labelLine + valueLine / 2, { size: valueSize, weight: 700, color: t.ink, maxWidth: textWidth });
  });
}

function placeLine(ctx: CanvasRenderingContext2D, input: SinglePosterInput, t: SingleTokens, x: number, cy: number, iconSize: number, size: number, maxWidth: number) {
  if (!input.tuition.area) return;
  drawIcon(ctx, "pin", x, cy - iconSize / 2, iconSize, t.pin);
  drawText(ctx, input.tuition.area, x + iconSize + 14, cy, { size, weight: 500, color: t.ink, maxWidth: maxWidth - iconSize - 14 });
}

/** QR tile with its caption centred under it; `centerX` is the column's centre, `bottom` the caption's foot. */
function qrWithCaption(ctx: CanvasRenderingContext2D, input: SinglePosterInput, centerX: number, tileTop: number, tile: number, padding: number, radius: number, dark: string, captionColor: string, captionGap: number) {
  drawQrTile(ctx, input.url, centerX - tile / 2, tileTop, tile, dark, padding, radius);
  drawText(ctx, POSTER_WORDS[input.locale].scanToApply, centerX, tileTop + tile + captionGap + 15.5, { size: 24, weight: 600, color: captionColor, align: "center" });
}

export function drawSingleSquare(ctx: CanvasRenderingContext2D, input: SinglePosterInput, themeId: ClassicSingleTheme, ground?: string | null) {
  const t = singleTokens(themeId, ground);
  const W = 1080;
  const left = 80;
  const right = 1000;
  const contentWidth = right - left;
  background(ctx, W, W, t);
  const cream = themeId === "cream";

  if (!cream) {
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, 6);
  }
  drawCradle(ctx, cream ? 580 : 550, cream ? 230 : 250, cream ? 560 : 600, t.watermark.color, t.watermark.color, 0.6, t.watermark.alpha);

  const headerCy = cream ? 124 : 128;
  brand(ctx, themeId, t, left, headerCy, 78, 76, 38);
  drawSeal(ctx, right - (cream ? 60 : 64), headerCy, cream ? 120 : 128, t.seal);

  const kickerCy = cream ? 247 : 259;
  kicker(ctx, input, t, left, kickerCy, 30, 44, cream ? 4 : 3);
  jobPill(ctx, t, input.tuition.jobId, right, kickerCy, 24, 22, 46);

  const headlineCy = cream ? 352 : 368;
  headline(ctx, input, t, left, headlineCy, 104, 34, contentWidth);
  const subjectsCy = cream ? 444 : 462;
  drawText(ctx, input.tuition.subjects, left, subjectsCy, { size: 46, weight: 600, color: t.ink, maxWidth: contentWidth, minSize: 34 });
  placeLine(ctx, input, t, left, cream ? 520 : 542, 40, 38, contentWidth);
  factRow(ctx, input, t, left, contentWidth, cream ? 578 : 604, cream ? 604 : 632, 36, 24, 32, 28);

  const words = POSTER_WORDS[input.locale];
  if (cream) {
    const bandTop = 788;
    ctx.fillStyle = t.deep.fill;
    ctx.fillRect(0, bandTop, W, W - bandTop);
    ctx.fillStyle = t.deep.accent;
    ctx.fillRect(0, bandTop, W, 6);
    const tile = 192;
    const qrTop = bandTop + (292 - (tile + 10 + 31)) / 2;
    const qrCenter = right - tile / 2;
    qrWithCaption(ctx, input, qrCenter, qrTop, tile, 14, 18, t.qrDark, t.deep.ink, 10);
    const salaryMax = qrCenter - tile / 2 - 32 - left;
    if (input.tuition.salary) {
      const top = bandTop + (292 - 197) / 2;
      drawText(ctx, words.salaryLabel, left, top + 17, { size: 26, weight: 500, color: t.deep.soft });
      drawText(ctx, input.tuition.salary, left, top + 34 + 58, { size: 108, weight: 800, color: t.deep.accent, maxWidth: salaryMax, tracking: -0.01 });
      drawText(ctx, input.host, left, top + 34 + 117 + 10 + 18, { size: 28, weight: 600, color: t.deep.ink });
    } else {
      drawText(ctx, input.host, left, bandTop + 146, { size: 34, weight: 700, color: t.deep.ink });
    }
    return;
  }

  const tile = 208;
  const captionWidth = Math.max(tile, measure(ctx, words.scanToApply, 24, 600));
  const qrCenter = right - captionWidth / 2;
  qrWithCaption(ctx, input, qrCenter, 769, tile, 16, 20, t.qrDark, t.ink, 12);
  const salaryMax = right - captionWidth - 32 - left;
  if (input.tuition.salary) {
    drawText(ctx, words.salaryLabel, left, 830, { size: 26, weight: 500, color: t.soft });
    drawText(ctx, input.tuition.salary, left, 909, { size: 116, weight: 800, color: t.accent, maxWidth: salaryMax, tracking: -0.01 });
  }
  drawText(ctx, input.host, left, 1002, { size: 28, weight: 600, color: t.ink });
}

export function drawSingleLandscape(ctx: CanvasRenderingContext2D, input: SinglePosterInput, themeId: ClassicSingleTheme, ground?: string | null) {
  const t = singleTokens(themeId, ground);
  const W = 1200;
  const H = 675;
  const cream = themeId === "cream";
  background(ctx, W, H, t);
  const words = POSTER_WORDS[input.locale];

  // Left column: navy sits in padding beside a rounded panel; cream gives the right 400px to a band.
  const left = 64;
  const columnRight = cream ? 800 - 56 : 64 + 644;
  const contentWidth = columnRight - left;
  if (!cream) {
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, 6);
  }

  const headerCy = 104;
  brand(ctx, themeId, t, left, headerCy, 60, 60, 30);
  drawSeal(ctx, columnRight - 48, headerCy, 96, t.seal);

  const kickerCy = cream ? 196 : 198;
  kicker(ctx, input, t, left, kickerCy, 26, 40, cream ? 4 : 3);
  jobPill(ctx, t, input.tuition.jobId, columnRight, kickerCy, 24, 20, 40);

  headline(ctx, input, t, left, cream ? 278 : 280, 84, 28, contentWidth);
  drawText(ctx, input.tuition.subjects, left, cream ? 349 : 351, { size: 34, weight: 600, color: t.ink, maxWidth: contentWidth, minSize: 26 });
  placeLine(ctx, input, t, left, cream ? 406 : 408, 32, 32, contentWidth);
  factRow(ctx, input, t, left, contentWidth, cream ? 536 : 532, cream ? 556 : 552, 30, 24, 28, 24);

  // The salary-and-QR column.
  const panelX = cream ? 800 : 756;
  const panelW = cream ? 400 : 380;
  if (cream) {
    ctx.fillStyle = t.deep.fill;
    ctx.fillRect(panelX, 0, panelW, H);
    ctx.fillStyle = t.deep.accent;
    ctx.fillRect(panelX, 0, panelW, 6);
  } else {
    fillRoundedRect(ctx, panelX, 56, panelW, 563, 28, t.deep.fill);
    strokeRoundedRect(ctx, panelX, 56, panelW, 563, 28, t.deep.stroke, 1);
  }
  const cx = panelX + panelW / 2;
  const hasSalary = Boolean(input.tuition.salary);
  const blockHeight = (hasSalary ? 31 + 92 + 49 : 0) + 196 + 12 + 31 + 4 + 31;
  let y = (H - blockHeight) / 2;
  if (hasSalary) {
    drawText(ctx, words.salaryLabel, cx, y + 15.5, { size: 24, weight: 500, color: t.deep.soft, align: "center" });
    drawText(ctx, input.tuition.salary!, cx, y + 31 + 46, { size: 80, weight: 800, color: t.deep.accent, align: "center", maxWidth: panelW - 56, tracking: -0.01 });
    y += 31 + 92 + 24;
    hairline(ctx, panelX + 32, y, panelX + panelW - 32, y, t.deep.hair);
    y += 25;
  }
  drawQrTile(ctx, input.url, cx - 98, y, 196, t.qrDark, 14, 18);
  y += 196 + 12;
  drawText(ctx, words.scanToApply, cx, y + 15.5, { size: 24, weight: 600, color: t.deep.ink, align: "center" });
  y += 31 + 4;
  drawText(ctx, input.host, cx, y + 15.5, { size: 24, weight: 600, color: t.deep.detail, align: "center" });
}
