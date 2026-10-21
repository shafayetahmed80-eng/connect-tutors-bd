import { localDigits, POSTER_WORDS, tuitionCount } from "@shared/poster-copy";
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
  wrapLines,
  type PosterIcon,
  type SealColors,
} from "./canvas-kit";
import { derivePalette, withAlpha, type OnDeep } from "./palette";
import { groupTuitions, mistTallHeight } from "./mist-layouts";
import { TALL_POSTER_WIDTH, type ClassicCombinedTheme, type CombinedPosterInput, type PosterTuition } from "./types";

/**
 * The up-to-four-tuitions posters. Navy is a list, Emerald a grid of gold-edged
 * cards (the high-salary look), Crimson a red band with numbered rows (the
 * urgent look). Each comes square and landscape, following the mockups.
 *
 * Every colour comes from a `Tokens`: the design's shipped, hand-tuned set, or -
 * when an Admin picks a ground colour - the set derived from it (palette.ts).
 * `deep` holds the colours for the surface set against the ground: Emerald's
 * cards, Crimson's band. The layouts never name a colour.
 */

type Tokens = {
  ground: string;
  ink: string;
  soft: string;
  detail: string;
  accent: string;
  hair: string;
  /** The date pill's outline on the ground. */
  pillBorder: string;
  wordmarkSecond: string;
  /** The cradle mark's colour on the ground. */
  cradle: string;
  qrDark: string;
  seal: SealColors;
  grain: { alpha: number; blend: GlobalCompositeOperation };
  deep: OnDeep;
};

const GOLD_SEAL = (ring: string): SealColors => ({ ring, center: "#FFFFFF", detail: ring });

const SHIPPED: Record<ClassicCombinedTheme, Tokens> = {
  navy: {
    ground: "#0E2442",
    ink: "#FFFFFF",
    soft: "#C3D1E2",
    detail: "#8CC4FF",
    accent: "#FFC24D",
    hair: "rgba(255,255,255,0.16)",
    pillBorder: "rgba(255,255,255,0.24)",
    wordmarkSecond: "#8CC4FF",
    cradle: "#FFFFFF",
    qrDark: "#0E2442",
    seal: GOLD_SEAL("#FFC24D"),
    grain: { alpha: 0.07, blend: "soft-light" },
    deep: { fill: "#091A31", stroke: "rgba(255,255,255,0.08)", ink: "#FFFFFF", soft: "#C3D1E2", detail: "#8CC4FF", accent: "#FFC24D", hair: "rgba(255,255,255,0.14)" },
  },
  emerald: {
    ground: "#0B3D2E",
    ink: "#FFFFFF",
    soft: "#C5DDD2",
    detail: "#9ED9BF",
    accent: "#E8C26A",
    hair: "rgba(232,194,106,0.30)",
    pillBorder: "#E8C26A",
    wordmarkSecond: "#9ED9BF",
    cradle: "#FFFFFF",
    qrDark: "#0B3D2E",
    seal: GOLD_SEAL("#E8C26A"),
    grain: { alpha: 0.07, blend: "soft-light" },
    // The gold-edged card.
    deep: { fill: "#0F4A38", stroke: "rgba(232,194,106,0.30)", ink: "#FFFFFF", soft: "#C5DDD2", detail: "#9ED9BF", accent: "#E8C26A", hair: "rgba(232,194,106,0.30)" },
  },
  crimson: {
    ground: "#3A0B17",
    ink: "#FFFFFF",
    soft: "#EBC9D0",
    detail: "#F6A6B5",
    accent: "#FFC24D",
    hair: "rgba(255,255,255,0.16)",
    pillBorder: "rgba(255,255,255,0.24)",
    wordmarkSecond: "#FFD7DF",
    cradle: "#FFFFFF",
    qrDark: "#3A0B17",
    seal: GOLD_SEAL("#FFC24D"),
    grain: { alpha: 0.08, blend: "soft-light" },
    // The red band across the top (square) or down the left (landscape).
    deep: { fill: "#A3122F", stroke: "rgba(255,255,255,0.08)", ink: "#FFFFFF", soft: "#FFE1E7", detail: "#FFD7DF", accent: "#FFC24D", hair: "rgba(255,255,255,0.14)" },
  },
};

/** The tokens for a design drawn on the Admin's own ground colour. */
function derivedTokens(theme: ClassicCombinedTheme, ground: string): Tokens {
  const p = derivePalette(ground, theme === "emerald" ? "card" : theme === "crimson" ? "band" : "panel");
  const gilt = (colour: string) => withAlpha(colour, 0.3);
  return {
    ground: p.ground,
    ink: p.ink,
    soft: p.soft,
    detail: p.detail,
    accent: p.accent,
    // Emerald rules its ground in gold; the others in the ink's own tint.
    hair: theme === "emerald" && p.dark ? gilt(p.accent) : p.hair,
    pillBorder: theme === "emerald" ? p.accent : p.dark ? "rgba(255,255,255,0.24)" : withAlpha(p.ink, 0.24),
    wordmarkSecond: p.detail,
    cradle: p.cradle,
    qrDark: p.qrDark,
    seal: p.dark ? GOLD_SEAL(p.accent) : { ring: p.ink, center: p.ink, detail: p.detail },
    grain: p.grain,
    deep: theme === "emerald" ? { ...p.deep, stroke: gilt(p.deep.accent), hair: gilt(p.deep.accent) } : p.deep,
  };
}

/** The design's own colours, or - given a ground colour - the ones derived from it. */
export function combinedTokens(theme: ClassicCombinedTheme, ground?: string | null): Tokens {
  return ground ? derivedTokens(theme, ground) : SHIPPED[theme];
}

function background(ctx: CanvasRenderingContext2D, width: number, height: number, t: Tokens) {
  ctx.fillStyle = t.ground;
  ctx.fillRect(0, 0, width, height);
  drawGrain(ctx, width, height, t.grain.alpha, t.grain.blend);
}

/** What the brand is drawn in, by what it sits on. */
type BrandColours = { ink: string; second: string; cradle: string; lifted: string };
const onGround = (t: Tokens): BrandColours => ({ ink: t.ink, second: t.wordmarkSecond, cradle: t.cradle, lifted: t.accent });
const onBand = (t: Tokens): BrandColours => ({ ink: t.deep.ink, second: t.deep.detail, cradle: "#FFFFFF", lifted: t.deep.accent });

function brand(ctx: CanvasRenderingContext2D, colours: BrandColours, x: number, cy: number, markWidth: number, wordSize: number) {
  drawCradle(ctx, x, cy - (markWidth * 32) / 48 / 2, markWidth, colours.cradle, colours.lifted);
  drawWordmark(ctx, x + markWidth + (markWidth > 60 ? 18 : 14), cy, wordSize, colours.ink, colours.second);
}

/** A rounded date pill; `align` says whether x is its left or right edge. */
function datePill(ctx: CanvasRenderingContext2D, text: string, x: number, cy: number, align: "left" | "right", ink: string, border: string, padX: number, height: number) {
  const width = measure(ctx, text, 24, 600) + padX * 2;
  const left = align === "right" ? x - width : x;
  strokeRoundedRect(ctx, left, cy - height / 2, width, height, height / 2, border, 1.5);
  drawText(ctx, text, left + padX, cy, { size: 24, weight: 600, color: ink });
}

/** A short accent rule and the sub line. */
function subLine(ctx: CanvasRenderingContext2D, text: string, x: number, cy: number, t: Tokens, size: number, bar: number, maxWidth: number) {
  ctx.fillStyle = t.accent;
  ctx.fillRect(x, cy - 1.5, bar, 3);
  drawText(ctx, text, x + bar + 14, cy, { size, weight: 500, color: t.soft, maxWidth: maxWidth - bar - 14 });
}

/** Seal plus "Scan to see every tuition" and the board address, left of the QR. */
function footerText(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, t: Tokens, x: number, cy: number, seal: number, maxWidth: number) {
  drawSeal(ctx, x + seal / 2, cy, seal, t.seal);
  const textX = x + seal + 22;
  drawText(ctx, POSTER_WORDS[input.locale].scanForAll, textX, cy - 21, { size: 30, weight: 700, color: t.ink, maxWidth: maxWidth - seal - 22 });
  drawText(ctx, input.boardAddress, textX, cy + 22, { size: 26, weight: 600, color: t.detail, maxWidth: maxWidth - seal - 22 });
}

/** What the landscape footer is drawn in: on the ground, or on Crimson's band. */
type FooterColours = { scan: string; host: string; seal: SealColors };
const footerOnGround = (t: Tokens): FooterColours => ({ scan: t.ink, host: t.detail, seal: t.seal });
const footerOnBand = (t: Tokens): FooterColours => ({ scan: t.deep.ink, host: t.deep.detail, seal: GOLD_SEAL(t.deep.accent) });

/** QR tile and seal side by side, the scan line and host under them (landscape left columns). */
function landscapeFooter(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, t: Tokens, x: number, bottom: number, tile: number, seal: number, maxWidth: number, colours: FooterColours) {
  const hostCy = bottom - 15.5;
  const captionCy = hostCy - 35;
  const rowBottom = captionCy - 25.5;
  drawQrTile(ctx, input.url, x, rowBottom - tile, tile, t.qrDark, 12, 14);
  drawSeal(ctx, x + tile + 16 + seal / 2, rowBottom - seal / 2, seal, colours.seal);
  drawText(ctx, POSTER_WORDS[input.locale].scanForAll, x, captionCy, { size: 24, weight: 600, color: colours.scan, maxWidth });
  drawText(ctx, input.host, x, hostCy, { size: 24, weight: 600, color: colours.host, maxWidth });
}

/** A list row: optional number, Job ID, title, place line, salary on the right. Returns nothing; draws inside [top, top+height]. */
function listRow(
  ctx: CanvasRenderingContext2D,
  input: CombinedPosterInput,
  t: Tokens,
  job: PosterTuition,
  index: number,
  box: { left: number; right: number; top: number; height: number },
  look: { titleSize: number; metaSize: number; salarySize: number; idInline: boolean; numberColumn?: number; numberSize?: number },
) {
  const words = POSTER_WORDS[input.locale];
  const salaryWidth = Math.max(job.salary ? measure(ctx, job.salary, look.salarySize, 800) : 0, measure(ctx, words.perMonth, 24, 500));
  const salaryLine = look.salarySize * 1.1;
  if (job.salary) {
    const blockTop = box.top + (box.height - (salaryLine + 31)) / 2;
    drawText(ctx, job.salary, box.right, blockTop + salaryLine / 2, { size: look.salarySize, weight: 800, color: t.accent, align: "right" });
    drawText(ctx, words.perMonth, box.right, blockTop + salaryLine + 15.5, { size: 24, weight: 500, color: t.soft, align: "right" });
  }
  let x = box.left;
  if (look.numberColumn) {
    const number = localDigits(String(index + 1).padStart(2, "0"), input.locale);
    drawText(ctx, number, x, box.top + box.height / 2, { size: look.numberSize ?? 40, weight: 800, color: t.detail, tracking: -0.02 });
    x += look.numberColumn + 20;
  }
  const textRight = box.right - (job.salary ? salaryWidth + 24 : 0);
  const titleLine = look.titleSize * 1.35;
  const metaLine = look.metaSize * 1.3;
  const idLine = 31;
  const stack = look.idInline ? titleLine + 4 + metaLine : idLine + 2 + titleLine + 2 + metaLine;
  let y = box.top + (box.height - stack) / 2;
  const idText = `# ${job.jobId}`;
  if (look.idInline && !look.numberColumn) {
    const idWidth = drawText(ctx, idText, x, y + titleLine / 2, { size: 24, weight: 600, color: t.detail, tracking: 0.04 });
    drawText(ctx, job.rowTitle, x + idWidth + 18, y + titleLine / 2, { size: look.titleSize, weight: 700, color: t.ink, maxWidth: textRight - x - idWidth - 18 });
    y += titleLine + 4;
  } else if (look.idInline) {
    drawText(ctx, job.rowTitle, x, y + titleLine / 2, { size: look.titleSize, weight: 700, color: t.ink, maxWidth: textRight - x });
    y += titleLine + 4;
  } else {
    drawText(ctx, idText, x, y + idLine / 2, { size: 24, weight: 600, color: t.detail, tracking: 0.04 });
    y += idLine + 2;
    drawText(ctx, job.rowTitle, x, y + titleLine / 2, { size: look.titleSize, weight: 700, color: t.ink, maxWidth: textRight - x });
    y += titleLine + 2;
  }
  let metaX = x;
  const metaCy = y + metaLine / 2;
  if (look.numberColumn) {
    metaX += drawText(ctx, idText, metaX, metaCy, { size: 24, weight: 600, color: t.detail, tracking: 0.04 }) + 8;
  }
  drawIcon(ctx, "pin", metaX, metaCy - look.metaSize / 2, look.metaSize, t.soft);
  metaX += look.metaSize + 10;
  drawText(ctx, job.rowMeta, metaX, metaCy, { size: look.metaSize, weight: 400, color: t.soft, maxWidth: textRight - metaX });
}

/** A gold-edged Emerald card. */
function emeraldCard(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, t: Tokens, job: PosterTuition, x: number, y: number, w: number, h: number, look: { salarySize: number; titleSize: number; padX: number; padY: number }) {
  const card = t.deep;
  fillRoundedRect(ctx, x, y, w, h, 18, card.fill);
  strokeRoundedRect(ctx, x, y, w, h, 18, card.stroke, 1);
  const inner = { left: x + look.padX, right: x + w - look.padX, top: y + look.padY, bottom: y + h - look.padY };
  const width = inner.right - inner.left;
  let cy = inner.top + 15.5;
  drawText(ctx, `# ${job.jobId}`, inner.left, cy, { size: 24, weight: 600, color: card.detail, tracking: 0.04 });
  cy += 15.5 + 6 + (look.salarySize * 1.15) / 2;
  if (job.salary) {
    const salaryWidth = drawText(ctx, job.salary, inner.left, cy, { size: look.salarySize, weight: 800, color: card.accent, maxWidth: width * 0.75 });
    drawText(ctx, POSTER_WORDS[input.locale].perMonthShort, inner.left + salaryWidth + 10, cy + (look.salarySize - 24) * 0.32, { size: 24, weight: 500, color: card.soft });
  }
  cy += (look.salarySize * 1.15) / 2 + 10;
  const lineHeight = look.titleSize * 1.3;
  for (const line of wrapLines(ctx, job.rowTitle, look.titleSize, 700, width, 2)) {
    drawText(ctx, line, inner.left, cy + lineHeight / 2, { size: look.titleSize, weight: 700, color: card.ink });
    cy += lineHeight;
  }
  const metaCy = inner.bottom - 15.5;
  drawIcon(ctx, "pin", inner.left, metaCy - 12, 24, card.detail);
  drawText(ctx, job.rowMeta, inner.left + 32, metaCy, { size: 24, weight: 400, color: card.soft, maxWidth: width - 32 });
}

function emeraldFrame(ctx: CanvasRenderingContext2D, width: number, height: number, t: Tokens, outer: number, inner: number) {
  strokeRoundedRect(ctx, outer, outer, width - outer * 2, height - outer * 2, 6, t.accent, 1.5, 0.55);
  strokeRoundedRect(ctx, inner, inner, width - inner * 2, height - inner * 2, 4, t.accent, 1, 0.25);
}

export function drawCombinedSquare(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, themeId: ClassicCombinedTheme, ground?: string | null) {
  const t = combinedTokens(themeId, ground);
  const W = 1080;
  const words = POSTER_WORDS[input.locale];
  const jobs = input.tuitions.slice(0, 4);

  if (themeId === "navy") {
    background(ctx, W, W, t);
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, 6);
    const left = 80;
    const right = 1000;
    brand(ctx, onGround(t), left, 90, 78, 38);
    datePill(ctx, input.date, right, 90, "right", t.soft, t.pillBorder, 22, 46);
    drawText(ctx, words.navyTitle, left, 198.5, { size: 64, weight: 800, color: t.ink, maxWidth: right - left, tracking: -0.01 });
    subLine(ctx, input.sub, left, 263, t, 28, 44, right - left);
    const rowsTop = 309;
    const rowHeight = 126;
    jobs.forEach((job, index) => {
      const top = rowsTop + index * rowHeight;
      hairline(ctx, left, top, right, top, t.hair);
      listRow(ctx, input, t, job, index, { left, right, top, height: rowHeight }, { titleSize: 34, metaSize: 26, salarySize: 46, idInline: true });
    });
    hairline(ctx, left, rowsTop + jobs.length * rowHeight, right, rowsTop + jobs.length * rowHeight, t.hair);
    drawQrTile(ctx, input.url, right - 168, 852, 168, t.qrDark, 14, 18);
    footerText(ctx, input, t, left, 936, 112, right - 168 - 24 - left);
    return;
  }

  if (themeId === "emerald") {
    background(ctx, W, W, t);
    emeraldFrame(ctx, W, W, t, 28, 36);
    const left = 84;
    const right = 996;
    brand(ctx, onGround(t), left, 94, 78, 38);
    datePill(ctx, input.date, right, 94, "right", t.accent, t.pillBorder, 22, 46);
    drawText(ctx, words.emeraldTitle, left, 186.5, { size: 64, weight: 800, color: t.ink, maxWidth: right - left, tracking: -0.01 });
    subLine(ctx, input.sub, left, 249, t, 28, 44, right - left);
    const gridTop = 291;
    const gridBottom = 848;
    const gap = 20;
    const cardW = (right - left - gap) / 2;
    const cardH = (gridBottom - gridTop - gap) / 2;
    jobs.forEach((job, index) => {
      const x = left + (index % 2) * (cardW + gap);
      const y = gridTop + Math.floor(index / 2) * (cardH + gap);
      emeraldCard(ctx, input, t, job, x, y, cardW, cardH, { salarySize: 48, titleSize: 28, padX: 26, padY: 24 });
    });
    drawQrTile(ctx, input.url, right - 148, 872, 148, t.qrDark, 12, 16);
    footerText(ctx, input, t, left, 946, 108, right - 148 - 24 - left);
    return;
  }

  // Crimson
  background(ctx, W, W, t);
  ctx.fillStyle = t.deep.fill;
  ctx.fillRect(0, 0, W, 340);
  drawGrain(ctx, W, 340, 0.04, "soft-light");
  const left = 80;
  const right = 1000;
  brand(ctx, onBand(t), left, 86, 78, 38);
  datePill(ctx, input.date, right, 86, "right", t.deep.soft, "rgba(255,255,255,0.45)", 22, 46);
  ctx.fillStyle = t.deep.accent;
  ctx.beginPath();
  ctx.arc(left + 7, 170, 7, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, words.crimsonKicker, left + 28, 170, { size: 28, weight: 700, color: t.deep.accent, tracking: input.locale === "bn" ? 0.02 : 0.16 });
  drawText(ctx, words.crimsonTitle, left, 235, { size: 68, weight: 800, color: t.deep.ink, maxWidth: right - left, tracking: -0.01 });
  drawText(ctx, `${input.subShort} · ${words.applyNow}`, left, 299, { size: 26, weight: 500, color: t.deep.soft, maxWidth: right - left });
  const rowsTop = 360;
  const rowHeight = 112;
  jobs.forEach((job, index) => {
    const top = rowsTop + index * rowHeight;
    listRow(ctx, input, t, job, index, { left, right, top, height: rowHeight }, { titleSize: 32, metaSize: 24, salarySize: 42, idInline: true, numberColumn: 72, numberSize: 40 });
    hairline(ctx, left, top + rowHeight, right, top + rowHeight, t.hair);
  });
  drawQrTile(ctx, input.url, right - 148, 876, 148, t.qrDark, 12, 16);
  footerText(ctx, input, t, left, 950, 104, right - 148 - 24 - left);
}

export function drawCombinedLandscape(ctx: CanvasRenderingContext2D, input: CombinedPosterInput, themeId: ClassicCombinedTheme, ground?: string | null) {
  const t = combinedTokens(themeId, ground);
  const W = 1200;
  const H = 675;
  const words = POSTER_WORDS[input.locale];
  const jobs = input.tuitions.slice(0, 4);

  if (themeId === "navy") {
    background(ctx, W, H, t);
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, 6);
    const left = 56;
    const column = 330;
    brand(ctx, onGround(t), left, 74.5, 56, 28);
    const titleLines = wrapLines(ctx, words.navyTitle, 44, 800, column, 2);
    let y = 129;
    for (const line of titleLines) {
      drawText(ctx, line, left, y + 26.5, { size: 44, weight: 800, color: t.ink, tracking: -0.01 });
      y += 53;
    }
    subLine(ctx, input.subShort, left, y + 8 + 16, t, 24, 36, column);
    datePill(ctx, input.date, left, y + 8 + 32 + 16 + 20, "left", t.soft, t.pillBorder, 18, 40);
    landscapeFooter(ctx, input, t, left, H - 56, 144, 92, column, footerOnGround(t));
    const listLeft = left + column + 44;
    const listRight = W - 56;
    const top = 56;
    const rowHeight = (H - 112) / 4;
    jobs.forEach((job, index) => {
      const rowTop = top + index * rowHeight;
      hairline(ctx, listLeft, rowTop, listRight, rowTop, t.hair);
      listRow(ctx, input, t, job, index, { left: listLeft, right: listRight, top: rowTop, height: rowHeight }, { titleSize: 28, metaSize: 24, salarySize: 40, idInline: false });
    });
    hairline(ctx, listLeft, top + jobs.length * rowHeight, listRight, top + jobs.length * rowHeight, t.hair);
    return;
  }

  if (themeId === "emerald") {
    background(ctx, W, H, t);
    emeraldFrame(ctx, W, H, t, 20, 27);
    const left = 54;
    const column = 320;
    brand(ctx, onGround(t), left, 68, 54, 26);
    const titleLines = wrapLines(ctx, words.emeraldTitle, 42, 800, column, 2);
    let y = 116;
    for (const line of titleLines) {
      drawText(ctx, line, left, y + 25, { size: 42, weight: 800, color: t.ink, tracking: -0.01 });
      y += 50.4;
    }
    subLine(ctx, input.subShort, left, y + 8 + 16, t, 24, 36, column);
    datePill(ctx, input.date, left, y + 8 + 32 + 14 + 20, "left", t.accent, t.pillBorder, 18, 40);
    landscapeFooter(ctx, input, t, left, H - 50, 136, 88, column, footerOnGround(t));
    const gridLeft = left + column + 40;
    const gridRight = W - 54;
    const gridTop = 50;
    const gridBottom = H - 50;
    const gap = 16;
    const cardW = (gridRight - gridLeft - gap) / 2;
    const cardH = (gridBottom - gridTop - gap) / 2;
    jobs.forEach((job, index) => {
      const x = gridLeft + (index % 2) * (cardW + gap);
      const cardY = gridTop + Math.floor(index / 2) * (cardH + gap);
      emeraldCard(ctx, input, t, job, x, cardY, cardW, cardH, { salarySize: 44, titleSize: 26, padX: 24, padY: 22 });
    });
    return;
  }

  // Crimson: a red band down the left, numbered rows on the right.
  background(ctx, W, H, t);
  ctx.fillStyle = t.deep.fill;
  ctx.fillRect(0, 0, 400, H);
  const left = 40;
  const column = 320;
  brand(ctx, onBand(t), left, 66, 54, 26);
  ctx.fillStyle = t.deep.accent;
  ctx.beginPath();
  ctx.arc(left + 6, 137, 6, 0, Math.PI * 2);
  ctx.fill();
  drawText(ctx, words.crimsonKicker, left + 24, 137, { size: 26, weight: 700, color: t.deep.accent, tracking: input.locale === "bn" ? 0.02 : 0.16 });
  const titleLines = wrapLines(ctx, words.crimsonTitle, 46, 800, column, 2);
  let y = 158;
  for (const line of titleLines) {
    drawText(ctx, line, left, y + 27.5, { size: 46, weight: 800, color: t.deep.ink, tracking: -0.01 });
    y += 55;
  }
  drawText(ctx, input.subShort, left, y + 8 + 15.5, { size: 24, weight: 500, color: t.deep.soft, maxWidth: column });
  drawText(ctx, input.date, left, y + 8 + 31 + 6 + 15.5, { size: 24, weight: 500, color: t.deep.soft, maxWidth: column });
  landscapeFooter(ctx, input, t, left, H - 48, 136, 88, column, footerOnBand(t));
  const listLeft = 448;
  const listRight = W - 52;
  const top = 36;
  const rowHeight = (H - 72) / 4;
  jobs.forEach((job, index) => {
    const rowTop = top + index * rowHeight;
    listRow(ctx, input, t, job, index, { left: listLeft, right: listRight, top: rowTop, height: rowHeight }, { titleSize: 26, metaSize: 24, salarySize: 38, idInline: true, numberColumn: 60, numberSize: 34 });
    hairline(ctx, listLeft, rowTop + rowHeight, listRight, rowTop + rowHeight, t.hair);
  });
}


export function combinedTallHeight(input: CombinedPosterInput): number {
  return mistTallHeight(input);
}

export function drawCombinedTall(
  ctx: CanvasRenderingContext2D,
  input: CombinedPosterInput,
  themeId: ClassicCombinedTheme,
  ground?: string | null,
) {
  const t = combinedTokens(themeId, ground);
  const W = TALL_POSTER_WIDTH;
  const H = combinedTallHeight(input);
  const words = POSTER_WORDS[input.locale];
  const left = 60;
  const right = 1020;
  const width = right - left;

  // 1. Background
  if (themeId === "navy") {
    background(ctx, W, H, t);
    ctx.fillStyle = t.accent;
    ctx.fillRect(0, 0, W, 6);
  } else if (themeId === "emerald") {
    background(ctx, W, H, t);
    emeraldFrame(ctx, W, H, t, 28, 36);
  } else {
    // crimson
    background(ctx, W, H, t);
    ctx.fillStyle = t.deep.fill;
    ctx.fillRect(0, 0, W, 320);
    drawGrain(ctx, W, 320, 0.04, "soft-light");
  }

  // 2. Header
  if (themeId === "navy") {
    brand(ctx, onGround(t), left, 84, 76, 38);
    datePill(ctx, input.date, right, 84, "right", t.soft, t.pillBorder, 22, 44);
    drawText(ctx, words.navyTitle, left, 185, { size: 56, weight: 800, color: t.ink, maxWidth: width, tracking: -0.01 });
    subLine(ctx, input.sub, left, 252, t, 26, 42, width);
  } else if (themeId === "emerald") {
    brand(ctx, onGround(t), left + 20, 88, 76, 38);
    datePill(ctx, input.date, right - 20, 88, "right", t.accent, t.pillBorder, 22, 44);
    drawText(ctx, words.emeraldTitle, left + 20, 185, { size: 56, weight: 800, color: t.ink, maxWidth: width - 40, tracking: -0.01 });
    subLine(ctx, input.sub, left + 20, 252, t, 26, 42, width - 40);
  } else {
    // crimson
    brand(ctx, onBand(t), left, 80, 76, 38);
    datePill(ctx, input.date, right, 80, "right", t.deep.soft, "rgba(255,255,255,0.45)", 22, 44);
    ctx.fillStyle = t.deep.accent;
    ctx.beginPath();
    ctx.arc(left + 7, 154, 7, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, words.crimsonKicker, left + 26, 154, { size: 26, weight: 700, color: t.deep.accent, tracking: input.locale === "bn" ? 0.02 : 0.16 });
    drawText(ctx, words.crimsonTitle, left, 214, { size: 58, weight: 800, color: t.deep.ink, maxWidth: width, tracking: -0.01 });
    drawText(ctx, `${input.subShort} · ${words.applyNow}`, left, 276, { size: 25, weight: 500, color: t.deep.soft, maxWidth: width });
  }

  // 3. Curriculum Groups & Cards
  let y = 338;
  const groups = groupTuitions(input.tuitions);
  for (const group of groups) {
    const barHeight = 56;
    const countHeight = 44;
    const cardH = 112;

    // Section bar
    if (themeId === "emerald") {
      fillRoundedRect(ctx, left, y, width, barHeight, 12, t.deep.fill);
      strokeRoundedRect(ctx, left, y, width, barHeight, 12, t.accent, 1, 0.4);
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(left + 24, y + barHeight / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      const groupText = input.locale === "en" ? group.label.toUpperCase() : group.label;
      drawText(ctx, groupText, left + 44, y + barHeight / 2, { size: 24, weight: 800, color: t.accent, tracking: input.locale === "en" ? 0.08 : 0.01, maxWidth: width - 60 });
    } else {
      fillRoundedRect(ctx, left, y, width, barHeight, 12, t.deep.fill);
      fillRoundedRect(ctx, left, y, 6, barHeight, 6, t.accent);
      ctx.fillStyle = t.accent;
      ctx.beginPath();
      ctx.arc(left + 26, y + barHeight / 2, 5, 0, Math.PI * 2);
      ctx.fill();
      const groupText = input.locale === "en" ? group.label.toUpperCase() : group.label;
      drawText(ctx, groupText, left + 46, y + barHeight / 2, { size: 24, weight: 800, color: t.ink, tracking: input.locale === "en" ? 0.08 : 0.01, maxWidth: width - 60 });
      hairline(ctx, left, y + barHeight, right, y + barHeight, t.hair);
    }
    y += barHeight;

    // Count line
    const count = tuitionCount(group.items.length, input.locale);
    ctx.fillStyle = themeId === "emerald" ? t.accent : t.soft;
    ctx.beginPath();
    ctx.arc(left + 22, y + countHeight / 2, 4, 0, Math.PI * 2);
    ctx.fill();
    drawText(ctx, count, left + 38, y + countHeight / 2, { size: 21, weight: 700, color: t.soft });
    y += countHeight;

    // Cards
    for (const job of group.items) {
      if (themeId === "emerald") {
        fillRoundedRect(ctx, left, y, width, cardH, 14, t.deep.fill);
        strokeRoundedRect(ctx, left, y, width, cardH, 14, t.deep.stroke, 1.2);
        fillRoundedRect(ctx, left, y + 14, 4, cardH - 28, 2, t.accent);
      } else if (themeId === "crimson") {
        fillRoundedRect(ctx, left, y, width, cardH, 14, t.deep.fill);
        strokeRoundedRect(ctx, left, y, width, cardH, 14, t.deep.stroke, 1);
        fillRoundedRect(ctx, left, y + 14, 4, cardH - 28, 2, t.deep.accent);
      } else {
        // navy
        fillRoundedRect(ctx, left, y, width, cardH, 14, t.deep.fill);
        strokeRoundedRect(ctx, left, y, width, cardH, 14, t.deep.stroke, 1);
        fillRoundedRect(ctx, left, y + 14, 4, cardH - 28, 2, t.detail);
      }

      // Row 1: ID chip + tutor pill + salary on right
      const idText = `# ${job.jobId}`;
      const idWidth = measure(ctx, idText, 22, 700) + 20;
      fillRoundedRect(ctx, left + 18, y + 16, idWidth, 32, 8, "rgba(255,255,255,0.08)");
      drawText(ctx, idText, left + 28, y + 32, { size: 22, weight: 700, color: themeId === "emerald" ? t.accent : t.detail, tracking: 0.04 });

      if (job.tutorPill) {
        const pillWidth = measure(ctx, job.tutorPill, 17, 700) + 18;
        const pillX = left + 18 + idWidth + 10;
        fillRoundedRect(ctx, pillX, y + 17, pillWidth, 30, 6, "rgba(255,255,255,0.06)");
        strokeRoundedRect(ctx, pillX, y + 17, pillWidth, 30, 6, "rgba(255,255,255,0.12)", 1);
        drawText(ctx, job.tutorPill, pillX + 9, y + 32, { size: 17, weight: 700, color: t.soft });
      }

      // Salary on right
      let salaryOffset = 0;
      if (job.salary) {
        const perMonthText = words.perMonthShort;
        const perWidth = measure(ctx, perMonthText, 20, 500);
        const salWidth = measure(ctx, job.salary, 30, 800);
        salaryOffset = salWidth + perWidth + 24;
        drawText(ctx, perMonthText, right - 20, y + 33, { size: 20, weight: 500, color: t.deep.soft, align: "right" });
        drawText(ctx, job.salary, right - 20 - perWidth - 6, y + 32, { size: 30, weight: 800, color: t.accent, align: "right" });
      }

      // Row 2: Headline + location pin + calendar days
      const maxTitleW = width - 40 - salaryOffset;
      drawText(ctx, job.rowTitle, left + 18, y + 76, { size: 26, weight: 700, color: t.ink, maxWidth: maxTitleW });

      let metaX = left + 18 + Math.min(measure(ctx, job.rowTitle, 26, 700) + 24, maxTitleW + 16);
      const metaParts: Array<{ icon: PosterIcon; text: string }> = [];
      const place = job.areaLine ?? job.area;
      if (place) metaParts.push({ icon: "pin", text: place });
      if (job.week) metaParts.push({ icon: "calendar", text: job.week });

      if (metaParts.length > 0 && right - metaX > 160) {
        for (const part of metaParts) {
          if (metaX + 100 > right - 20) break;
          drawIcon(ctx, part.icon, metaX, y + 66, 20, t.soft);
          metaX += 26;
          const partW = drawText(ctx, part.text, metaX, y + 76, { size: 21, weight: 500, color: t.soft, maxWidth: right - 20 - metaX });
          metaX += partW + 20;
        }
      }

      y += cardH + 12;
    }
    y += 18;
  }

  // 4. Footer
  const footerY = y + 6;
  const footerH = 152;
  fillRoundedRect(ctx, left, footerY, width, footerH, 20, t.deep.fill);
  strokeRoundedRect(ctx, left, footerY, width, footerH, 20, t.deep.stroke, 1.5);

  const tile = 112;
  drawQrTile(ctx, input.url, left + 20, footerY + 20, tile, t.qrDark, 10, 16);
  const sealSize = 88;
  drawSeal(ctx, left + 20 + tile + 24 + sealSize / 2, footerY + footerH / 2, sealSize, t.seal);

  const textLeft = left + 20 + tile + 24 + sealSize + 24;
  const textW = right - 20 - textLeft;
  drawText(ctx, words.scanForAll, textLeft, footerY + footerH / 2 - 18, { size: 26, weight: 700, color: t.ink, maxWidth: textW });
  drawText(ctx, input.boardAddress || input.host, textLeft, footerY + footerH / 2 + 18, { size: 22, weight: 600, color: t.detail, maxWidth: textW });
}
