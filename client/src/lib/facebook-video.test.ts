// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { FacebookPosterJob } from "./facebook-poster";
import {
  canRecordVideo,
  drawReelFrame,
  formatReelDuration,
  MAX_VIDEO_TUITIONS,
  pickVideoMimeType,
  prepareReel,
  recordReel,
  reelInput,
  releaseReel,
  VIDEO_FRAME_RATE,
  VIDEO_MIME_CANDIDATES,
  videoExtension,
  videoFileName,
  videoFrameCount,
  withMotion,
} from "./facebook-video";
import { luminance } from "./poster/palette";
import {
  groupByArea,
  layoutReel,
  layoutSlides,
  REEL_CROSS_SECONDS,
  REEL_DEFAULT_GLOW,
  REEL_DEFAULT_GROUND,
  REEL_FADE_SECONDS,
  REEL_HOLD_END,
  REEL_HOLD_START,
  REEL_LIGHT_NEUTRAL_GLOW,
  REEL_SIZES,
  REEL_STRIP_HEIGHT,
  REEL_STRIP_PAD,
  REEL_TURN_ANGLE,
  REEL_TURN_SECONDS,
  SLIDE_MIN_HOLD,
  SLIDE_SECONDS_PER_CARD,
  reelGlow,
  reelLook,
  reelOffsetAt,
  reelPageCovers,
  reelStrips,
  reelTimeline,
  reelTitle,
  slidesTimeline,
  slideStepAt,
  turnSlices,
} from "./poster/reel";

/** What the video encoder and file writer were asked to do: stood in for here, since a test has no encoder. */
const saved = vi.hoisted(() => ({
  adds: [] as Array<{ timestamp: number; duration: number }>,
  started: 0,
  finalized: 0,
  cancelled: 0,
  closed: 0,
  config: null as unknown,
  format: null as unknown,
  failAt: null as number | null,
  canEncode: vi.fn(),
}));

vi.mock("mediabunny", () => ({
  canEncodeVideo: saved.canEncode,
  Mp4OutputFormat: class {
    constructor(options: unknown) {
      saved.format = options;
    }
  },
  BufferTarget: class {
    buffer: ArrayBuffer | null = null;
  },
  CanvasSource: class {
    constructor(_canvas: unknown, config: unknown) {
      saved.config = config;
    }
    async add(timestamp: number, duration: number) {
      if (saved.failAt !== null && saved.adds.length >= saved.failAt) throw new Error("encoder failed");
      saved.adds.push({ timestamp, duration });
    }
    close() {
      saved.closed += 1;
    }
  },
  Output: class {
    target: { buffer: ArrayBuffer | null };
    constructor(options: { target: { buffer: ArrayBuffer | null } }) {
      this.target = options.target;
    }
    addVideoTrack() {}
    async start() {
      saved.started += 1;
    }
    async finalize() {
      saved.finalized += 1;
      this.target.buffer = new ArrayBuffer(16);
    }
    async cancel() {
      saved.cancelled += 1;
    }
    async getMimeType() {
      return 'video/mp4; codecs="avc1.640028"';
    }
  },
}));

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

type Drawn = { texts: string[]; images: Array<{ args: number[] }>; rects?: number[][] };

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
    rect: (...args: number[]) => drawn.rects?.push(args),
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
    // Centred to within the whole row it rests on.
    expect(Math.abs(short.listTop - timeline.from + listHeight / 2 - short.frameHeight / 2)).toBeLessThanOrEqual(0.5);
    expect(Number.isInteger(timeline.from)).toBe(true);
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
    // The frame's rows and one more each side to blend with, from the strip's padding; on a whole row they land on whole rows.
    const from = reel.timeline.from;
    expect(drawn.images[1]!.args).toEqual([0, from - 1 + REEL_STRIP_PAD, 1080, 1922, 0, -1, 1080, 1922]);
  });

  it("moves the list in fractions of a row, so it glides instead of stepping - most of all as it starts and stops", () => {
    const { reel } = prepare();
    if (reel.style !== "scroll") throw new Error("not a scroll");
    const timeline = reelTimeline(layoutReel(measureCtx(), reelInput(Array.from({ length: 12 }, (_, index) => job(index + 1)), "en", null), "reels"), "slow");
    const rows = [];
    for (let t = timeline.scrollStart; t <= timeline.scrollStart + 0.6; t += 1 / 30) rows.push(reelOffsetAt(t, timeline));

    // While it picks up speed each frame is further than the last, by less than a row at first - not 0, 1, 1, 2 rows in whole steps.
    const steps = rows.slice(1).map((row, index) => row - rows[index]!);
    expect(steps.some(step => !Number.isInteger(step))).toBe(true);
    expect(steps.every(step => step >= 0)).toBe(true);
    expect(steps[0]!).toBeLessThan(1);
    for (let index = 1; index < steps.length; index += 1) expect(steps[index]!).toBeGreaterThan(steps[index - 1]! - 1e-9);
  });

  it("draws the list at a fraction of a row, and gives each row of the screen to one strip so a seam between two shows no line", () => {
    const drawn: Drawn = { texts: [], images: [], rects: [] };
    withCanvas(drawn);
    const many = Array.from({ length: 30 }, (_, index) => job(index + 1, { tuitionLocationLabel: `Area ${index % 6}, Dhaka` }));
    const reel = prepareReel(reelInput(many, "en", null), { size: "reels", speed: "slow" })!;
    if (reel.style !== "scroll") throw new Error("not a scroll");
    expect(reel.strips.length).toBeGreaterThan(1);
    const seam = reel.strips[1]!.top;
    // Find the moment the seam is half way up the screen, a little over a whole row in.
    let t = reel.timeline.scrollStart;
    while (reelOffsetAt(t, reel.timeline) < seam - 960 + 0.37 && t < reel.timeline.total) t += 1 / 300;
    expect(reelOffsetAt(t, reel.timeline) % 1).not.toBe(0);
    drawn.images.length = 0;
    drawn.rects!.length = 0;

    drawReelFrame(mockContext(drawn) as unknown as CanvasRenderingContext2D, reel, t);

    const rects = drawn.rects!;
    expect(rects.length).toBeGreaterThanOrEqual(2);
    // Each strip's share of the screen starts on a whole row, exactly where the one before ends.
    for (const [, y, , h] of rects) {
      expect(Number.isInteger(y)).toBe(true);
      expect(Number.isInteger(h)).toBe(true);
    }
    for (let index = 1; index < rects.length; index += 1) expect(rects[index]![1]).toBe(rects[index - 1]![1]! + rects[index - 1]![3]!);
    // ...while the picture itself is drawn at a fraction of a row.
    const strips = drawn.images.filter(image => image.args.length === 8 && image.args[3] !== 1080);
    expect(strips.some(image => !Number.isInteger(image.args[5]!))).toBe(true);
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

describe("how the slides are laid out", () => {
  const inOnePlace = Array.from({ length: 14 }, (_, index) => job(index + 1));
  const inManyPlaces = Array.from({ length: 14 }, (_, index) => job(index + 1, { tuitionLocationLabel: index % 5 === 0 ? "Dhanmondi, Dhaka" : index % 2 ? "Mirpur 10, Dhaka" : "Uttara, Dhaka" }));
  const slidesFor = (jobs: ReturnType<typeof job>[], size: "reels" | "feed" | "square") => layoutSlides(measureCtx(), reelInput(jobs, "en", null), size);
  const cardIds = (layout: ReturnType<typeof slidesFor>) => layout.pages.flatMap(page => page.blocks.flatMap(block => (block.kind === "card" ? [block.tuition.jobId] : [])));

  it("shows every tuition once, in the order of its place, and never a heading alone at the foot of a page", () => {
    const layout = slidesFor(inManyPlaces, "feed");
    const expected = groupByArea(reelInput(inManyPlaces, "en", null).tuitions, "en").flatMap(area => area.items.map(item => item.jobId));

    expect(cardIds(layout)).toEqual(expected);
    for (const page of layout.pages) {
      expect(page.blocks[0]!.kind).toBe("area");
      expect(page.blocks.at(-1)!.kind).toBe("card");
      expect(page.cards).toBe(page.blocks.filter(block => block.kind === "card").length);
    }
  });

  it("holds as many tuitions to a page as the frame takes: more on a tall frame, fewer on a square one", () => {
    const perPage = (size: "reels" | "feed" | "square") => slidesFor(inOnePlace, size).pages.map(page => page.cards);

    expect(perPage("reels")).toEqual([4, 4, 4, 2]);
    expect(perPage("feed")).toEqual([2, 2, 2, 2, 2, 2, 2]);
    expect(perPage("square")).toEqual([2, 2, 2, 2, 2, 2, 2]);
  });

  it("keeps each page's content clear of the frame's edges and in the middle of it", () => {
    for (const size of ["reels", "feed", "square"] as const) {
      const layout = slidesFor(inManyPlaces, size);
      for (const page of layout.pages) {
        const top = Math.min(...page.blocks.map(block => block.top));
        const bottom = Math.max(...page.blocks.map(block => block.top + block.height));
        expect(top).toBeGreaterThanOrEqual(99);
        expect(bottom).toBeLessThanOrEqual(layout.frameHeight - 99);
        expect(Math.abs(top - (layout.frameHeight - bottom))).toBeLessThanOrEqual(1);
      }
    }
  });

  it("says the place again where its tuitions run on to the next page", () => {
    const layout = slidesFor(inOnePlace, "reels");
    const headings = layout.pages.map(page => page.blocks[0]!);

    expect(layout.pages.length).toBeGreaterThan(1);
    for (const heading of headings) expect(heading).toMatchObject({ kind: "area", area: { label: "Mirpur 10, Dhaka" } });
  });

  it("opens with the title card and ends with the closing card, each a frame tall", () => {
    const layout = slidesFor(inOnePlace, "square");
    expect(layout.title).toMatchObject({ kind: "title", top: 0, height: REEL_SIZES.square.height });
    expect(layout.end).toMatchObject({ kind: "end", top: 0, height: REEL_SIZES.square.height });
  });
});

describe("when each slide is shown", () => {
  const input = reelInput(Array.from({ length: 9 }, (_, index) => job(index + 1)), "en", null);
  const layout = layoutSlides(measureCtx(), input, "reels");
  const pageCount = layout.pages.length;

  it("holds the title, turns to the first page, holds each page for as long as its tuitions take to read, turns between them, shuts the last under the closing card and holds it", () => {
    const timeline = slidesTimeline(layout, "slow");
    const { steps } = timeline;

    expect(steps[0]).toMatchObject({ page: 0, to: null, start: 0, end: REEL_HOLD_START });
    expect(steps[1]).toMatchObject({ page: 0, to: 1, transition: "turn", shut: false });
    const holds = steps.filter(step => step.transition === null && step.page >= 1 && step.page <= pageCount);
    expect(holds).toHaveLength(pageCount);
    holds.forEach((step, index) => {
      expect(step.end - step.start).toBeCloseTo(Math.max(SLIDE_MIN_HOLD, layout.pages[index]!.cards * SLIDE_SECONDS_PER_CARD.slow));
    });
    // Between two pages, each turns away to uncover the next.
    const between = steps.filter(step => step.to !== null && step.page >= 1 && step.to <= pageCount);
    expect(between).toHaveLength(pageCount - 1);
    for (const step of between) expect(step).toMatchObject({ transition: "turn", shut: false, to: step.page + 1 });
    expect(steps.at(-2)).toMatchObject({ page: pageCount, to: pageCount + 1, transition: "turn", shut: true });
    expect(steps.at(-1)).toMatchObject({ page: pageCount + 1, to: null });
    expect(steps.at(-1)!.end - steps.at(-1)!.start).toBeCloseTo(REEL_HOLD_END);
    // Nothing is skipped or shown twice.
    steps.slice(1).forEach((step, index) => expect(step.start).toBe(steps[index]!.end));
    expect(timeline.total).toBe(steps.at(-1)!.end);
  });

  it("reads longer on a page of more tuitions, and never less than the least a page stays", () => {
    const timeline = slidesTimeline(layout, "slow");
    const hold = (page: number) => {
      const step = timeline.steps.find(candidate => candidate.page === page && candidate.transition === null)!;
      return step.end - step.start;
    };

    expect(layout.pages[0]!.cards).toBe(4);
    expect(hold(1)).toBeCloseTo(4 * SLIDE_SECONDS_PER_CARD.slow);
    expect(layout.pages.at(-1)!.cards).toBe(1);
    expect(hold(pageCount)).toBeCloseTo(SLIDE_MIN_HOLD);
  });

  it("is shorter at a faster speed", () => {
    const totals = (["slow", "normal", "fast"] as const).map(speed => slidesTimeline(layout, speed).total);
    expect(totals[0]).toBeGreaterThan(totals[1]!);
    expect(totals[1]).toBeGreaterThan(totals[2]!);
  });

  it("fades the title card and the closing card when their turns are off, but always turns the pages between", () => {
    const faded = slidesTimeline(layout, "slow", { opening: false, closing: false });

    expect(faded.opening).toBe("fade");
    expect(faded.closing).toBe("fade");
    expect(faded.steps[1]).toMatchObject({ to: 1, transition: "fade" });
    expect(faded.steps[1]!.end - faded.steps[1]!.start).toBeCloseTo(REEL_FADE_SECONDS);
    expect(faded.steps.at(-2)).toMatchObject({ shut: true, transition: "fade" });
    const between = faded.steps.filter(step => step.to !== null && step.page >= 1 && step.to <= pageCount);
    for (const step of between) expect(step.transition).toBe("turn");
    // The two switches are separate.
    const closingOnly = slidesTimeline(layout, "slow", { opening: false });
    expect([closingOnly.opening, closingOnly.closing]).toEqual(["fade", "turn"]);
  });

  it("finds the step at any moment and how far through it, and stays on the last step after the end", () => {
    const timeline = slidesTimeline(layout, "normal");
    const turn = timeline.steps[1]!;

    expect(slideStepAt(0, timeline)).toMatchObject({ step: timeline.steps[0], progress: 0 });
    const middle = slideStepAt((turn.start + turn.end) / 2, timeline);
    expect(middle.step).toBe(turn);
    expect(middle.progress).toBeCloseTo(0.5);
    const after = slideStepAt(timeline.total + 5, timeline);
    expect(after.step).toBe(timeline.steps.at(-1));
    expect(after.progress).toBe(1);
  });

  it("is only the title and the closing card when there are no tuitions to page", () => {
    const empty = layoutSlides(measureCtx(), reelInput([], "en", null), "reels");
    const timeline = slidesTimeline(empty, "slow");

    expect(empty.pages).toEqual([]);
    expect(timeline.steps.map(step => step.page)).toEqual([0, 0, 1]);
  });
});

describe("what a slides frame is made of", () => {
  const prepare = (turns: { opening?: boolean; closing?: boolean } = {}) => {
    const drawn: Drawn = { texts: [], images: [] };
    withCanvas(drawn);
    const reel = prepareReel(reelInput([job(1), job(2), job(3)], "en", "+8801516131411"), { size: "reels", speed: "slow", style: "slides", ...turns })!;
    const painted = drawn.texts.slice();
    drawn.images.length = 0;
    const ctx = mockContext(drawn) as unknown as CanvasRenderingContext2D;
    return { drawn, reel, ctx, painted };
  };

  it("paints the title, each page of tuitions and the closing card once each, and never the address or the institute", () => {
    const { reel, painted } = prepare();

    expect(reel.style).toBe("slides");
    if (reel.style !== "slides") return;
    expect(reel.sheets).toHaveLength(reel.layout.pages.length + 2);
    expect(reel.pages.title).toBe(reel.sheets[0]);
    expect(reel.pages.end).toBe(reel.sheets.at(-1));
    const all = painted.join(" | ");
    for (const expected of ["Total 3 tuitions", "# JOB ID 6800", "# JOB ID 6802", "Apply now", "WhatsApp  +8801516131411"]) expect(all, expected).toContain(expected);
    expect(painted.filter(text => text === "# JOB ID 6800")).toHaveLength(1);
    expect(all).not.toContain("Road 8/A");
    expect(all).not.toContain("Monipur");
  });

  it("is a single page while one is held", () => {
    const { drawn, reel, ctx } = prepare();

    drawReelFrame(ctx, reel, 0);
    expect(drawn.images).toEqual([{ args: [0, 0] }]);
    drawn.images.length = 0;
    drawReelFrame(ctx, reel, reel.timeline.total);
    expect(drawn.images).toEqual([{ args: [0, 0] }]);
  });

  it("turns a page away over the next one, slice by slice, shaded as one, or lets it fade", () => {
    const turned = prepare();
    const turn = turned.reel.timeline as ReturnType<typeof slidesTimeline>;
    drawReelFrame(turned.ctx, turned.reel, (turn.steps[1]!.start + turn.steps[1]!.end) / 2);
    // The page beneath, a slice for each stretch of the turning page, and the shaded page laid over.
    expect(turned.drawn.images.length).toBeGreaterThan(100);
    expect(turned.drawn.images.at(-1)).toEqual({ args: [0, 0] });

    const faded = prepare({ opening: false });
    const fade = faded.reel.timeline as ReturnType<typeof slidesTimeline>;
    drawReelFrame(faded.ctx, faded.reel, (fade.steps[1]!.start + fade.steps[1]!.end) / 2);
    expect(faded.drawn.images).toHaveLength(2);
  });

  it("shuts the closing card over the last page the same way", () => {
    const { drawn, reel, ctx } = prepare();
    const timeline = reel.timeline as ReturnType<typeof slidesTimeline>;
    const shut = timeline.steps.at(-2)!;
    drawReelFrame(ctx, reel, (shut.start + shut.end) / 2);

    expect(drawn.images.length).toBeGreaterThan(100);
    expect(drawn.images.at(-1)).toEqual({ args: [0, 0] });
  });

  it("is only re-timed - not repainted - when the speed or a page turn changes, and lets every page go when released", () => {
    const { reel } = prepare();
    if (reel.style !== "slides") throw new Error("not slides");
    const faster = withMotion(reel, { speed: "fast" });

    expect(faster.style).toBe("slides");
    if (faster.style !== "slides") return;
    expect(faster.sheets).toBe(reel.sheets);
    expect(faster.timeline.total).toBeLessThan(reel.timeline.total);
    releaseReel(reel);
    for (const sheet of reel.sheets) expect(sheet.width).toBe(0);
    expect(reel.scratch.width).toBe(0);
  });

  it("names the file so a slides video is told from a scrolling one", () => {
    expect(videoFileName(12, "reels", "bn", "mp4")).toBe("connect-tutors-12-tuitions-reels-bn.mp4");
    expect(videoFileName(12, "reels", "bn", "mp4", "slides")).toBe("connect-tutors-12-tuitions-reels-slides-bn.mp4");
    expect(videoFileName(1, "square", "en", "webm", "slides")).toBe("connect-tutors-1-tuition-square-slides-en.webm");
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

describe("saving the video", () => {
  const prepare = () => {
    const drawn: Drawn = { texts: [], images: [] };
    withCanvas(drawn);
    const reel = prepareReel(reelInput([job(1), job(2)], "en", null), { size: "square", speed: "fast" })!;
    const canvas = document.createElement("canvas");
    canvas.width = reel.width;
    canvas.height = reel.height;
    return { reel, canvas, drawn };
  };

  beforeEach(() => {
    saved.adds.length = 0;
    saved.started = 0;
    saved.finalized = 0;
    saved.cancelled = 0;
    saved.closed = 0;
    saved.canEncode.mockResolvedValue(true);
    vi.stubGlobal("VideoEncoder", class {});
    vi.stubGlobal("VideoFrame", class {});
  });

  afterEach(() => vi.unstubAllGlobals());

  it("makes a plain MP4 with a frame every thirtieth of a second, each drawn for its own moment and held for that long", async () => {
    const { reel, canvas } = prepare();
    const moments: number[] = [];

    const video = await recordReel(canvas, reel, { onFrame: seconds => moments.push(seconds) });

    expect(video).not.toBeNull();
    expect(video!.blob.type).toBe("video/mp4");
    expect(video!.mimeType).toContain("avc1");
    expect(videoExtension(video!.mimeType)).toBe("mp4");
    expect(saved.adds).toHaveLength(videoFrameCount(reel.timeline.total));
    expect(saved.adds[0]).toEqual({ timestamp: 0, duration: 1 / VIDEO_FRAME_RATE });
    saved.adds.forEach((add, index) => {
      expect(add.timestamp).toBeCloseTo(index / VIDEO_FRAME_RATE, 9);
      expect(add.duration).toBeCloseTo(1 / VIDEO_FRAME_RATE, 9);
    });
    // The last frame is held a little past the end, so a player does not cut the closing card short.
    expect(saved.adds.at(-1)!.timestamp + saved.adds.at(-1)!.duration).toBeGreaterThanOrEqual(reel.timeline.total + 0.25);
    // Each frame shows its own moment, never past the end of the video.
    moments.forEach((seconds, index) => expect(seconds).toBeCloseTo(Math.min(index / VIDEO_FRAME_RATE, reel.timeline.total), 9));
    expect(saved.started).toBe(1);
    expect(saved.finalized).toBe(1);
    expect(saved.closed).toBe(1);
    expect(saved.config).toMatchObject({ codec: "avc", bitrate: 8_000_000 });
    expect(saved.format).toEqual({ fastStart: "in-memory" });
  });

  it("asks the encoder about the frame size and rate it will be given, and goes no further where it cannot", async () => {
    const { reel, canvas } = prepare();
    saved.canEncode.mockResolvedValueOnce(false);

    // No live recorder either in this browser, so there is nothing to save - but the encoder was never used.
    expect(await recordReel(canvas, reel)).toBeNull();
    expect(saved.canEncode).toHaveBeenCalledWith("avc", { width: reel.width, height: reel.height, bitrate: 8_000_000, frameRate: VIDEO_FRAME_RATE });
    expect(saved.adds).toHaveLength(0);
    expect(saved.started).toBe(0);
  });

  it("stops where it is and writes no file when cancelled", async () => {
    const { reel, canvas } = prepare();
    const controller = new AbortController();

    const video = await recordReel(canvas, reel, { signal: controller.signal, onFrame: seconds => { if (seconds > 1) controller.abort(); } });

    expect(video).toBeNull();
    expect(saved.cancelled).toBe(1);
    expect(saved.finalized).toBe(0);
    expect(saved.adds.length).toBeLessThan(videoFrameCount(reel.timeline.total));
  });

  it("does not wait for the window to be in view: a hidden tab makes the same file", async () => {
    const { reel, canvas } = prepare();
    vi.spyOn(document, "hidden", "get").mockReturnValue(true);

    const video = await recordReel(canvas, reel);

    expect(video).not.toBeNull();
    expect(saved.adds).toHaveLength(videoFrameCount(reel.timeline.total));
  });

  it("leaves the encoder alone in a browser that has none", async () => {
    const { reel, canvas } = prepare();
    vi.unstubAllGlobals();

    expect(canRecordVideo()).toBe(false);
    expect(await recordReel(canvas, reel)).toBeNull();
    expect(saved.canEncode).not.toHaveBeenCalled();
  });

  it("can make a video wherever the encoder is, even with no live recorder", () => {
    expect(canRecordVideo()).toBe(true);
  });

  it("falls back to recording the playing preview when the encoder fails part way", async () => {
    const { reel, canvas } = prepare();
    const warn = vi.spyOn(console, "warn").mockImplementation(() => undefined);
    saved.failAt = 3;

    // No live recorder in this browser either, so the fallback has nothing to save - the point is that it was reached.
    expect(await recordReel(canvas, reel)).toBeNull();
    expect(warn).toHaveBeenCalled();
    expect(saved.cancelled).toBe(1);
    saved.failAt = null;
  });
});
