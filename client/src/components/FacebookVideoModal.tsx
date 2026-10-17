import { Download, FileText, Play, Square } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { ChoiceRow, PosterColourRow, AUTO, readPrefs, readStoredPrefs, savePrefs, type PosterPrefs } from "@/components/FacebookPosterModal";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { copyToClipboard } from "@/lib/copyToClipboard";
import { autoPosterGround, loadPosterFonts, type FacebookPosterJob, type PosterLocale } from "@/lib/facebook-poster";
import {
  canRecordVideo,
  downloadVideo,
  drawReelFrame,
  formatReelDuration,
  MAX_VIDEO_TUITIONS,
  pickVideoMimeType,
  prepareReel,
  recordReel,
  reelInput,
  releaseReel,
  REEL_DEFAULT_GROUND,
  REEL_SIZES,
  runReel,
  videoExtension,
  videoFileName,
  withMotion,
  type PreparedReel,
  type ReelSize,
  type ReelSpeed,
} from "@/lib/facebook-video";
import { useSiteContact } from "@/lib/siteContent";
import { cn } from "@/lib/utils";

const VIDEO_PREFS_KEY = "connect_tutors_fb_video_prefs_v1";

type VideoPrefs = { size: ReelSize; speed: ReelSpeed; opening: boolean; closing: boolean };
const DEFAULT_VIDEO_PREFS: VideoPrefs = { size: "reels", speed: "slow", opening: true, closing: true };

function readVideoPrefs(): VideoPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(VIDEO_PREFS_KEY) ?? "null") as Partial<VideoPrefs> | null;
    return {
      size: saved?.size === "feed" || saved?.size === "square" ? saved.size : "reels",
      speed: saved?.speed === "normal" || saved?.speed === "fast" ? saved.speed : "slow",
      opening: saved?.opening !== false,
      closing: saved?.closing !== false,
    };
  } catch {
    return DEFAULT_VIDEO_PREFS;
  }
}

function saveVideoPrefs(prefs: VideoPrefs) {
  try {
    localStorage.setItem(VIDEO_PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // A private window may refuse storage; the choice just is not remembered.
  }
}

type Mode = "idle" | "playing" | "recording";

/**
 * The Facebook video: the tuitions the page found, Area Grouped, rising up the
 * frame, in the poster's language and ground colour (the two are shared with
 * the poster window, so a colour picked there is here too). Play shows it in
 * the window; Download video records it and saves the file.
 */
export default function FacebookVideoModal({ onClose, jobs, caption }: {
  onClose: () => void;
  jobs: FacebookPosterJob[];
  /** The Area Grouped text post for the tuitions the video shows. */
  caption?: (shown: number) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const reelRef = useRef<PreparedReel | null>(null);
  const runRef = useRef<AbortController | null>(null);
  const [posterPrefs, setPosterPrefs] = useState<PosterPrefs>(readPrefs);
  const [videoPrefs, setVideoPrefs] = useState<VideoPrefs>(readVideoPrefs);
  const [fontsReady, setFontsReady] = useState(false);
  const [reel, setReel] = useState<PreparedReel | null>(null);
  const [mode, setMode] = useState<Mode>("idle");
  const [seconds, setSeconds] = useState(0);
  const contact = useSiteContact();

  const shown = jobs.slice(0, MAX_VIDEO_TUITIONS);
  const locale = posterPrefs.locale;
  const resolvedAuto = autoPosterGround(shown);
  const ground = posterPrefs.ground === AUTO ? resolvedAuto : posterPrefs.ground;
  const { width, height } = REEL_SIZES[videoPrefs.size];
  const whatsapp = contact.number ? contact.display : null;

  const updatePoster = (patch: Partial<PosterPrefs>) => {
    setPosterPrefs(current => {
      const next = { ...(readStoredPrefs() ?? current), ...patch };
      savePrefs(next);
      return next;
    });
  };
  const updateVideo = (patch: Partial<VideoPrefs>) => {
    setVideoPrefs(current => {
      const next = { ...current, ...patch };
      saveVideoPrefs(next);
      return next;
    });
  };

  /** Stops whatever is playing or recording, and puts the opening frame back. */
  const stop = () => {
    runRef.current?.abort();
    runRef.current = null;
    setMode("idle");
    setSeconds(0);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext("2d");
    if (ctx && reelRef.current) drawReelFrame(ctx, reelRef.current, 0);
  };

  useEffect(() => {
    let alive = true;
    void loadPosterFonts(4000).then(() => {
      if (alive) setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, []);

  // Painted again whenever what it shows changes; the speed and the page turns only re-time it (below).
  const jobKey = shown.map(job => job.id).join(",");
  useEffect(() => {
    if (!fontsReady) return;
    runRef.current?.abort();
    runRef.current = null;
    setMode("idle");
    setSeconds(0);
    let prepared: PreparedReel | null = null;
    try {
      prepared = prepareReel(reelInput(shown, locale, whatsapp), { size: videoPrefs.size, speed: videoPrefs.speed, opening: videoPrefs.opening, closing: videoPrefs.closing, ground });
    } catch (error) {
      console.error("Video render failed", error);
      toast.error("ভিডিও তৈরি করতে সমস্যা হয়েছে।");
    }
    releaseReel(reelRef.current);
    reelRef.current = prepared;
    setReel(prepared);
    const canvas = canvasRef.current;
    if (canvas && prepared) {
      canvas.width = prepared.width;
      canvas.height = prepared.height;
      const ctx = canvas.getContext("2d");
      if (ctx) drawReelFrame(ctx, prepared, 0);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps -- `shown` is read through its ids
  }, [fontsReady, jobKey, locale, videoPrefs.size, ground, whatsapp]);

  useEffect(() => {
    const current = reelRef.current;
    if (!current) return;
    const timed = withMotion(current, { speed: videoPrefs.speed, opening: videoPrefs.opening, closing: videoPrefs.closing });
    reelRef.current = timed;
    setReel(timed);
  }, [videoPrefs.speed, videoPrefs.opening, videoPrefs.closing]);

  // Closing the window stops a recording and lets the painted strips go.
  useEffect(() => () => {
    runRef.current?.abort();
    releaseReel(reelRef.current);
    reelRef.current = null;
  }, []);

  /** Reports progress four times a second rather than every frame. */
  const progress = (t: number) => setSeconds(current => (Math.floor(t * 4) === Math.floor(current * 4) ? current : t));

  const handlePlay = async () => {
    const canvas = canvasRef.current;
    // The same button stops a preview and cancels a recording.
    if (mode !== "idle") {
      stop();
      return;
    }
    if (!canvas || !reelRef.current || mode !== "idle") return;
    const controller = new AbortController();
    runRef.current = controller;
    setMode("playing");
    await runReel(canvas, reelRef.current, { signal: controller.signal, onFrame: progress });
    if (runRef.current === controller) {
      runRef.current = null;
      setMode("idle");
    }
  };

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    const current = reelRef.current;
    if (!canvas || !current || mode === "recording") return;
    if (!canRecordVideo()) {
      toast.error("এই ব্রাউজারে ভিডিও বানানো যায় না। কম্পিউটারের Chrome বা Edge-এ চেষ্টা করুন।");
      return;
    }
    runRef.current?.abort();
    const controller = new AbortController();
    runRef.current = controller;
    setMode("recording");
    setSeconds(0);
    try {
      const result = await recordReel(canvas, current, { signal: controller.signal, onFrame: progress });
      if (result) {
        downloadVideo(result.blob, videoFileName(shown.length, videoPrefs.size, locale, videoExtension(result.mimeType)));
        toast.success("ভিডিও ডাউনলোড হয়েছে।");
      } else if (!controller.signal.aborted) {
        toast.error("ভিডিও তৈরি করা যায়নি।");
      }
    } catch (error) {
      console.error("Video recording failed", error);
      toast.error("ভিডিও তৈরি করা যায়নি।");
    } finally {
      if (runRef.current === controller) stop();
    }
  };

  const handleCopyCaption = async () => {
    if (!caption) return;
    const copied = await copyToClipboard(caption(shown.length));
    if (copied) toast.success("ক্যাপশন কপি হয়েছে। ভিডিওর সাথে পেস্ট করুন।");
    else toast.error("ক্যাপশন কপি করা যায়নি।");
  };

  const total = reel?.timeline.total ?? 0;
  const busy = mode === "recording";
  const extension = videoExtension(pickVideoMimeType() ?? "video/webm").toUpperCase();
  const sizeOptions: Array<{ value: ReelSize; label: string; detail: string }> = [
    { value: "reels", label: "Reels", detail: "1080×1920" },
    { value: "feed", label: "Feed", detail: "1080×1350" },
    { value: "square", label: "Square", detail: "1080×1080" },
  ];
  const onOffOptions: Array<{ value: "on" | "off"; label: string }> = [
    { value: "on", label: "On" },
    { value: "off", label: "Off" },
  ];
  const speedOptions: Array<{ value: ReelSpeed; label: string }> = [
    { value: "slow", label: "Slow" },
    { value: "normal", label: "Normal" },
    { value: "fast", label: "Fast" },
  ];

  return (
    <Modal onClose={onClose} busy={busy} kind="facebook-video">
      <ModalHeader
        title="Facebook Video"
        meta={`${shown.length} ${shown.length === 1 ? "tuition" : "tuitions"}${reel ? ` · ${mode === "idle" ? "" : `${formatReelDuration(seconds)} / `}${formatReelDuration(total)}` : ""}`}
      />
      <ModalBody className="max-sm:pt-0">
        <div className="flex flex-col">
          <div className="order-1 max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:-mx-4 max-sm:bg-background max-sm:px-4 max-sm:py-3 sm:order-2 sm:mt-4">
            <div className="flex justify-center rounded-2xl border border-j-border bg-j-border-light/40 p-3">
              <canvas
                ref={canvasRef}
                width={width}
                height={height}
                role="img"
                aria-label="Facebook video preview"
                className={cn("h-auto w-auto max-w-full rounded-lg shadow-sm max-sm:max-h-[46dvh]", videoPrefs.size === "reels" ? "sm:max-h-[60vh]" : "sm:max-h-[52vh]")}
                style={{ aspectRatio: `${width} / ${height}` }}
              />
            </div>
            {mode !== "idle" && total > 0 ? (
              <div role="progressbar" aria-label={busy ? "Recording" : "Playing"} aria-valuemin={0} aria-valuemax={100} aria-valuenow={Math.round((seconds / total) * 100)} className="mt-2 h-1 overflow-hidden rounded-full bg-j-border-light">
                <div className="h-full rounded-full bg-[#1877f2] transition-[width] duration-200" style={{ width: `${Math.min(100, (seconds / total) * 100)}%` }} />
              </div>
            ) : null}
          </div>
          <fieldset disabled={busy} className="order-3 mt-3 space-y-3 disabled:opacity-60 sm:order-1 sm:mt-0 sm:space-y-2.5">
            <ChoiceRow label="Language" value={locale} options={[{ value: "bn" as PosterLocale, label: "বাংলা" }, { value: "en" as PosterLocale, label: "English" }]} onChange={next => updatePoster({ locale: next })} />
            <ChoiceRow label="Size" value={videoPrefs.size} options={sizeOptions} onChange={size => updateVideo({ size })} />
            <ChoiceRow label="Speed" value={videoPrefs.speed} options={speedOptions} onChange={speed => updateVideo({ speed })} />
            <ChoiceRow label="Opening" value={videoPrefs.opening ? "on" : "off"} options={onOffOptions} onChange={next => updateVideo({ opening: next === "on" })} />
            <ChoiceRow label="Closing" value={videoPrefs.closing ? "on" : "off"} options={onOffOptions} onChange={next => updateVideo({ closing: next === "on" })} />
            <PosterColourRow ground={posterPrefs.ground} defaultGround={REEL_DEFAULT_GROUND} resolvedAuto={resolvedAuto} onChange={next => updatePoster({ ground: next })} />
          </fieldset>
        </div>
      </ModalBody>
      <ModalFooter>
        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {caption ? (
            <button
              type="button"
              onClick={handleCopyCaption}
              className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-4 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60"
            >
              <FileText className="size-3.5" strokeWidth={1.5} />
              Copy caption
            </button>
          ) : null}
          <button
            type="button"
            onClick={handlePlay}
            disabled={!reel}
            aria-pressed={mode === "playing"}
            className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-4 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60 disabled:opacity-60"
          >
            {mode === "idle" ? <Play className="size-3.5" strokeWidth={1.5} /> : <Square className="size-3.5" strokeWidth={1.5} />}
            {mode === "recording" ? "Cancel" : mode === "playing" ? "Stop" : "Play"}
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={!reel || busy}
            className={cn(
              "inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-[#1877f2] bg-[#1877f2] px-4 text-xs font-bold text-white transition hover:bg-[#166fe5] disabled:opacity-60",
              caption && "col-span-2 sm:col-span-1",
            )}
          >
            <Download className="size-3.5" strokeWidth={1.5} />
            {busy ? `Recording… ${total > 0 ? Math.round((seconds / total) * 100) : 0}%` : `Download ${extension}`}
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
