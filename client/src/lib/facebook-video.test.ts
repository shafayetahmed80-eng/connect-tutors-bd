// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { FacebookPosterJob } from "./facebook-poster";
import {
  drawReelFrame,
  formatReelDuration,
  MAX_VIDEO_TUITIONS,
  pickVideoMimeType,
  prepareReel,
  reelInput,
  releaseReel,
  VIDEO_MIME_CANDIDATES,
  videoExtension,
  videoFileName,
  withMotion,
} from "./facebook-video";
import { luminance } from "./poster/palette";
import {
  groupByArea,
  layoutReel,
  REEL_CROSS_SECONDS,
  REEL_DEFAULT_GLOW,
  REEL_DEFAULT_GROUND,
  REEL_FADE_SECONDS,
  REEL_HOLD_END,
  REEL_HOLD_START,
  REEL_LIGHT_NEUTRAL_GLOW,
  REEL_SIZES,
  REEL_STRIP_HEIGHT,
  REEL_TURN_ANGLE,
  REEL_TURN_SECONDS,
  reelGlow,
  reelLook,
  reelOffsetAt,
  reelPageCovers,
  reelStrips,
  reelTimeline,
  reelTitle,
  turnSlices,
} from "./poster/reel";

/** A real-shaped Admin row, private fields included, to prove they never reach the video. */
const job = (id: number, overrides: Partial<FacebookPosterJob> = {}): FacebookPosterJob & { addressDetails: string; instituteName: string } => ({
  id,
  jobId: String(6799 + id),
  learningNeeds: [{ category: "Bangla Medium", curriculumType: null, classes: [{ classCourse: "Class 5", subjects: ["Bangla", "English"] }] }],
  tuitionType: "home",
  tuitionLocationLabel: "Mirpur 10, Dhaka",
  budgetAmount: 9000,
  daysPerWeek: 3,
  tutoringTime: "16:30",
  preferredGender: "female",
  addressDetails: "Road 8/A, House 12",
  instituteName: "Monipur High School",
  ...overrides,
});

type Drawn = { texts: string[]; images: Array<{ args: number[] }> };

/** A 2D context that records what is written and what is copied, enough for every drawing the reel does. */
function mockContext(drawn: Drawn) {
  const noop = () => undefined;
  return {
    font: "",
    letterSpacing: "0px",
    fillStyle: "",
    strokeStyle: "",
    lineWidth: 1,
    lineCap: "butt",
    lineJoin: "miter",
    textAlign: "left",
    textBaseline: "alphabetic",
    globalAlpha: 1,
    globalCompositeOperation: "source-over",
    shadowColor: "",
    shadowBlur: 0,
    save: noop,
    restore: noop,
    translate: noop,
    scale: noop,
    rotate: noop,
    beginPath: noop,
    moveTo: noop,
    lineTo: noop,
    arc: noop,
    arcTo: noop,
    closePath: noop,
    fill: noop,
    stroke: noop,
    fillRect: noop,
    clearRect: noop,
    clip: noop,
    setLineDash: noop,
    createLinearGradient: () => ({ addColorStop: noop }),
    createRadialGradient: () => ({ addColorStop: noop }),
    createPattern: () => ({}),
    createImageData: (w: number, h: number) => ({ data: new Uint8ClampedArray(w * h * 4) }),
    putImageData: noop,
    fillText: (text: string) => drawn.texts.push(text),
    measureText: (text: string) => ({ width: text.length * 14 }),
    drawImage: (...args: unknown[]) => drawn.images.push({ args: args.slice(1).map(Number) }),
  };
}

function withCanvas(drawn: Drawn) {
  vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockImplementation(() => mockContext(drawn) as never);
}

afterEach(() => vi.restoreAllMocks());

const measureCtx = () => mockContext({ texts: [], images: [] }) as unknown as CanvasRenderingContext2D;

describe("what the video says", () => {
  it("files the tuitions under their places in the order each place first appears, as the Area Grouped post does", () => {
    const input = reelInput([
      job(1),
      job(2, { tuitionLocationLabel: "Dhanmondi, Dhaka" }),
      job(3),
      job(4, { tuitionType: "online", tuitionLocationLabel: null }),
    ], "en", null);
    const areas = groupByArea(input.tuitions, "en");

    expect(areas.map(area => [area.label, area.items.map(item => item.jobId), area.count])).toEqual([
      ["Mirpur 10, Dhaka", ["6800", "6802"], "2 tuitions"],
      ["Dhanmondi, Dhaka", ["6801"], "1 tuition"],
      ["Online", ["6803"], "1 tuition"],
    ]);
  });

  it("puts a tuition with no place under Other areas, in the video's language", () => {
    const tuitions = reelInput([job(1, { tuitionLocationLabel: null })], "bn", null).tuitions;
    expect(groupByArea(tuitions, "bn")[0]!.label).toBe("অন্যান্য এলাকা");
    expect(groupByArea(reelInput([job(1, { tuitionLocationLabel: "  " })], "en", null).tuitions, "en")[0]!.label).toBe("Other areas");
  });

  it("titles the opening card with the count, in Bangla digits on a Bangla video", () => {
    expect(reelTitle(6, "bn")).toBe("মোট ৬টি টিউশন");
    expect(reelTitle(1, "en")).toBe("Total 1 tuition");
  });

  it("takes at most thirty tuitions, names the city only when they share one, and leaves out a blank WhatsApp number", () => {
    const many = Array.from({ length: 34 }, (_, index) => job(index + 1));
    const input = reelInput(many, "en", "  ");
    expect(input.tuitions).toHaveLength(MAX_VIDEO_TUITIONS);
    expect(input.city).toBe("Dhaka");
    expect(input.whatsapp).toBeNull();
    expect(reelInput([job(1), job(2, { tuitionLocationLabel: "Agrabad, Chattogram" })], "en", "+8801516131411").city).toBeNull();
  });

  it("draws the title, every tuition, its place, its salary and the closing card - and never the address or the institute", () => {
    const drawn: Drawn = { texts: [], images: [] };
    withCanvas(drawn);
    const reel = prepareReel(reelInput([job(1), job(2, { tuitionLocationLabel: "Dhanmondi, Dhaka", budgetAmount: 15000 })], "en", "+8801516131411"), { size: "reels", speed: "slow" });

    expect(reel).not.toBeNull();
    const all = drawn.texts.join(" | ");
    for (const expected of ["Total 2 tuitions", "# JOB ID 6800", "# JOB ID 6801", "Mirpur 10, Dhaka", "Dhanmondi, Dhaka", "৳ 9,000", "৳ 15,000", "FEMALE TUTOR", "Apply now", "connecttutorsbd.com/job-board", "WhatsApp  +8801516131411"]) {
      expect(all, expected).toContain(expected);
    }
    expect(all).not.toContain("Road 8/A");
    expect(all).not.toContain("Monipur");
  });
});

describe("how the video is laid out", () => {
  it("opens on a title card and ends on a closing card, each a frame tall, with each place before its tuitions", () => {
    const layout = layoutReel(measureCtx(), reelInput([job(1), job(2, { tuitionLocationLabel: "Dhanmondi, Dhaka" }), job(3)], "en", null), "feed");
    const kinds = layout.blocks.map(block => block.kind);

    expect(kinds).toEqual(["title", "area", "card", "card", "area", "card", "end"]);
    expect(layout.blocks[0]).toMatchObject({ top: 0, height: REEL_SIZES.feed.height });
    const end = layout.blocks.at(-1)!;
    expect(end.height).toBe(REEL_SIZES.feed.height);
    expect(layout.height).toBe(end.top + end.height);
    // Nothing overlaps, and every block starts below the one before.
    for (let index = 1; index < layout.blocks.length; index += 1) {
      const before = layout.blocks[index - 1]!;
      expect(layout.blocks[index]!.top).toBeGreaterThanOrEqual(before.top + before.height);
    }
  });

  it("paints in strips no taller than every browser allows, covering the whole list, a block on a seam in both", () => {
    const many = Array.from({ length: 30 }, (_, index) => job(index + 1, { tuitionLocationLabel: index % 3 ? "Mirpur 10, Dhaka" : "Uttara, Dhaka" }));
    const layout = layoutReel(measureCtx(), reelInput(many, "bn", null), "reels");
    const strips = reelStrips(layout);

    expect(strips.every(strip => strip.height <= REEL_STRIP_HEIGHT)).toBe(true);
    expect(strips.reduce((sum, strip) => sum + strip.height, 0)).toBe(layout.height);
    const seam = strips[1]!.top;
    const across = layout.blocks.find(block => block.top < seam && block.top + block.height > seam);
    if (across) {
      expect(strips[0]!.blocks).toContain(across);
      expect(strips[1]!.blocks).toContain(across);
    }
  });
});

describe("how the video moves", () => {
  const manyJobs = Array.from({ length: 12 }, (_, index) => job(index + 1, { tuitionLocationLabel: index % 2 ? "Dhanmondi, Dhaka" : "Mirpur 10, Dhaka" }));
  const long = layoutReel(measureCtx(), reelInput(manyJobs, "en", null), "reels");
  const short = layoutReel(measureCtx(), reelInput([job(1), job(2), job(3)], "en", null), "reels");

  it("holds the title card, turns it away on the list's first screen, rises to the last screen, then shuts the closing card and holds it", () => {
    const timeline = reelTimeline(long, "slow");

    expect(timeline.distance).toBeGreaterThan(0);
    expect(timeline.speed).toBeCloseTo(REEL_SIZES.reels.height / REEL_CROSS_SECONDS.slow);
    expect(timeline.holdStart).toBe(REEL_HOLD_START);
    expect(timeline.opening).toBe("turn");
    expect(timeline.closing).toBe("turn");
    expect(timeline.openDuration).toBe(REEL_TURN_SECONDS.slow);
    expect(timeline.closeDuration).toBe(REEL_TURN_SECONDS.slow);
    // The list sits still on its first screen through the title and the turn, and on its last through the closing card.
    expect(reelOffsetAt(0, timeline)).toBe(timeline.from);
    expect(reelOffsetAt(timeline.holdStart + timeline.openDuration, timeline)).toBe(timeline.from);
    expect(reelOffsetAt(timeline.scrollStart + timeline.move, timeline)).toBeCloseTo(timeline.from + timeline.distance);
    expect(reelOffsetAt(timeline.total, timeline)).toBeCloseTo(timeline.from + timeline.distance);
    expect(timeline.closeStart).toBeGreaterThan(timeline.scrollStart + timeline.move);
    expect(timeline.total).toBeCloseTo(timeline.closeStart + timeline.closeDuration + REEL_HOLD_END);
    // The first screen starts just under the faded band at the top; the last ends just above the one at the bottom.
    expect(long.listTop - timeline.from).toBeGreaterThan(0);
    expect(timeline.from + timeline.distance + long.frameHeight).toBeGreaterThan(long.listBottom);
  });

  it("keeps a list that fits the frame still, centred, between the two cards", () => {
    const timeline = reelTimeline(short, "slow");

    expect(timeline.distance).toBe(0);
    expect(timeline.move).toBe(0);
    const listHeight = short.listBottom - short.listTop;
    expect(short.listTop - timeline.from + listHeight / 2).toBeCloseTo(short.frameHeight / 2);
    expect(reelOffsetAt(timeline.scrollStart + 1, timeline)).toBe(timeline.from);
    // Long enough on screen to be read.
    expect(timeline.closeStart - (timeline.holdStart + timeline.openDuration)).toBeGreaterThanOrEqual(3);
  });

  it("never jumps or goes back: each moment is a little further than the one before", () => {
    const timeline = reelTimeline(long, "normal");
    let previous = reelOffsetAt(0, timeline);
    let largestStep = 0;
    for (let t = 0; t <= timeline.total; t += 1 / 30) {
      const offset = reelOffsetAt(t, timeline);
      expect(offset).toBeGreaterThanOrEqual(previous - 1e-9);
      largestStep = Math.max(largestStep, offset - previous);
      previous = offset;
    }
    // No frame moves further than the steady speed allows.
    expect(largestStep).toBeLessThanOrEqual(timeline.speed / 30 + 1e-6);
  });

  it("turns each card slower on a slow video, and fades in the same softness whatever the speed when the turns are off", () => {
    const totals = (["slow", "normal", "fast"] as const).map(speed => reelTimeline(long, speed).total);
    expect(totals[0]).toBeGreaterThan(totals[1]!);
    expect(totals[1]).toBeGreaterThan(totals[2]!);

    for (const speed of ["slow", "fast"] as const) {
      const faded = reelTimeline(long, speed, { opening: false, closing: false });
      expect(faded.opening).toBe("fade");
      expect(faded.closing).toBe("fade");
      expect(faded.openDuration).toBe(REEL_FADE_SECONDS);
      expect(faded.closeDuration).toBe(REEL_FADE_SECONDS);
    }
    // The two switches are separate.
    const openingOnly = reelTimeline(long, "slow", { closing: false });
    expect([openingOnly.opening, openingOnly.closing]).toEqual(["turn", "fade"]);
  });

  it("says how much of the frame each card covers: the title all of it until it turns, the closing card none until it arrives", () => {
    const timeline = reelTimeline(long, "slow");

    expect(reelPageCovers(0, timeline)).toEqual({ title: 1, end: 0 });
    expect(reelPageCovers(timeline.holdStart, timeline).title).toBe(1);
    expect(reelPageCovers(timeline.holdStart + timeline.openDuration / 2, timeline).title).toBeCloseTo(0.5);
    expect(reelPageCovers(timeline.holdStart + timeline.openDuration, timeline).title).toBe(0);
    expect(reelPageCovers(timeline.closeStart, timeline).end).toBe(0);
    expect(reelPageCovers(timeline.closeStart + timeline.closeDuration / 2, timeline).end).toBeCloseTo(0.5);
    expect(reelPageCovers(timeline.total, timeline)).toEqual({ title: 0, end: 1 });
  });

  it("is only re-timed - not repainted - when the speed or a page turn changes", () => {
    withCanvas({ texts: [], images: [] });
    const reel = prepareReel(reelInput([job(1)], "en", null), { size: "square", speed: "slow" })!;
    const faster = withMotion(reel, { speed: "fast" });
    expect(faster.strips).toBe(reel.strips);
    expect(faster.pages).toBe(reel.pages);
    expect(faster.timeline.total).toBeLessThan(reel.timeline.total);
    const faded = withMotion(reel, { speed: "slow", opening: false, closing: false });
    expect(faded.timeline.opening).toBe("fade");
    expect(faded.timeline.total).toBeLessThan(reel.timeline.total);
    releaseReel(reel);
    expect(reel.strips[0]!.canvas.width).toBe(0);
    expect(reel.pages.title.width).toBe(0);
    expect(reel.scratch.width).toBe(0);
  });
});

describe("how a page turns", () => {
  it("maps a flat page onto itself", () => {
    const slices = turnSlices(1080, 0);

    expect(slices.reduce((sum, slice) => sum + slice.sw, 0)).toBe(1080);
    for (const slice of slices) {
      expect(slice.dx).toBeCloseTo(slice.sx);
      expect(slice.dw).toBeCloseTo(slice.sw);
      expect(slice.scale).toBeCloseTo(1);
    }
  });

  it("keeps the spine on the frame's left edge and every slice in order at any angle up to the last", () => {
    for (const degrees of [10, 30, 55, 80]) {
      const slices = turnSlices(1080, (degrees * Math.PI) / 180);
      expect(slices[0]!.dx).toBeCloseTo(0);
      for (const slice of slices) expect(slice.dw).toBeGreaterThan(0);
      for (let index = 1; index < slices.length; index += 1) expect(slices[index]!.dx).toBeGreaterThanOrEqual(slices[index - 1]!.dx - 1e-9);
    }
  });

  it("swings the free edge toward the spine, nearer the viewer and so taller, and ends a sliver", () => {
    const freeEdge = (angle: number) => {
      const slices = turnSlices(1080, angle);
      const last = slices.at(-1)!;
      return { x: last.dx + last.dw, scale: last.scale };
    };
    const quarter = freeEdge(REEL_TURN_ANGLE / 3);
    const most = freeEdge(REEL_TURN_ANGLE);

    expect(freeEdge(0).x).toBeCloseTo(1080);
    expect(quarter.x).toBeLessThan(1080);
    expect(most.x).toBeLessThan(quarter.x);
    expect(most.x).toBeLessThan(1080 * 0.1);
    expect(most.scale).toBeGreaterThan(quarter.scale);
    expect(quarter.scale).toBeGreaterThan(1);
  });
});

describe("what a frame is made of", () => {
  const prepare = (turns: { opening?: boolean; closing?: boolean } = {}) => {
    const drawn: Drawn = { texts: [], images: [] };
    withCanvas(drawn);
    const reel = prepareReel(reelInput([job(1), job(2), job(3)], "en", null), { size: "reels", speed: "slow", ...turns })!;
    drawn.images.length = 0;
    const ctx = mockContext(drawn) as unknown as CanvasRenderingContext2D;
    return { drawn, reel, ctx };
  };

  it("is only the title card while it is held, and only the closing card at the end", () => {
    const { drawn, reel, ctx } = prepare();

    drawReelFrame(ctx, reel, 0);
    expect(drawn.images).toEqual([{ args: [0, 0] }]);
    drawn.images.length = 0;
    drawReelFrame(ctx, reel, reel.timeline.total);
    expect(drawn.images).toEqual([{ args: [0, 0] }]);
  });

  it("copies only the rows of the list that are in the frame, between the backdrop and the two edge fades", () => {
    const { drawn, reel, ctx } = prepare();
    drawReelFrame(ctx, reel, reel.timeline.scrollStart + 0.1);

    expect(drawn.images).toHaveLength(4);
    expect(drawn.images[1]!.args).toEqual([0, Math.round(reel.timeline.from), 1080, 1920, 0, 0, 1080, 1920]);
  });

  it("lays a turning title card over the list slice by slice, shaded as one, and only the page itself when fading", () => {
    const turned = prepare();
    drawReelFrame(turned.ctx, turned.reel, turned.reel.timeline.holdStart + turned.reel.timeline.openDuration / 2);
    // The list's four draws, a slice for each stretch of the page, and the shaded page laid over them.
    expect(turned.drawn.images.length).toBeGreaterThan(100);
    expect(turned.drawn.images.at(-1)).toEqual({ args: [0, 0] });

    const faded = prepare({ opening: false });
    drawReelFrame(faded.ctx, faded.reel, faded.reel.timeline.holdStart + faded.reel.timeline.openDuration / 2);
    expect(faded.drawn.images).toHaveLength(5);
    expect(faded.drawn.images.at(-1)).toEqual({ args: [0, 0] });
  });

  it("shuts the closing card over the list the same way", () => {
    const { drawn, reel, ctx } = prepare();
    drawReelFrame(ctx, reel, reel.timeline.closeStart + reel.timeline.closeDuration / 2);

    expect(drawn.images.length).toBeGreaterThan(100);
    expect(drawn.images.at(-1)).toEqual({ args: [0, 0] });
  });
});

describe("the colours", () => {
  it("glows red into violet, like the sample, on the video's own ground and on a grey one", () => {
    expect(reelGlow(REEL_DEFAULT_GROUND, true)).toEqual(REEL_DEFAULT_GLOW);
    expect(reelGlow("#777777")).toEqual(REEL_DEFAULT_GLOW);
    expect(reelLook(null).glowA).toBe(REEL_DEFAULT_GLOW[0]);
  });

  it("takes two hues either side of a coloured ground, so the glow follows the colour picked", () => {
    const [a, b] = reelGlow("#0e2442");
    expect(a).not.toBe(b);
    expect([a, b]).not.toEqual(REEL_DEFAULT_GLOW);
    expect(reelGlow("#0b3d2e")).not.toEqual(reelGlow("#0e2442"));
  });

  it("lays white boxes with dark writing on a light ground, and keeps dark boxes with light writing on a dark one", () => {
    const light = reelLook("#e2eef3");
    expect(light.dark).toBe(false);
    expect(light.card.fill).toBe("#ffffff");
    expect(luminance(light.card.ink)).toBeLessThan(0.1);
    expect(light.shadow).not.toBeNull();

    const dark = reelLook("#0e2442");
    expect(dark.dark).toBe(true);
    expect(luminance(dark.card.fill)).toBeLessThan(0.1);
    expect(dark.card.ink).toBe("#ffffff");
    expect(dark.shadow).toBeNull();
    // A light ground's glow is a quiet one.
    expect(light.halo).toBeLessThan(dark.halo);
  });

  it("glows in soft pastels near a light ground's own colour, and in pink into violet on one too near white to have any", () => {
    expect(reelGlow("#fffefa", false, false)).toEqual(REEL_LIGHT_NEUTRAL_GLOW);
    const [a, b] = reelGlow("#f7e3e7", false, false);
    expect(a).not.toBe(b);
    for (const hex of [a, b]) expect(luminance(hex)).toBeGreaterThan(0.35);
  });

  it("gives a white box the Job Board's pale pills", () => {
    expect(reelLook("#e2eef3").kind.female.fill).toBe("#fce7f3");
    expect(reelLook("#0e2442").kind.female.ink).toBe("#f9a8d4");
  });
});

describe("the file", () => {
  it("asks for MP4 first and falls back to WebM, or reports none", () => {
    expect(pickVideoMimeType(() => true)).toBe(VIDEO_MIME_CANDIDATES[0]);
    expect(pickVideoMimeType(type => type.startsWith("video/webm"))).toBe("video/webm;codecs=vp9");
    expect(pickVideoMimeType(() => false)).toBeNull();
    expect(pickVideoMimeType(() => { throw new Error("no"); })).toBeNull();
  });

  it("names the file after what is in it", () => {
    expect(videoExtension("video/mp4;codecs=avc1")).toBe("mp4");
    expect(videoExtension("video/webm")).toBe("webm");
    expect(videoFileName(12, "reels", "bn", "mp4")).toBe("connect-tutors-12-tuitions-reels-bn.mp4");
    expect(videoFileName(1, "square", "en", "webm")).toBe("connect-tutors-1-tuition-square-en.webm");
  });

  it("shows its length as minutes and seconds", () => {
    expect(formatReelDuration(43.4)).toBe("0:43");
    expect(formatReelDuration(72)).toBe("1:12");
    expect(formatReelDuration(-1)).toBe("0:00");
  });
});
