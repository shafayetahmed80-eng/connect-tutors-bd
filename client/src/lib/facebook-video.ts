import { cityOf, posterDate, type PosterLocale } from "@shared/poster-copy";
import { PUBLIC_SITE_HOST, PUBLIC_SITE_ORIGIN } from "@shared/public-site";
import { MAX_VIDEO_TUITIONS, toPosterTuition, type FacebookPosterJob } from "./facebook-poster";
import {
  layoutReel,
  paintReelBackground,
  paintReelBlock,
  REEL_FPS,
  REEL_SIZES,
  reelLook,
  reelOffsetAt,
  reelStrips,
  reelTimeline,
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
export function prepareReel(input: ReelInput, options: { size: ReelSize; speed: ReelSpeed; ground?: string | null }): PreparedReel | null {
  const { width, height } = REEL_SIZES[options.size];
  const measureCtx = canvasOf(width, 8).getContext("2d");
  if (!measureCtx) return null;
  const look = reelLook(options.ground);
  const layout = layoutReel(measureCtx, input, options.size);

  const background = canvasOf(width, height);
  const backgroundCtx = background.getContext("2d");
  if (!backgroundCtx) return null;
  paintReelBackground(backgroundCtx, width, height, look);

  const strips = reelStrips(layout).map(strip => {
    const canvas = canvasOf(width, strip.height);
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.translate(0, -strip.top);
      for (const block of strip.blocks) paintReelBlock(ctx, block, look, input, width);
    }
    return { top: strip.top, canvas };
  });

  return { width, height, layout, timeline: reelTimeline(layout, options.speed), background, strips, fades: edgeFades(background) };
}

/** How far the list's edges fade into the ground as they meet the top and bottom of the frame. */
const EDGE_FADE = 150;

/** The backdrop's top and bottom bands, each fading out away from its edge. */
function edgeFades(background: HTMLCanvasElement): { top: HTMLCanvasElement; bottom: HTMLCanvasElement } {
  const { width, height } = background;
  const band = (fromTop: boolean) => {
    const canvas = canvasOf(width, EDGE_FADE);
    const ctx = canvas.getContext("2d");
    if (!ctx) return canvas;
    ctx.drawImage(background, 0, fromTop ? 0 : height - EDGE_FADE, width, EDGE_FADE, 0, 0, width, EDGE_FADE);
    ctx.globalCompositeOperation = "destination-in";
    const mask = ctx.createLinearGradient(0, 0, 0, EDGE_FADE);
    mask.addColorStop(0, fromTop ? "rgba(0,0,0,1)" : "rgba(0,0,0,0)");
    mask.addColorStop(1, fromTop ? "rgba(0,0,0,0)" : "rgba(0,0,0,1)");
    ctx.fillStyle = mask;
    ctx.fillRect(0, 0, width, EDGE_FADE);
    return canvas;
  };
  return { top: band(true), bottom: band(false) };
}

/** The same painted reel at another speed: only the timing changes. */
export function withSpeed(reel: PreparedReel, speed: ReelSpeed): PreparedReel {
  return { ...reel, timeline: reelTimeline(reel.layout, speed) };
}

/** Lets the strips go, so a long reel does not hold its memory after the window closes. */
export function releaseReel(reel: PreparedReel | null) {
  if (!reel) return;
  for (const canvas of [reel.background, reel.fades.top, reel.fades.bottom, ...reel.strips.map(strip => strip.canvas)]) {
    canvas.width = 0;
    canvas.height = 0;
  }
}

/** Draws the frame at `t` seconds onto `ctx` (a canvas the reel's size): the backdrop, the visible part of each strip, the edge fades. */
export function drawReelFrame(ctx: CanvasRenderingContext2D, reel: PreparedReel, t: number) {
  const offset = Math.round(reelOffsetAt(t, reel.timeline));
  const { width, height } = reel;
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
