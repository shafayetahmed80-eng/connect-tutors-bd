import { POSTER_WORDS, tuitionCount, type PosterLocale } from "@shared/poster-copy";
import {
  CRADLE_REST,
  drawCradle,
  drawGrain,
  drawIcon,
  drawQrTile,
  drawSeal,
  drawText,
  drawWordmark,
  fillRoundedRect,
  measure,
  radialGlow,
  roundedRectPath,
  wrapLines,
  type CradlePose,
  type SealColors,
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

/**
 * The rows Facebook lays its own things over, on each frame size: on a Reel the
 * top bar, and at the foot the caption, the name and the buttons. The title
 * card, the closing card and every page of slides keep their writing clear of
 * them; the scroll's list only passes through. Feed and square posts are not
 * covered.
 */
export const REEL_SAFE: Record<ReelSize, { top: number; bottom: number }> = {
  reels: { top: 200, bottom: 480 },
  feed: { top: 0, bottom: 0 },
  square: { top: 0, bottom: 0 },
};

/** The safe rows for a frame of this height. */
function safeFor(frameHeight: number): { top: number; bottom: number } {
  const size = (Object.keys(REEL_SIZES) as ReelSize[]).find(key => REEL_SIZES[key].height === frameHeight);
  return size ? REEL_SAFE[size] : { top: 0, bottom: 0 };
}

/** How long the mark's balls swing, once, on the title card and on the closing card. */
export const CRADLE_SWING_SECONDS = 1.22;

/**
 * The mark's balls `seconds` into their swing: the lifted fifth falls and
 * strikes, the first flies out and falls back, and the fifth rises to rest
 * again - each leg eased like a pendulum. At rest before and after.
 */
export function cradleSwing(seconds: number): CradlePose {
  const legs = [0.32, 0.3, 0.3, 0.3];
  let s = seconds;
  if (s <= 0 || s >= CRADLE_SWING_SECONDS) return CRADLE_REST;
  const lift = CRADLE_REST.right;
  // Falling speeds up; rising slows down.
  const fall = (p: number) => p * p;
  const rise = (p: number) => 1 - (1 - p) * (1 - p);
  if (s < legs[0]!) return { left: 0, right: lift * (1 - fall(s / legs[0]!)) };
  s -= legs[0]!;
  if (s < legs[1]!) return { left: -lift * rise(s / legs[1]!), right: 0 };
  s -= legs[1]!;
  if (s < legs[2]!) return { left: -lift * (1 - fall(s / legs[2]!)), right: 0 };
  s -= legs[2]!;
  return { left: 0, right: lift * rise(Math.min(1, s / legs[3]!)) };
}

/** Where a card's mark is drawn, and in what colours, so it can be drawn again in motion. */
export type CradleMark = { x: number; y: number; width: number; ink: string; lifted: string };

/** How many seconds a line takes to rise the frame's full height. */
export const REEL_CROSS_SECONDS: Record<ReelSpeed, number> = { slow: 6, normal: 4.5, fast: 3 };
/** The title is read before anything moves; the last card is read before the video ends. */
export const REEL_HOLD_START = 2;
export const REEL_HOLD_END = 3;
/** The list comes up to speed, and slows to a stop, over this long rather than starting with a jolt. */
export const REEL_RAMP = 0.9;
export const REEL_FPS = 30;
/** How long the title card turns away like a book's cover, and the closing card shuts like its back cover, by speed. */
export const REEL_TURN_SECONDS: Record<ReelSpeed, number> = { slow: 1.4, normal: 1.1, fast: 0.9 };
/** The same change as a soft fade, when the Admin turns the page turn off. */
export const REEL_FADE_SECONDS = 0.8;
/** How far a page swings before it is a sliver at the spine: short of edge-on, where the perspective would fold back. */
export const REEL_TURN_ANGLE = (80 * Math.PI) / 180;
/** The rows of the list that fade into the ground at the frame's top and bottom, and the room the list keeps clear of them. */
export const REEL_EDGE_FADE = 150;
/** A list screen waits this long before it starts to move and after it stops; one that fits the frame stays this long on each side. */
const LIST_PAUSE = 0.3;
const LIST_STILL = 1.5;
/** The video's own ground: the near-black of a code editor, like the sample the Owner sent. */
export const REEL_DEFAULT_GROUND = "#14161c";
/** The sample's own glow, red into violet, for the default ground and any colour too grey to give a hue. */
export const REEL_DEFAULT_GLOW: [string, string] = ["#ff4d5e", "#8b5cf6"];
/** The same red into violet as pastels, for a light ground too near white to give a hue. */
export const REEL_LIGHT_NEUTRAL_GLOW: [string, string] = ["#f5a3b5", "#c4b5fd"];

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
  /** Whether the title card carries the round BTPA member seal. */
  badge: boolean;
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
  /** How strongly a box's blurred halo and its rim show. */
  halo: number;
  rim: number;
  /** A soft drop shadow under a light box, which a light ground needs to lift it; none on a dark ground. */
  shadow: string | null;
  card: { fill: string; border: string; ink: string; soft: string; detail: string; accent: string; hair: string };
  kind: Record<keyof typeof KIND_ON_DARK, { fill: string; ink: string }>;
};

/**
 * The two colours of the glow, from the ground: a hue either side of it, so a
 * navy ground glows teal into violet and a green one green into blue. A grey
 * ground has no hue to lean on, so it - and the video's own ground - takes the
 * sample's red into violet.
 *
 * A light ground glows in pastels near its own hue instead: two hues far apart
 * at full strength flare against a pale ground (lime and orange on Cream).
 */
export function reelGlow(ground: string, isDefault = false, dark = true): [string, string] {
  const { h, s, l } = hexToHsl(ground);
  if (!dark) {
    // How much colour there really is: a near-white ground can report full saturation.
    const chroma = s * (1 - Math.abs((2 * l) / 100 - 1));
    if (chroma < 3) return REEL_LIGHT_NEUTRAL_GLOW;
    return [hslToHex({ h: (h + 340) % 360, s: 70, l: 74 }), hslToHex({ h: (h + 25) % 360, s: 62, l: 76 })];
  }
  if (isDefault || s < 12) return REEL_DEFAULT_GLOW;
  return [hslToHex({ h: (h + 325) % 360, s: 90, l: 60 }), hslToHex({ h: (h + 45) % 360, s: 85, l: 66 })];
}

/** Every colour the video needs, from the ground the Admin picked (or the video's own). */
export function reelLook(ground?: string | null): ReelLook {
  const chosen = ground ?? REEL_DEFAULT_GROUND;
  const palette = derivePalette(chosen, "card");
  const [glowA, glowB] = reelGlow(palette.ground, !ground, palette.dark);
  const shared = {
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
  };
  if (!palette.dark) {
    // A light ground gets light boxes: white, lifted by a soft shadow in the ground's hue, with the ground's own dark writing.
    const { h } = hexToHsl(palette.ground);
    return {
      ...shared,
      halo: 0.32,
      rim: 0.55,
      shadow: withAlpha(hslToHex({ h, s: 35, l: 30 }), 0.16),
      card: {
        fill: "#ffffff",
        border: withAlpha(palette.ink, 0.1),
        ink: palette.ink,
        soft: palette.soft,
        detail: palette.detail,
        accent: palette.accent,
        hair: withAlpha(palette.ink, 0.12),
      },
      kind: KIND_ON_LIGHT,
    };
  }
  return {
    ...shared,
    halo: 0.6,
    rim: 0.85,
    shadow: null,
    card: {
      fill: palette.deep.fill,
      border: "rgba(255,255,255,0.18)",
      ink: palette.deep.ink,
      soft: palette.deep.soft,
      detail: palette.deep.detail,
      accent: palette.deep.accent,
      hair: palette.deep.hair,
    },
    kind: KIND_ON_DARK,
  };
}

/** The tutor pill on a card: the Job Board's colours for male, female and either, made light enough for a dark box. */
const KIND_ON_DARK = {
  male: { fill: "rgba(22,163,74,0.24)", ink: "#86efac" },
  female: { fill: "rgba(219,39,119,0.24)", ink: "#f9a8d4" },
  any: { fill: "rgba(124,58,237,0.26)", ink: "#c4b5fd" },
};

/** The same pills on a white box: the Job Board's own pale fills and deep writing. */
const KIND_ON_LIGHT = {
  male: { fill: "#dcfce7", ink: "#15803d" },
  female: { fill: "#fce7f3", ink: "#be185d" },
  any: { fill: "#ede9fe", ink: "#6d28d9" },
};

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
  /** Where the places and their tuitions start and end in the strip. */
  listTop: number;
  listBottom: number;
};

/** What a card's foot says on the left: how often and when. */
function footLine(tuition: PosterTuition): string {
  return [tuition.weekPhrase, tuition.time].filter(Boolean).join(" · ");
}

/** A tuition's box without its place yet: its wrapped text, and how tall that makes it. */
function measureCard(ctx: CanvasRenderingContext2D, tuition: PosterTuition, width: number): Omit<CardBlock, "kind" | "top"> {
  const inner = width - SIDE * 2 - CARD.pad * 2;
  const headline = wrapLines(ctx, [tuition.classes, tuition.curricula].filter(Boolean).join(" · "), CARD.headSize, 800, inner, 2);
  const subjects = tuition.subjects ? wrapLines(ctx, tuition.subjects, CARD.subjectSize, 600, inner, 2) : [];
  const foot = footLine(tuition);
  const height = CARD.pad + CARD.idRow + CARD.gapAfterId
    + headline.length * CARD.headLine + CARD.gapAfterHead
    + subjects.length * CARD.subjectLine
    + CARD.gapBeforeRule + 1 + CARD.gapAfterRule + CARD.footRow + CARD.pad;
  return { height, tuition, headline, subjects, foot };
}

/**
 * Where everything goes. The title card and the closing card are each a frame
 * tall, so the video opens on the title alone and ends on the closing card
 * alone; between them each block is as tall as its wrapped text needs.
 */
export function layoutReel(ctx: CanvasRenderingContext2D, input: ReelInput, size: ReelSize): ReelLayout {
  const { width, height: frameHeight } = REEL_SIZES[size];
  const blocks: ReelBlock[] = [{ kind: "title", top: 0, height: frameHeight }];
  let y = frameHeight + GAP.edge;
  const areas = groupByArea(input.tuitions, input.locale);
  areas.forEach((area, index) => {
    if (index > 0) y += GAP.betweenAreas;
    blocks.push({ kind: "area", top: y, height: AREA.height, area });
    y += AREA.height + GAP.afterArea;
    area.items.forEach((tuition, itemIndex) => {
      if (itemIndex > 0) y += GAP.betweenCards;
      const card = measureCard(ctx, tuition, width);
      blocks.push({ kind: "card", top: y, ...card });
      y += card.height;
    });
  });
  const listBottom = y;
  y += GAP.edge;
  blocks.push({ kind: "end", top: y, height: frameHeight });
  return { width, frameHeight, blocks, height: y + frameHeight, listTop: frameHeight + GAP.edge, listBottom };
}

// ---- Slides ----------------------------------------------------------------

/** How the video is made: the list rising up the frame in one run, or the list in pages that turn. */
export type ReelStyle = "scroll" | "slides";

/** The room a page keeps clear at its top and bottom, for the boxes' glow. */
const SLIDE_PAD = 100;

export type SlidePage = {
  /** What is on the page, placed from the page's own top; a page is one frame tall. */
  blocks: ReelBlock[];
  /** How many tuitions it holds. */
  cards: number;
};

export type SlidesLayout = {
  width: number;
  frameHeight: number;
  title: ReelBlock;
  end: ReelBlock;
  pages: SlidePage[];
};

/**
 * The list in pages, as many tuitions to a page as the frame holds. A place
 * stays with its tuitions: its heading is never left alone at the foot of a
 * page, and where its tuitions run on to the next page the heading comes
 * again. The content of each page sits in the middle of the rows Facebook
 * leaves clear (see `REEL_SAFE`).
 */
export function layoutSlides(ctx: CanvasRenderingContext2D, input: ReelInput, size: ReelSize): SlidesLayout {
  const { width, height: frameHeight } = REEL_SIZES[size];
  const safe = safeFor(frameHeight);
  const padTop = Math.max(SLIDE_PAD, safe.top);
  const padBottom = Math.max(SLIDE_PAD, safe.bottom);
  const capacity = frameHeight - padTop - padBottom;
  const pages: SlidePage[] = [];
  let current: { blocks: ReelBlock[]; height: number; cards: number } = { blocks: [], height: 0, cards: 0 };
  const close = () => {
    if (current.blocks.length === 0) return;
    const shift = Math.round(padTop + (capacity - current.height) / 2);
    pages.push({ blocks: current.blocks.map(block => ({ ...block, top: block.top + shift })), cards: current.cards });
    current = { blocks: [], height: 0, cards: 0 };
  };

  for (const area of groupByArea(input.tuitions, input.locale)) {
    // Whether this place's heading is already on the page being filled.
    let headed = false;
    for (const tuition of area.items) {
      const card = measureCard(ctx, tuition, width);
      const gap = () => (current.blocks.length === 0 ? 0 : headed ? GAP.betweenCards : GAP.betweenAreas);
      const heading = headed ? 0 : AREA.height + GAP.afterArea;
      if (current.blocks.length > 0 && current.height + gap() + heading + card.height > capacity) {
        close();
        headed = false;
      }
      let y = current.height + gap();
      if (!headed) {
        current.blocks.push({ kind: "area", top: y, height: AREA.height, area });
        y += AREA.height + GAP.afterArea;
        headed = true;
      }
      current.blocks.push({ kind: "card", top: y, ...card });
      current.height = y + card.height;
      current.cards += 1;
    }
  }
  close();

  return {
    width,
    frameHeight,
    title: { kind: "title", top: 0, height: frameHeight },
    end: { kind: "end", top: 0, height: frameHeight },
    pages,
  };
}

// ---- Timing ----------------------------------------------------------------

/** How a page of the slides leaves or arrives: turned like a book's page, or faded. */
export type ReelTransition = "turn" | "fade";

/** How the title card leaves and the closing card arrives in a scroll: rising with the list, or faded. */
export type ScrollEnd = "rise" | "fade";

export type ReelTimeline = {
  /** The strip row at the top of the frame when the list starts to move. */
  from: number;
  /** How far it travels from there, in pixels (0 when there is nothing to move). */
  distance: number;
  opening: ScrollEnd;
  closing: ScrollEnd;
  /** The title card is still for this long; a faded one then fades over `openDuration` (0 when it rises). */
  holdStart: number;
  openDuration: number;
  /** When the strip starts to move, and how long it moves for, the two ramps included. */
  scrollStart: number;
  move: number;
  /** When a faded closing card starts to come in, over `closeDuration` (0 when it rises), and how long it then stays. */
  closeStart: number;
  closeDuration: number;
  holdEnd: number;
  total: number;
  ramp: number;
  /** The full speed, between cards, in pixels a second. */
  speed: number;
  /** The seconds the run has taken on reaching each row of it (row 0 to `distance`); empty when there is no run. */
  pace: Float64Array;
};

/** How much a card slows the list as it crosses the reading line - to this share of the full speed - and over how many rows either side. */
export const REEL_READ_SLOWDOWN = 0.35;
const READ_REACH = 130;

/** Where the eye reads a scroll: the middle of the rows Facebook leaves clear. */
function readingLine(frameHeight: number): number {
  const safe = safeFor(frameHeight);
  return safe.top + (frameHeight - safe.top - safe.bottom) / 2;
}

/**
 * The run's pace, row by row: at full speed between cards, easing down as each
 * card's middle crosses the reading line and back up after it, like a reader
 * lingering on each - never stopping, so it never jolts - and picking up speed
 * from rest at the start and slowing to a stop at the end, with the steady
 * pull of a ramp of `REEL_RAMP` seconds.
 */
function paceTable(distance: number, pxPerSecond: number, lingerAt: number[]): Float64Array {
  const rows = Math.max(0, Math.round(distance));
  const times = new Float64Array(rows + 1);
  // Rows covered while picking up speed: at a steady pull the speed grows as the square root of the ground covered.
  const rampRows = Math.max(1, (pxPerSecond * REEL_RAMP) / 2);
  for (let row = 0; row < rows; row += 1) {
    const y = row + 0.5;
    let speed = pxPerSecond * Math.min(1, Math.sqrt(y / rampRows), Math.sqrt((rows - y) / rampRows));
    for (const at of lingerAt) {
      const near = Math.abs(y - at) / READ_REACH;
      if (near < 1) speed *= 1 - (1 - REEL_READ_SLOWDOWN) * (1 + Math.cos(Math.PI * near)) / 2;
    }
    times[row + 1] = times[row]! + 1 / Math.max(speed, 1e-3);
  }
  return times;
}

/**
 * When everything happens in a scroll. The title card is held, then either
 * rises away with the list (it is the top of the strip) or fades into the
 * list's first screen; the list rises; then the closing card either rises in
 * under it until it fills the frame (it is the foot of the strip) or fades in
 * over the list's last screen; and it is held.
 */
export function reelTimeline(layout: ReelLayout, speed: ReelSpeed, ends: { opening?: boolean; closing?: boolean } = {}): ReelTimeline {
  const { frameHeight } = layout;
  const opening: ScrollEnd = ends.opening === false ? "fade" : "rise";
  const closing: ScrollEnd = ends.closing === false ? "fade" : "rise";
  // The list's first and last screens, kept clear of the faded bands at the frame's top and bottom; a list that fits stays put, centred.
  const margin = REEL_EDGE_FADE + 24;
  const listHeight = layout.listBottom - layout.listTop;
  let first: number;
  let last: number;
  if (listHeight <= frameHeight - margin * 2) {
    first = last = layout.listTop - (frameHeight - listHeight) / 2;
  } else {
    first = layout.listTop - margin;
    last = layout.listBottom + margin - frameHeight;
  }
  // A rising title starts at the top of the strip; a rising closing card ends filling the frame at its foot.
  // Whole rows where the strip is still, so it is crisp; it moves in fractions of a row between.
  const from = Math.round(opening === "rise" ? 0 : first);
  const to = Math.round(closing === "rise" ? layout.height - frameHeight : last);
  const distance = Math.max(0, to - from);
  const pxPerSecond = frameHeight / REEL_CROSS_SECONDS[speed];
  // Each card is lingered on as its middle crosses the reading line.
  const line = readingLine(frameHeight);
  const lingerAt = layout.blocks
    .filter(block => block.kind === "card")
    .map(block => block.top + block.height / 2 - line - from)
    .filter(at => at > 0 && at < distance);
  const pace = paceTable(distance, pxPerSecond, lingerAt);
  const move = distance > 0 ? pace[pace.length - 1]! : 0;
  const ramp = Math.min(REEL_RAMP, move / 2);
  // A list that is faded to and from waits a moment on its screen; one that fits the frame stays long enough to read.
  const pause = distance > 0 ? LIST_PAUSE : LIST_STILL;
  const openDuration = opening === "fade" ? REEL_FADE_SECONDS : 0;
  const closeDuration = closing === "fade" ? REEL_FADE_SECONDS : 0;
  const scrollStart = REEL_HOLD_START + (opening === "fade" ? openDuration + pause : 0);
  const closeStart = scrollStart + move + (closing === "fade" ? pause : 0);
  return {
    from,
    distance,
    opening,
    closing,
    holdStart: REEL_HOLD_START,
    openDuration,
    scrollStart,
    move,
    closeStart,
    closeDuration,
    holdEnd: REEL_HOLD_END,
    total: closeStart + closeDuration + REEL_HOLD_END,
    ramp,
    speed: pxPerSecond,
    pace,
  };
}

/**
 * The strip row at the top of the frame at `t` seconds: still through the
 * opening, then along the run at its pace (see `paceTable`), and still again
 * to the end.
 */
export function reelOffsetAt(t: number, timeline: ReelTimeline): number {
  const { from, distance, move, pace } = timeline;
  const s = t - timeline.scrollStart;
  if (s <= 0 || distance <= 0) return from;
  if (s >= move) return from + distance;
  // The row reached at `s`: the last row whose time is not past it, and the fraction of the way to the next.
  let low = 0;
  let high = pace.length - 1;
  while (high - low > 1) {
    const middle = (low + high) >> 1;
    if (pace[middle]! <= s) low = middle;
    else high = middle;
  }
  const span = pace[high]! - pace[low]!;
  return from + low + (span > 0 ? (s - pace[low]!) / span : 0);
}

/** Eases a 0-1 progress in and out. */
export function reelEase(progress: number): number {
  const p = Math.min(1, Math.max(0, progress));
  return p * p * (3 - 2 * p);
}

/**
 * How much of the frame a faded title card and a faded closing card cover at
 * `t` seconds: 1 is the whole frame, 0 is none. A card that rises is part of
 * the strip instead, so it never covers anything.
 */
export function reelPageCovers(t: number, timeline: ReelTimeline): { title: number; end: number } {
  return {
    title: timeline.opening === "fade" ? 1 - reelEase((t - timeline.holdStart) / timeline.openDuration) : 0,
    end: timeline.closing === "fade" ? reelEase((t - timeline.closeStart) / timeline.closeDuration) : 0,
  };
}

/** The eye's distance from the page, in page widths: near enough to give a swinging page its depth, far enough to keep it from stretching wildly. */
const TURN_EYE = 4;

export type TurnSlice = { sx: number; sw: number; dx: number; dw: number; scale: number };

/**
 * A page hinged on the frame's left edge, swung `angle` radians toward the
 * viewer, as slices to draw: each slice of the flat page (`sx`, `sw`), where it
 * lands across the frame (`dx`, `dw`), and how much taller it is drawn (`scale`,
 * for the nearer, free edge). A flat page (angle 0) maps onto itself.
 */
export function turnSlices(width: number, angle: number, step = 8): TurnSlice[] {
  const eye = width * TURN_EYE;
  const cos = Math.cos(angle);
  const sin = Math.sin(angle);
  const center = width / 2;
  const project = (u: number) => {
    const scale = eye / (eye - u * sin);
    return { x: center + (u * cos - center) * scale, scale };
  };
  const slices: TurnSlice[] = [];
  let from = project(0);
  for (let u = 0; u < width; u += step) {
    const next = Math.min(width, u + step);
    const to = project(next);
    slices.push({ sx: u, sw: next - u, dx: from.x, dw: to.x - from.x, scale: (from.scale + to.scale) / 2 });
    from = to;
  }
  return slices;
}

/** How long a page of tuitions stays, for each tuition on it, at each speed; and the least any page stays. */
export const SLIDE_SECONDS_PER_CARD: Record<ReelSpeed, number> = { slow: 2.5, normal: 1.8, fast: 1.2 };
export const SLIDE_MIN_HOLD = 3;

/**
 * One stretch of a slides video: a page held still, or one page turning (or
 * fading) into another. Pages are numbered as they are shown: 0 is the title
 * card, 1 to n the pages of tuitions, n + 1 the closing card.
 */
export type SlideStep = {
  start: number;
  end: number;
  page: number;
  /** The page it turns into; null while a page is simply held. */
  to: number | null;
  transition: ReelTransition | null;
  /** The page `to` arrives over `page`, like a cover shut, rather than `page` leaving to uncover it. */
  shut: boolean;
};

export type SlidesTimeline = {
  steps: SlideStep[];
  total: number;
  opening: ReelTransition;
  closing: ReelTransition;
};

/**
 * When each page is shown. The title card is held and turns to the first page;
 * each page is held for as long as its tuitions take to read, then turns to the
 * next; the last page is shut under the closing card, which is held. Pages
 * always turn; the two switches choose a turn or a fade only for the title
 * card leaving and the closing card arriving.
 */
export function slidesTimeline(layout: SlidesLayout, speed: ReelSpeed, turns: { opening?: boolean; closing?: boolean } = {}): SlidesTimeline {
  const opening: ReelTransition = turns.opening === false ? "fade" : "turn";
  const closing: ReelTransition = turns.closing === false ? "fade" : "turn";
  const steps: SlideStep[] = [];
  let t = 0;
  const still = (page: number, seconds: number) => {
    steps.push({ start: t, end: t + seconds, page, to: null, transition: null, shut: false });
    t += seconds;
  };
  const change = (page: number, to: number, transition: ReelTransition, shut = false) => {
    const seconds = transition === "turn" ? REEL_TURN_SECONDS[speed] : REEL_FADE_SECONDS;
    steps.push({ start: t, end: t + seconds, page, to, transition, shut });
    t += seconds;
  };

  const count = layout.pages.length;
  still(0, REEL_HOLD_START);
  if (count === 0) {
    change(0, 1, opening);
    still(1, REEL_HOLD_END);
  } else {
    change(0, 1, opening);
    layout.pages.forEach((page, index) => {
      still(index + 1, Math.max(SLIDE_MIN_HOLD, page.cards * SLIDE_SECONDS_PER_CARD[speed]));
      if (index < count - 1) change(index + 1, index + 2, "turn");
    });
    change(count, count + 1, closing, true);
    still(count + 1, REEL_HOLD_END);
  }
  return { steps, total: t, opening, closing };
}

/** The step a slides video is in at `t` seconds, and how far through it (0-1). */
export function slideStepAt(t: number, timeline: SlidesTimeline): { step: SlideStep; progress: number } {
  const last = timeline.steps[timeline.steps.length - 1]!;
  const step = timeline.steps.find(candidate => t < candidate.end) ?? last;
  const length = step.end - step.start;
  return { step, progress: length > 0 ? Math.min(1, Math.max(0, (t - step.start) / length)) : 1 };
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

/** The glowing box: a soft halo in the two glow colours, the body, a hairline edge and a glowing rim. */
function glowBox(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, look: ReelLook) {
  const r = CARD.radius;
  const sweep = ctx.createLinearGradient(x, 0, x + w, 0);
  sweep.addColorStop(0, look.glowA);
  sweep.addColorStop(1, look.glowB);
  ctx.save();
  if (canBlur(ctx)) {
    ctx.filter = "blur(26px)";
    ctx.globalAlpha = look.halo;
    roundedRectPath(ctx, x - 4, y - 4, w + 8, h + 8, r + 4);
    ctx.fillStyle = sweep;
    ctx.fill();
    ctx.filter = "none";
  } else {
    // Without canvas blur (an older Safari) the halo is a coloured shadow instead.
    ctx.shadowColor = withAlpha(look.glowB, look.halo + 0.1);
    ctx.shadowBlur = 44;
    roundedRectPath(ctx, x, y, w, h, r);
    ctx.fillStyle = look.card.fill;
    ctx.fill();
  }
  ctx.restore();
  if (look.shadow) {
    ctx.save();
    ctx.shadowColor = look.shadow;
    ctx.shadowBlur = 40;
    ctx.shadowOffsetY = 14;
    fillRoundedRect(ctx, x, y, w, h, r, look.card.fill);
    ctx.restore();
  }
  fillRoundedRect(ctx, x, y, w, h, r, look.card.fill);
  ctx.save();
  roundedRectPath(ctx, x, y, w, h, r);
  ctx.lineWidth = 1.5;
  ctx.strokeStyle = look.card.border;
  ctx.stroke();
  ctx.globalAlpha = look.rim;
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
  const kind = look.kind[tuition.tutorKind];
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
/** The BTPA seal's side on each frame size: a square frame has the least room. */
const SEAL_SIDE: Record<number, number> = { 1920: 260, 1350: 230, 1080: 190 };
/** The space between the date line and the seal. */
const SEAL_GAP = 48;

/** The seal in the posters' colours: gold on a dark ground, the ground's own ink on a light one. */
function sealColors(look: ReelLook): SealColors {
  return look.dark ? { ring: "#FFC24D", center: "#FFFFFF", detail: "#FFC24D" } : { ring: look.ink, center: look.ink, detail: look.detail };
}

function paintTitle(ctx: CanvasRenderingContext2D, block: TitleBlock, look: ReelLook, input: ReelInput, width: number): CradleMark {
  const center = width / 2;
  const safe = safeFor(block.height);
  const seal = input.badge ? (SEAL_SIDE[block.height] ?? 190) : 0;
  // The seal adds to the stack's height, so the stack moves up by half of it and stays where the eye expects it.
  const middle = block.top + safe.top + (block.height - safe.top - safe.bottom) / 2 - (seal ? (seal + SEAL_GAP) / 2 : 0);
  const markWidth = 104;
  const wordSize = 52;
  const wordWidth = measure(ctx, "Connect ", wordSize, 700, -0.02) + measure(ctx, "Tutors", wordSize, 500, -0.02);
  const brandWidth = markWidth + 20 + wordWidth;
  const brandLeft = center - brandWidth / 2;
  const brandY = middle - 230;
  const mark = { x: brandLeft, y: brandY - (markWidth * 32) / 48 / 2, width: markWidth, ink: look.cradle, lifted: look.lifted };
  drawCradle(ctx, mark.x, mark.y, mark.width, mark.ink, mark.lifted);
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
  if (seal) drawSeal(ctx, center, middle + 140 + 17 + SEAL_GAP + seal / 2, seal, sealColors(look));
  return mark;
}

/** The QR tile's side on each frame size: the closing card has to fit a square frame too. */
const QR_SIDE: Record<number, number> = { 1920: 360, 1350: 320, 1080: 250 };

/** The closing card: "Apply now", the Job Board's QR code and address, the WhatsApp number and the mark. */
function paintEnd(ctx: CanvasRenderingContext2D, block: EndBlock, look: ReelLook, input: ReelInput, width: number): CradleMark {
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
  const safe = safeFor(block.height);
  let y = block.top + safe.top + (block.height - safe.top - safe.bottom - total) / 2;

  drawText(ctx, words.applyNow, center, y + rows.title / 2, { size: short ? 58 : 66, weight: 800, color: look.ink, align: "center", maxWidth: width - SIDE * 2, tracking: -0.01 });
  y += rows.title + (short ? 18 : 28);
  ctx.save();
  if (canBlur(ctx)) {
    ctx.filter = "blur(30px)";
    ctx.globalAlpha = look.dark ? 0.55 : look.halo;
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
  const mark = { x: brandLeft, y: brandY - (markWidth * 32) / 48 / 2, width: markWidth, ink: look.cradle, lifted: look.lifted };
  drawCradle(ctx, mark.x, mark.y, mark.width, mark.ink, mark.lifted);
  drawWordmark(ctx, brandLeft + markWidth + 14, brandY, wordSize, look.ink, look.soft);
  return mark;
}

/**
 * Paints one block where the layout put it. The context may be shifted, to
 * paint into a strip. A title or closing card says where its mark went.
 */
export function paintReelBlock(ctx: CanvasRenderingContext2D, block: ReelBlock, look: ReelLook, input: ReelInput, width: number): CradleMark | undefined {
  if (block.kind === "title") return paintTitle(ctx, block, look, input, width);
  if (block.kind === "area") paintArea(ctx, block, look, width);
  else if (block.kind === "card") paintCard(ctx, block, look, input, width);
  else return paintEnd(ctx, block, look, input, width);
  return undefined;
}

/** The tallest strip a reel is painted in: well inside every browser's canvas limit, Safari's included. */
export const REEL_STRIP_HEIGHT = 4096;
/** Rows each strip is painted beyond its own, top and bottom, so a strip drawn at a fraction of a pixel has its neighbour's rows to blend with at the seam. */
export const REEL_STRIP_PAD = 4;

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

