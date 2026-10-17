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
  withSpeed,
} from "./facebook-video";
import { luminance } from "./poster/palette";
import {
  groupByArea,
  layoutReel,
  REEL_CROSS_SECONDS,
  REEL_DEFAULT_GLOW,
  REEL_DEFAULT_GROUND,
  REEL_HOLD_END,
  REEL_HOLD_START,
  REEL_SIZES,
  REEL_STRIP_HEIGHT,
  reelGlow,
  reelLook,
  reelOffsetAt,
  reelStrips,
  reelTimeline,
  reelTitle,
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
  const layout = layoutReel(measureCtx(), reelInput([job(1), job(2), job(3)], "en", null), "reels");

  it("holds the title, rises at the chosen speed, and holds the closing card", () => {
    const timeline = reelTimeline(layout, "slow");

    expect(timeline.distance).toBe(layout.height - REEL_SIZES.reels.height);
    expect(timeline.speed).toBeCloseTo(REEL_SIZES.reels.height / REEL_CROSS_SECONDS.slow);
    expect(reelOffsetAt(0, timeline)).toBe(0);
    expect(reelOffsetAt(REEL_HOLD_START, timeline)).toBe(0);
    expect(reelOffsetAt(REEL_HOLD_START + timeline.move, timeline)).toBeCloseTo(timeline.distance);
    expect(reelOffsetAt(timeline.total, timeline)).toBe(timeline.distance);
    expect(timeline.total).toBeCloseTo(REEL_HOLD_START + timeline.move + REEL_HOLD_END);
  });

  it("never jumps or goes back: each moment is a little further than the one before", () => {
    const timeline = reelTimeline(layout, "normal");
    let previous = 0;
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

  it("is longer when slower, and only re-timed - not repainted - when the speed alone changes", () => {
    const totals = (["slow", "normal", "fast"] as const).map(speed => reelTimeline(layout, speed).total);
    expect(totals[0]).toBeGreaterThan(totals[1]!);
    expect(totals[1]).toBeGreaterThan(totals[2]!);

    withCanvas({ texts: [], images: [] });
    const reel = prepareReel(reelInput([job(1)], "en", null), { size: "square", speed: "slow" })!;
    const faster = withSpeed(reel, "fast");
    expect(faster.strips).toBe(reel.strips);
    expect(faster.timeline.total).toBeLessThan(reel.timeline.total);
    releaseReel(reel);
    expect(reel.strips[0]!.canvas.width).toBe(0);
  });

  it("copies only the rows of a strip that are in the frame", () => {
    const drawn: Drawn = { texts: [], images: [] };
    withCanvas(drawn);
    const reel = prepareReel(reelInput([job(1), job(2), job(3)], "en", null), { size: "reels", speed: "slow" })!;
    drawn.images.length = 0;
    const ctx = mockContext(drawn) as unknown as CanvasRenderingContext2D;
    drawReelFrame(ctx, reel, 0);

    // The backdrop, one slice of the first strip (the title card), then the two edge fades.
    expect(drawn.images).toHaveLength(4);
    const slice = drawn.images[1]!.args;
    expect(slice).toEqual([0, 0, 1080, 1920, 0, 0, 1080, 1920]);
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

  it("keeps a tuition's box dark with light writing even on a light ground", () => {
    const look = reelLook("#e2eef3");
    expect(look.dark).toBe(false);
    expect(luminance(look.card.fill)).toBeLessThan(0.1);
    expect(look.card.ink).toBe("#ffffff");
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
