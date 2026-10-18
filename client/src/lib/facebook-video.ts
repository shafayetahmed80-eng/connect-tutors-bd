import { cityOf, posterDate, type PosterLocale } from "@shared/poster-copy";
import { PUBLIC_SITE_HOST, PUBLIC_SITE_ORIGIN } from "@shared/public-site";
import { MAX_VIDEO_TUITIONS, toPosterTuition, type FacebookPosterJob } from "./facebook-poster";
import {
  layoutReel,
  layoutSlides,
  paintReelBackground,
  paintReelBlock,
  REEL_EDGE_FADE,
  REEL_FPS,
  REEL_SIZES,
  REEL_STRIP_PAD,
  REEL_TURN_ANGLE,
  reelEase,
  reelLook,
  reelOffsetAt,
  reelPageCovers,
  reelStrips,
  reelTimeline,
  slidesTimeline,
  slideStepAt,
  turnSlices,
  type ReelBlock,
  type ReelInput,
  type ReelLayout,
  type ReelSize,
  type ReelSpeed,
  type ReelStyle,
  type ReelTimeline,
  type SlidesLayout,
  type SlidesTimeline,
} from "./poster/reel";

export { REEL_DEFAULT_GROUND, REEL_SIZES, type ReelSize, type ReelSpeed, type ReelStyle } from "./poster/reel";

/**
 * The Facebook Posts page's video: the filtered tuitions, Area Grouped, rising
 * up the frame, saved as a video file. Everything happens in the Admin's own
 * browser - drawn on a canvas, recorded by the browser's own MediaRecorder -
 * so making one asks the server for nothing beyond the tuitions it already
 * lists.
 */

export { MAX_VIDEO_TUITIONS };

/** The video's words for these tuitions; the street address and the institute never reach it. */
export function reelInput(jobs: FacebookPosterJob[], locale: PosterLocale, whatsapp: string | null, now = new Date()): ReelInput {
  const shown = jobs.slice(0, MAX_VIDEO_TUITIONS);
  const cities = new Set(shown.map(job => cityOf(job)));
  return {
    locale,
    tuitions: shown.map(job => toPosterTuition(job, locale)),
    city: cities.size === 1 ? Array.from(cities)[0] : null,
    date: posterDate(now, locale),
    url: `${PUBLIC_SITE_ORIGIN}/job-board`,
    boardAddress: `${PUBLIC_SITE_HOST}/job-board`,
    whatsapp: whatsapp?.trim() || null,
  };
}

/** What every painted reel has: its size, its backdrop, the title and closing cards, and how long it runs. */
type ReelBase = {
  width: number;
  height: number;
  background: HTMLCanvasElement;
  /** The title card and the closing card, each a whole frame on the backdrop: what turns away and what shuts. */
  pages: { title: HTMLCanvasElement; end: HTMLCanvasElement };
  /** A frame-sized canvas a page is turned on before it is laid over what it uncovers, so it can be shaded as a whole. */
  scratch: HTMLCanvasElement;
};

/** The list rising up the frame in one run: painted into strips that move over the backdrop. */
export type ScrollReel = ReelBase & {
  style: "scroll";
  layout: ReelLayout;
  timeline: ReelTimeline;
  /** Each strip holds the rows `top` to `top + height` of the list, with a few more painted above and below (`REEL_STRIP_PAD`). */
  strips: Array<{ top: number; height: number; canvas: HTMLCanvasElement }>;
  /**
   * The backdrop's own top and bottom bands, fading from solid at the frame's
   * edge to clear: laid over the list, they melt it into the ground as it
   * enters and leaves, for the price of two small images a frame.
   */
  fades: { top: HTMLCanvasElement; bottom: HTMLCanvasElement };
};

/** The list in pages that turn: each page is painted whole, on the backdrop. */
export type SlidesReel = ReelBase & {
  style: "slides";
  layout: SlidesLayout;
  timeline: SlidesTimeline;
  /** In the order they are shown: the title card, each page of tuitions, the closing card. */
  sheets: HTMLCanvasElement[];
};

/** A reel painted and ready to play. */
export type PreparedReel = ScrollReel | SlidesReel;

function canvasOf(width: number, height: number): HTMLCanvasElement {
  const canvas = document.createElement("canvas");
  canvas.width = width;
  canvas.height = height;
  return canvas;
}

/**
 * Lays the reel out and paints it: the backdrop once, and the list into
 * strips. Null where the browser gives no 2D canvas (a test without one).
 */
export function prepareReel(input: ReelInput, options: { size: ReelSize; speed: ReelSpeed; ground?: string | null; style?: ReelStyle } & ReelTurns): PreparedReel | null {
  const { width, height } = REEL_SIZES[options.size];
  const measureCtx = canvasOf(width, 8).getContext("2d");
  if (!measureCtx) return null;
  const look = reelLook(options.ground);

  const background = canvasOf(width, height);
  const backgroundCtx = background.getContext("2d");
  if (!backgroundCtx) return null;
  paintReelBackground(backgroundCtx, width, height, look);

  // A page is the backdrop with its blocks on it, opaque, so it can swing over what it uncovers.
  const page = (blocks: ReelBlock[]) => {
    const canvas = canvasOf(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(background, 0, 0);
      for (const block of blocks) paintReelBlock(ctx, block, look, input, width);
    }
    return canvas;
  };

  if (options.style === "slides") {
    const layout = layoutSlides(measureCtx, input, options.size);
    const sheets = [page([layout.title]), ...layout.pages.map(slide => page(slide.blocks)), page([layout.end])];
    return {
      style: "slides",
      width,
      height,
      layout,
      timeline: slidesTimeline(layout, options.speed, options),
      background,
      pages: { title: sheets[0]!, end: sheets[sheets.length - 1]! },
      scratch: canvasOf(width, height),
      sheets,
    };
  }

  const layout = layoutReel(measureCtx, input, options.size);
  // The strip holds the title card at its top and the closing card at its foot, so either can rise with the list.
  const strips = reelStrips(layout)
    .filter(strip => strip.blocks.length > 0)
    .map(strip => {
      const canvas = canvasOf(width, strip.height + REEL_STRIP_PAD * 2);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(0, REEL_STRIP_PAD - strip.top);
        for (const block of strip.blocks) paintReelBlock(ctx, block, look, input, width);
      }
      return { top: strip.top, height: strip.height, canvas };
    });
  // Each card is also a page of its own, opaque on the backdrop, for when it fades instead.
  const card = (block: ReelBlock) => page([{ ...block, top: 0 }]);
  const pages = { title: card(layout.blocks[0]!), end: card(layout.blocks[layout.blocks.length - 1]!) };

  return {
    style: "scroll",
    width,
    height,
    layout,
    timeline: reelTimeline(layout, options.speed, options),
    background,
    strips,
    pages,
    scratch: canvasOf(width, height),
    fades: edgeFades(background),
  };
}

/**
 * The Opening and Closing switches: on, the title card leaves and the closing
 * card arrives in motion - rising with the list in a scroll, turned like a
 * book's page in slides - and off, each fades.
 */
export type ReelTurns = { opening?: boolean; closing?: boolean };

/** The backdrop's top and bottom bands, each fading out away from its edge. */
function edgeFades(background: HTMLCanvasElement): { top: HTMLCanvasElement; bottom: HTMLCanvasElement } {
  const { width, height } = background;
  const band = (fromTop: boolean) => {
    const canvas = canvasOf(width, REEL_EDGE_FADE);
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.drawImage(background, 0, fromTop ? 0 : height - REEL_EDGE_FADE, width, REEL_EDGE_FADE, 0, 0, width, REEL_EDGE_FADE);
    ctx.globalCompositeOperation = "destination-in";
    const mask = ctx.createLinearGradient(0, 0, 0, REEL_EDGE_FADE);
    mask.addColorStop(0, fromTop ? "rgba(0,0,0,1)" : "rgba(0,0,0,0)");
    mask.addColorStop(1, fromTop ? "rgba(0,0,0,0)" : "rgba(0,0,0,1)");
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, width, REEL_EDGE_FADE);
    return canvas;
  };
  return { top: band(true), bottom: band(false) };
}

/** The same painted reel at another speed, or with the pages turned or faded: only the timing changes. */
export function withMotion(reel: PreparedReel, motion: { speed: ReelSpeed } & ReelTurns): PreparedReel {
  if (reel.style === "slides") return { ...reel, timeline: slidesTimeline(reel.layout, motion.speed, motion) };
  return { ...reel, timeline: reelTimeline(reel.layout, motion.speed, motion) };
}

/** Lets the painted canvases go, so a long reel does not hold its memory after the window closes. */
export function releaseReel(reel: PreparedReel | null) {
  if (!reel) return;
  const own = reel.style === "slides" ? reel.sheets : [reel.fades.top, reel.fades.bottom, ...reel.strips.map(strip => strip.canvas), reel.pages.title, reel.pages.end];
  for (const canvas of [reel.background, reel.scratch, ...own]) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Which edge of the frame a turning page is hinged on: the left, like a page turned forward; the right, like a book shut from that side. */
export type PageHinge = "left" | "right";

/**
 * A page laid over the frame at `cover` (1 is the whole frame, 0 is gone):
 * swung on one edge of the frame like a book's page, shaded as it turns and
 * casting a shadow on what it uncovers - or, in a fade, just let through.
 */
function drawPage(ctx: CanvasRenderingContext2D, reel: PreparedReel, page: HTMLCanvasElement, cover: number, transition: "turn" | "fade", hinge: PageHinge = "left") {
  const { width, height } = reel;
  if (transition === "fade") {
    ctx.globalAlpha = cover;
    ctx.drawImage(page, 0, 0);
    ctx.globalAlpha = 1;
    return;
  }
  const angle = (1 - cover) * REEL_TURN_ANGLE;
  const sin = Math.sin(angle);
  const slices = turnSlices(width, angle);
  const free = slices[slices.length - 1]!;
  // How far the free edge is from the hinge; on a right hinge every distance is measured in from the right.
  const reach = free.dx + free.dw;
  const right = hinge === "right";
  const freeX = right ? width - reach : reach;

  // The shadow the page casts on what it uncovers, and the one the spine leaves.
  const cast = ctx.createLinearGradient(freeX, 0, right ? freeX - 150 : freeX + 150, 0);
  cast.addColorStop(0, `rgba(0,0,0,${0.3 * sin})`);
  cast.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cast;
  ctx.fillRect(right ? freeX - 150 : freeX, 0, 150, height);
  const spine = ctx.createLinearGradient(right ? width : 0, 0, right ? width - 46 : 46, 0);
  spine.addColorStop(0, `rgba(0,0,0,${0.18 * sin})`);
  spine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(right ? width - 46 : 0, 0, 46, height);

  // The page itself, a slice at a time, drawn apart so it can be shaded as one.
  const scratch = reel.scratch.getContext("2d");
  if (!scratch) return;
  scratch.globalCompositeOperation = "source-over";
  scratch.clearRect(0, 0, width, height);
  for (const slice of slices) {
    const drawn = height * slice.scale;
    // A little wider than its place, toward the free edge, so no seam shows between slices.
    const across = Math.max(1, slice.dw) + 0.75;
    if (right) scratch.drawImage(page, width - slice.sx - slice.sw, 0, slice.sw, height, width - slice.dx - across, (height - drawn) / 2, across, drawn);
    else scratch.drawImage(page, slice.sx, 0, slice.sw, height, slice.dx, (height - drawn) / 2, across, drawn);
  }
  scratch.globalCompositeOperation = "source-atop";
  const shade = scratch.createLinearGradient(right ? width : 0, 0, right ? Math.min(freeX, width - 1) : Math.max(freeX, 1), 0);
  shade.addColorStop(0, "rgba(0,0,0,0)");
  shade.addColorStop(1, `rgba(0,0,0,${0.4 * sin})`);
  scratch.fillStyle = shade;
  scratch.fillRect(0, 0, width, height);
  scratch.globalCompositeOperation = "source-over";
  // The last of the turn is a sliver at the spine; it fades rather than pops.
  ctx.globalAlpha = Math.min(1, cover / 0.15);
  ctx.drawImage(reel.scratch, 0, 0);
  ctx.globalAlpha = 1;
}

/**
 * A slides frame: the page held, or one page turning (or fading) into the
 * next. A page turns away to the left to uncover the next; the closing card
 * instead arrives over the last page from the right, like a book shut.
 */
function drawSlidesFrame(ctx: CanvasRenderingContext2D, reel: SlidesReel, t: number) {
  const { step, progress } = slideStepAt(t, reel.timeline);
  if (step.to === null || step.transition === null) {
    ctx.drawImage(reel.sheets[step.page]!, 0, 0);
    return;
  }
  if (step.shut) {
    ctx.drawImage(reel.sheets[step.page]!, 0, 0);
    // The closing card shuts from the right, like the back of a book.
    drawPage(ctx, reel, reel.sheets[step.to]!, reelEase(progress), step.transition, "right");
    return;
  }
  ctx.drawImage(reel.sheets[step.to]!, 0, 0);
  drawPage(ctx, reel, reel.sheets[step.page]!, 1 - reelEase(progress), step.transition);
}

/**
 * Draws the frame at `t` seconds onto `ctx` (a canvas the reel's size): for a
 * scroll, a faded card whole while it covers the frame, else the backdrop, the
 * visible part of each strip (which carries a rising title and closing card
 * with the list), the edge fades, and a card fading in or out over them; for
 * slides, the page held or turning.
 */
export function drawReelFrame(ctx: CanvasRenderingContext2D, reel: PreparedReel, t: number) {
  if (reel.style === "slides") {
    drawSlidesFrame(ctx, reel, t);
    return;
  }
  const { width, height, timeline } = reel;
  const covers = reelPageCovers(t, timeline);
  if (covers.title >= 1) {
    ctx.drawImage(reel.pages.title, 0, 0);
    return;
  }
  if (covers.end >= 1) {
    ctx.drawImage(reel.pages.end, 0, 0);
    return;
  }
  // The list moves in fractions of a row, so it glides instead of stepping from row to row - most of all as it starts and stops.
  const offset = reelOffsetAt(t, timeline);
  ctx.drawImage(reel.background, 0, 0);
  for (const strip of reel.strips) {
    // A strip owns whole rows of the screen, so no row is drawn by two strips; it reads a row more on each side to blend with, from its padding.
    const ownTop = Math.round(strip.top - offset);
    const ownBottom = Math.round(strip.top + strip.height - offset);
    if (ownBottom <= 0 || ownTop >= height) continue;
    const from = Math.max(Math.floor(offset) - 1, strip.top - REEL_STRIP_PAD);
    const to = Math.min(Math.ceil(offset) + height + 1, strip.top + strip.height + REEL_STRIP_PAD);
    if (to <= from) continue;
    ctx.save();
    ctx.beginPath();
    ctx.rect(0, ownTop, width, ownBottom - ownTop);
    ctx.clip();
    ctx.drawImage(strip.canvas, 0, from - strip.top + REEL_STRIP_PAD, width, to - from, 0, from - offset, width, to - from);
    ctx.restore();
  }
  ctx.drawImage(reel.fades.top, 0, 0);
  ctx.drawImage(reel.fades.bottom, 0, height - reel.fades.bottom.height);
  // Only a faded card is laid over the list; a rising one is part of the strip.
  if (covers.title > 0) drawPage(ctx, reel, reel.pages.title, covers.title, "fade");
  if (covers.end > 0) drawPage(ctx, reel, reel.pages.end, covers.end, "fade");
}

/** "0:43", "1:12". */
export function formatReelDuration(seconds: number): string {
  const whole = Math.max(0, Math.round(seconds));
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, "0")}`;
}

/** What asks for the next frame: the screen's own refresh normally; a timer where the page is not painted (a test, a hidden preview). */
export type FrameScheduler = (callback: (now: number) => void) => void;
const screenFrames: FrameScheduler = callback => {
  requestAnimationFrame(callback);
};
export const timerFrames: FrameScheduler = callback => {
  setTimeout(() => callback(performance.now()), 1000 / REEL_FPS);
};

/**
 * Plays the reel on `canvas` from the start, calling `onFrame` with how far it
 * has got. Time only runs while the page is in view - a hidden tab draws no
 * frames - and a stalled frame moves the list on by at most a fifteenth of a
 * second, so a recording never jumps. Resolves at the end, or when `signal` is
 * aborted.
 */
export function runReel(canvas: HTMLCanvasElement, reel: PreparedReel, options: { signal?: AbortSignal; onFrame?: (seconds: number) => void; tail?: number; schedule?: FrameScheduler } = {}): Promise<boolean> {
  const ctx = canvas.getContext("2d");
  if (!ctx) return Promise.resolve(false);
  const total = reel.timeline.total;
  const tail = options.tail ?? 0;
  const schedule = options.schedule ?? screenFrames;
  return new Promise(resolve => {
    let elapsed = 0;
    let last: number | null = null;
    const tick = (now: number) => {
      if (options.signal?.aborted) {
        resolve(false);
        return;
      }
      if (last !== null && !document.hidden) elapsed += Math.min((now - last) / 1000, 1 / 15);
      last = now;
      const t = Math.min(elapsed, total);
      drawReelFrame(ctx, reel, t);
      options.onFrame?.(t);
      if (elapsed >= total + tail) {
        resolve(true);
        return;
      }
      schedule(tick);
    };
    schedule(tick);
  });
}

/** Video types to ask the browser for, best first: MP4 is what Facebook takes most happily, WebM where there is no MP4. */
export const VIDEO_MIME_CANDIDATES = [
  "video/mp4;codecs=avc1.640028",
  "video/mp4;codecs=avc1.4d0028",
  "video/mp4;codecs=avc1",
  "video/mp4",
  "video/webm;codecs=vp9",
  "video/webm;codecs=vp8",
  "video/webm",
];

/** The first type this browser can record, or null where it records none. */
export function pickVideoMimeType(isSupported: (type: string) => boolean = type => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type)): string | null {
  return VIDEO_MIME_CANDIDATES.find(type => {
    try {
      return isSupported(type);
    } catch {
      return false;
    }
  }) ?? null;
}

/** Whether this browser has the video encoder the file is made with (Chrome and Edge, Safari 16.4 and newer, Firefox 130 and newer). */
function hasVideoEncoder(): boolean {
  return typeof VideoEncoder !== "undefined" && typeof VideoFrame !== "undefined";
}

/** Whether this browser can record the playing canvas live instead: the way older browsers save the video. */
function canRecordLive(): boolean {
  return typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
    && pickVideoMimeType() !== null;
}

/** Whether this browser can make the video file at all. */
export function canRecordVideo(): boolean {
  return hasVideoEncoder() || canRecordLive();
}

export function videoExtension(mimeType: string): "mp4" | "webm" {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/** `connect-tutors-12-tuitions-reels-bn.mp4`, or `…-reels-slides-bn.mp4` for a slides video. */
export function videoFileName(count: number, size: ReelSize, locale: PosterLocale, extension: "mp4" | "webm", style: ReelStyle = "scroll"): string {
  return `connect-tutors-${count}-${count === 1 ? "tuition" : "tuitions"}-${size}${style === "slides" ? "-slides" : ""}-${locale}.${extension}`;
}

/** What the saved video is: its steady frame rate, its bitrate, and how long the last frame is held so a player does not cut the closing card short. */
export const VIDEO_FRAME_RATE = REEL_FPS;
const VIDEO_BITRATE = 8_000_000;
const VIDEO_TAIL = 0.25;

/** How many frames the saved file has for a reel that runs `seconds`. */
export function videoFrameCount(seconds: number): number {
  return Math.ceil((seconds + VIDEO_TAIL) * VIDEO_FRAME_RATE);
}

export type RecordedVideo = { blob: Blob; mimeType: string };
type RecordOptions = { signal?: AbortSignal; onFrame?: (seconds: number) => void; schedule?: FrameScheduler };

/** Lets the window paint and hear a click before the next frames are made. */
const yieldToWindow = () => new Promise<void>(resolve => setTimeout(resolve, 0));

/**
 * Makes the video file frame by frame. Every frame is drawn for its own exact
 * moment, a thirtieth of a second after the one before, and handed to the
 * browser's video encoder with that moment as its time - so the file runs at a
 * steady 30 frames a second however fast or slow this computer draws, and it
 * does not matter whether the window is in view. The result is a plain MP4,
 * with its length and its seek table at the start, which is what Facebook and
 * every player expect.
 *
 * Resolves null if cancelled, and undefined where this browser cannot encode
 * the video (the caller then records the playing preview instead).
 */
async function encodeReel(canvas: HTMLCanvasElement, reel: PreparedReel, options: RecordOptions): Promise<RecordedVideo | null | undefined> {
  if (!hasVideoEncoder()) return undefined;
  const ctx = canvas.getContext("2d");
  if (!ctx) return undefined;
  // The encoder and the file writer are fetched only now, so a visitor's pages and the window itself never carry them.
  const { Output, Mp4OutputFormat, BufferTarget, CanvasSource, canEncodeVideo } = await import("mediabunny");
  if (!(await canEncodeVideo("avc", { width: canvas.width, height: canvas.height, bitrate: VIDEO_BITRATE, frameRate: VIDEO_FRAME_RATE }))) return undefined;

  const output = new Output({ format: new Mp4OutputFormat({ fastStart: "in-memory" }), target: new BufferTarget() });
  const source = new CanvasSource(canvas, { codec: "avc", bitrate: VIDEO_BITRATE, keyFrameInterval: 2 });
  output.addVideoTrack(source, { frameRate: VIDEO_FRAME_RATE });
  await output.start();

  const step = 1 / VIDEO_FRAME_RATE;
  const frames = videoFrameCount(reel.timeline.total);
  try {
    for (let frame = 0; frame < frames; frame += 1) {
      if (options.signal?.aborted) {
        await output.cancel();
        return null;
      }
      const seconds = Math.min(frame * step, reel.timeline.total);
      drawReelFrame(ctx, reel, seconds);
      await source.add(frame * step, step);
      options.onFrame?.(seconds);
      // The window gets a turn now and then, to show the progress and hear Cancel; a hidden one has no screen to paint, so it carries on.
      if (frame % 6 === 5 && !document.hidden) await yieldToWindow();
    }
    if (options.signal?.aborted) {
      await output.cancel();
      return null;
    }
    source.close();
    await output.finalize();
  } catch (error) {
    await output.cancel().catch(() => undefined);
    if (options.signal?.aborted) return null;
    throw error;
  }
  const buffer = output.target.buffer;
  if (!buffer) throw new Error("The video file was not written.");
  return { blob: new Blob([buffer], { type: "video/mp4" }), mimeType: await output.getMimeType() };
}

/**
 * The older way, for a browser with no video encoder: records the preview as it
 * plays. A frame goes to the recording each time one is drawn - not on the
 * recorder's own clock, which would sample the picture between draws and make
 * it shake - and the recording pauses whenever the frames stop coming (a hidden
 * tab, a window minimised or covered), so those seconds are left out rather
 * than recorded as a frozen frame.
 */
async function recordLive(canvas: HTMLCanvasElement, reel: PreparedReel, options: RecordOptions): Promise<RecordedVideo | null> {
  const mimeType = pickVideoMimeType();
  if (!mimeType || typeof canvas.captureStream !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawReelFrame(ctx, reel, 0);
  const stream = canvas.captureStream(0);
  const track = stream.getVideoTracks()[0] as (MediaStreamTrack & { requestFrame?: () => void }) | undefined;
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: VIDEO_BITRATE });
  const parts: Blob[] = [];
  recorder.ondataavailable = event => {
    if (event.data.size > 0) parts.push(event.data);
  };
  const stopped = new Promise<void>(resolve => {
    recorder.onstop = () => resolve();
  });
  const onVisibility = () => {
    if (document.hidden && recorder.state === "recording") recorder.pause();
  };
  document.addEventListener("visibilitychange", onVisibility);
  // No frame for a quarter of a second means the page stopped painting: hold the recording until it paints again.
  let lastFrame = performance.now();
  let lastSent = 0;
  const watchdog = setInterval(() => {
    if (recorder.state === "recording" && performance.now() - lastFrame > 250) recorder.pause();
  }, 100);
  const onFrame = (seconds: number) => {
    const now = performance.now();
    lastFrame = now;
    if (recorder.state === "paused" && !document.hidden) recorder.resume();
    // At most about sixty a second, however fast the screen refreshes.
    if (now - lastSent >= 15) {
      track?.requestFrame?.();
      lastSent = now;
    }
    options.onFrame?.(seconds);
  };
  recorder.start(1000);
  track?.requestFrame?.();
  const finished = await runReel(canvas, reel, { signal: options.signal, onFrame, tail: VIDEO_TAIL, schedule: options.schedule });
  clearInterval(watchdog);
  document.removeEventListener("visibilitychange", onVisibility);
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  for (const each of stream.getTracks()) each.stop();
  if (!finished) return null;
  return { blob: new Blob(parts, { type: mimeType.split(";")[0] }), mimeType };
}

/**
 * Makes the video file for the reel on `canvas`: encoded frame by frame where the
 * browser can (see `encodeReel`), recorded live from the preview where it cannot.
 * Null if it was cancelled or this browser cannot make a video.
 */
export async function recordReel(canvas: HTMLCanvasElement, reel: PreparedReel, options: RecordOptions = {}): Promise<RecordedVideo | null> {
  if (hasVideoEncoder()) {
    try {
      const encoded = await encodeReel(canvas, reel, options);
      if (encoded !== undefined) return encoded;
    } catch (error) {
      console.warn("Encoding the video failed; recording the preview instead.", error);
    }
  }
  if (options.signal?.aborted) return null;
  return recordLive(canvas, reel, options);
}

/** Saves a video through a temporary link. */
export function downloadVideo(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  // The browser reads the file as it saves it; a long video needs more than a few seconds before the link can go.
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
