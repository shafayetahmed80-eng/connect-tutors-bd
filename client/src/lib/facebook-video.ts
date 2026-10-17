import { cityOf, posterDate, type PosterLocale } from "@shared/poster-copy";
import { PUBLIC_SITE_HOST, PUBLIC_SITE_ORIGIN } from "@shared/public-site";
import { MAX_VIDEO_TUITIONS, toPosterTuition, type FacebookPosterJob } from "./facebook-poster";
import {
  layoutReel,
  paintReelBackground,
  paintReelBlock,
  REEL_EDGE_FADE,
  REEL_FPS,
  REEL_SIZES,
  REEL_TURN_ANGLE,
  reelLook,
  reelOffsetAt,
  reelPageCovers,
  reelStrips,
  reelTimeline,
  turnSlices,
  type ReelBlock,
  type ReelInput,
  type ReelLayout,
  type ReelSize,
  type ReelSpeed,
  type ReelTimeline,
} from "./poster/reel";

export { REEL_DEFAULT_GROUND, REEL_SIZES, type ReelSize, type ReelSpeed } from "./poster/reel";

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

/** A reel painted and ready to play: its strips, its backdrop, and how long it runs. */
export type PreparedReel = {
  width: number;
  height: number;
  layout: ReelLayout;
  timeline: ReelTimeline;
  background: HTMLCanvasElement;
  strips: Array<{ top: number; canvas: HTMLCanvasElement }>;
  /** The title card and the closing card, each a whole frame on the backdrop: what turns away and what shuts. */
  pages: { title: HTMLCanvasElement; end: HTMLCanvasElement };
  /** A frame-sized canvas a page is turned on before it is laid over the list, so it can be shaded as a whole. */
  scratch: HTMLCanvasElement;
  /**
   * The backdrop's own top and bottom bands, fading from solid at the frame's
   * edge to clear: laid over the list, they melt it into the ground as it
   * enters and leaves, for the price of two small images a frame.
   */
  fades: { top: HTMLCanvasElement; bottom: HTMLCanvasElement };
};

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
export function prepareReel(input: ReelInput, options: { size: ReelSize; speed: ReelSpeed; ground?: string | null } & ReelTurns): PreparedReel | null {
  const { width, height } = REEL_SIZES[options.size];
  const measureCtx = canvasOf(width, 8).getContext("2d");
  if (!measureCtx) return null;
  const look = reelLook(options.ground);
  const layout = layoutReel(measureCtx, input, options.size);

  const background = canvasOf(width, height);
  const backgroundCtx = background.getContext("2d");
  if (!backgroundCtx) return null;
  paintReelBackground(backgroundCtx, width, height, look);

  // The title and closing cards are pages of their own, so the strips hold only the list - and a strip with none of it is not painted.
  const isList = (block: ReelBlock) => block.kind === "area" || block.kind === "card";
  const strips = reelStrips(layout)
    .filter(strip => strip.blocks.some(isList))
    .map(strip => {
      const canvas = canvasOf(width, strip.height);
      const ctx = canvas.getContext("2d");
      if (ctx) {
        ctx.translate(0, -strip.top);
        for (const block of strip.blocks.filter(isList)) paintReelBlock(ctx, block, look, input, width);
      }
      return { top: strip.top, canvas };
    });

  // A page is the backdrop with its card on it, opaque, so it can swing over the list.
  const page = (block: ReelBlock) => {
    const canvas = canvasOf(width, height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(background, 0, 0);
      ctx.translate(0, -block.top);
      paintReelBlock(ctx, block, look, input, width);
    }
    return canvas;
  };
  const pages = { title: page(layout.blocks[0]!), end: page(layout.blocks[layout.blocks.length - 1]!) };

  return {
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

/** Whether the title card turns away like a book's cover and the closing card shuts like its back cover; otherwise each fades. */
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
  return { ...reel, timeline: reelTimeline(reel.layout, motion.speed, motion) };
}

/** Lets the strips go, so a long reel does not hold its memory after the window closes. */
export function releaseReel(reel: PreparedReel | null) {
  if (!reel) return;
  for (const canvas of [reel.background, reel.fades.top, reel.fades.bottom, reel.pages.title, reel.pages.end, reel.scratch, ...reel.strips.map(strip => strip.canvas)]) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/**
 * A page laid over the frame at `cover` (1 is the whole frame, 0 is gone):
 * swung on the frame's left edge like a book's cover, shaded as it turns and
 * casting a shadow on what it uncovers - or, in a fade, just let through.
 */
function drawPage(ctx: CanvasRenderingContext2D, reel: PreparedReel, page: HTMLCanvasElement, cover: number, transition: "turn" | "fade") {
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
  const freeX = free.dx + free.dw;

  // The shadow the page casts on what it uncovers, and the one the spine leaves.
  const cast = ctx.createLinearGradient(freeX, 0, freeX + 150, 0);
  cast.addColorStop(0, `rgba(0,0,0,${0.3 * sin})`);
  cast.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = cast;
  ctx.fillRect(freeX, 0, 150, height);
  const spine = ctx.createLinearGradient(0, 0, 46, 0);
  spine.addColorStop(0, `rgba(0,0,0,${0.18 * sin})`);
  spine.addColorStop(1, "rgba(0,0,0,0)");
  ctx.fillStyle = spine;
  ctx.fillRect(0, 0, 46, height);

  // The page itself, a slice at a time, drawn apart so it can be shaded as one.
  const scratch = reel.scratch.getContext("2d");
  if (!scratch) return;
  scratch.globalCompositeOperation = "source-over";
  scratch.clearRect(0, 0, width, height);
  for (const slice of slices) {
    const drawn = height * slice.scale;
    // A little wider than its place, so no seam shows between slices.
    scratch.drawImage(page, slice.sx, 0, slice.sw, height, slice.dx, (height - drawn) / 2, Math.max(1, slice.dw) + 0.75, drawn);
  }
  scratch.globalCompositeOperation = "source-atop";
  const shade = scratch.createLinearGradient(0, 0, Math.max(freeX, 1), 0);
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
 * Draws the frame at `t` seconds onto `ctx` (a canvas the reel's size): the title
 * card whole while it is held, else the backdrop, the visible part of each
 * strip, the edge fades, and whichever page is turning (or fading) over them.
 */
export function drawReelFrame(ctx: CanvasRenderingContext2D, reel: PreparedReel, t: number) {
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
  const offset = Math.round(reelOffsetAt(t, timeline));
  ctx.drawImage(reel.background, 0, 0);
  for (const strip of reel.strips) {
    // Only the rows of the strip that fall inside the frame are copied.
    const from = Math.max(0, offset - strip.top);
    const to = Math.min(strip.canvas.height, offset + height - strip.top);
    if (to <= from) continue;
    ctx.drawImage(strip.canvas, 0, from, width, to - from, 0, strip.top + from - offset, width, to - from);
  }
  ctx.drawImage(reel.fades.top, 0, 0);
  ctx.drawImage(reel.fades.bottom, 0, height - reel.fades.bottom.height);
  if (covers.title > 0) drawPage(ctx, reel, reel.pages.title, covers.title, timeline.opening);
  if (covers.end > 0) drawPage(ctx, reel, reel.pages.end, covers.end, timeline.closing);
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

/** Whether this browser can record a canvas at all. */
export function canRecordVideo(): boolean {
  return typeof MediaRecorder !== "undefined"
    && typeof HTMLCanvasElement !== "undefined"
    && typeof HTMLCanvasElement.prototype.captureStream === "function"
    && pickVideoMimeType() !== null;
}

export function videoExtension(mimeType: string): "mp4" | "webm" {
  return mimeType.startsWith("video/mp4") ? "mp4" : "webm";
}

/** `connect-tutors-12-tuitions-reels-bn.mp4`. */
export function videoFileName(count: number, size: ReelSize, locale: PosterLocale, extension: "mp4" | "webm"): string {
  return `connect-tutors-${count}-${count === 1 ? "tuition" : "tuitions"}-${size}-${locale}.${extension}`;
}

/**
 * Records the reel as it plays on `canvas` and returns the video. The
 * recording pauses whenever the frames stop coming - a hidden tab, a window
 * minimised or covered - so those seconds are left out rather than recorded as
 * a frozen frame, and it picks up where it stopped.
 */
export async function recordReel(canvas: HTMLCanvasElement, reel: PreparedReel, options: { signal?: AbortSignal; onFrame?: (seconds: number) => void; schedule?: FrameScheduler } = {}): Promise<{ blob: Blob; mimeType: string } | null> {
  const mimeType = pickVideoMimeType();
  if (!mimeType || typeof canvas.captureStream !== "function") return null;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;
  drawReelFrame(ctx, reel, 0);
  const stream = canvas.captureStream(REEL_FPS);
  const recorder = new MediaRecorder(stream, { mimeType, videoBitsPerSecond: 8_000_000 });
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
  const watchdog = setInterval(() => {
    if (recorder.state === "recording" && performance.now() - lastFrame > 250) recorder.pause();
  }, 100);
  const onFrame = (seconds: number) => {
    lastFrame = performance.now();
    if (recorder.state === "paused" && !document.hidden) recorder.resume();
    options.onFrame?.(seconds);
  };
  recorder.start(1000);
  // A quarter of a second on the last frame, so a player does not cut the closing card short.
  const finished = await runReel(canvas, reel, { signal: options.signal, onFrame, tail: 0.25, schedule: options.schedule });
  clearInterval(watchdog);
  document.removeEventListener("visibilitychange", onVisibility);
  if (recorder.state !== "inactive") recorder.stop();
  await stopped;
  for (const track of stream.getTracks()) track.stop();
  if (!finished) return null;
  return { blob: new Blob(parts, { type: mimeType.split(";")[0] }), mimeType };
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
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}
