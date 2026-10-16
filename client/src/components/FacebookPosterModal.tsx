import React, { useEffect, useRef, useState } from "react";
import { Check, Copy, Download, Image as ImageIcon, Sparkles, X } from "lucide-react";
import { toast } from "sonner";
import {
  copyCanvasImageToClipboard,
  downloadCanvasImage,
  FacebookPosterJob,
  POSTER_THEMES,
  PosterAspectRatio,
  PosterThemeId,
  renderBulkTuitionsPoster,
  renderSingleTuitionPoster,
} from "@/lib/facebook-poster";
import { LoadingCradle } from "@/components/BrandMark";

interface FacebookPosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  job?: FacebookPosterJob | null;
  jobs?: FacebookPosterJob[] | null;
  defaultRatio?: PosterAspectRatio;
}

export function FacebookPosterModal({
  isOpen,
  onClose,
  job,
  jobs,
  defaultRatio = "square",
}: FacebookPosterModalProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [ratio, setRatio] = useState<PosterAspectRatio>(defaultRatio);
  const [theme, setTheme] = useState<PosterThemeId>("navy");
  const [isCopying, setIsCopying] = useState(false);
  const [isCopied, setIsCopied] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);

  const isBulk = Boolean(jobs && jobs.length > 0);
  const currentJobCode = job?.jobId || "tuition";

  // Re-render canvas whenever ratio, theme, or jobs change
  useEffect(() => {
    if (!isOpen || !canvasRef.current) return;
    setIsGenerating(true);

    try {
      if (isBulk && jobs && jobs.length > 0) {
        renderBulkTuitionsPoster(canvasRef.current, jobs, {
          ratio,
          theme,
        });
      } else if (job) {
        renderSingleTuitionPoster(canvasRef.current, job, {
          ratio,
          theme,
        });
      }
    } catch (err) {
      console.error("Poster render error:", err);
      toast.error("পোস্টার তৈরি করতে সমস্যা হয়েছে।");
    } finally {
      setIsGenerating(false);
    }
  }, [isOpen, ratio, theme, job, jobs, isBulk]);

  if (!isOpen) return null;

  const handleCopyImage = async () => {
    if (!canvasRef.current || isCopying) return;
    setIsCopying(true);
    try {
      const ok = await copyCanvasImageToClipboard(canvasRef.current);
      if (ok) {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2500);
        toast.success("ইমেজ ক্লিপবোর্ডে কপি হয়েছে! ফেসবুকে সরাসরি পেস্ট (Ctrl+V) করতে পারবেন।");
      } else {
        toast.info("ব্রাউজার সাপোর্ট না করায় ইমেজ ডাউনলোড করা হচ্ছে...");
        handleDownload();
      }
    } catch {
      toast.error("ইমেজ কপি করতে ব্যর্থ হয়েছে। অনুগ্রহ করে ডাউনলোড করুন।");
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const filename = isBulk
      ? `connect-tutors-bulk-${jobs?.length || 0}-jobs-${ratio}.png`
      : `connect-tutors-${currentJobCode}-${ratio}.png`;
    downloadCanvasImage(canvasRef.current, filename);
    toast.success("পোস্টার ইমেজ সফলভাবে ডাউনলোড হয়েছে!");
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="poster-modal-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-5 bg-slate-900/70 backdrop-blur-xs animate-in fade-in duration-200"
    >
      <div className="relative flex flex-col w-full max-w-4xl max-h-[92vh] rounded-3xl border border-j-border bg-white shadow-2xl overflow-hidden">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-j-border bg-slate-50/80">
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-xl bg-[#1877f2]/10 text-[#1877f2]">
              <ImageIcon className="size-5" />
            </div>
            <div>
              <h2 id="poster-modal-title" className="text-base font-bold text-j-ink">
                {isBulk ? `Facebook Multi-Tuition Banner (${jobs?.length || 0} Tuitions)` : `Facebook Social Poster (${currentJobCode})`}
              </h2>
              <p className="text-2xs text-j-ink-soft">
                উচ্চ রেজোলিউশনের আকর্ষণীয় সোশ্যাল ব্যানার (BTPA-077 ও QR কোড সহ)।
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            aria-label="Close modal"
            className="flex size-8 items-center justify-center rounded-full text-j-ink-soft hover:bg-slate-200 hover:text-j-ink transition"
          >
            <X className="size-4" />
          </button>
        </div>

        {/* Modal Controls Bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 px-6 py-3 border-b border-j-border bg-white text-xs">
          {/* Aspect Ratio Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-j-ink-soft mr-1">সাইজ:</span>
            <button
              type="button"
              onClick={() => setRatio("square")}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                ratio === "square"
                  ? "bg-j-ink text-white shadow-2xs"
                  : "bg-slate-100 text-j-ink-soft hover:bg-slate-200 hover:text-j-ink"
              }`}
            >
              1:1 Square (1080×1080)
            </button>
            <button
              type="button"
              onClick={() => setRatio("landscape")}
              className={`px-3 py-1.5 rounded-lg font-bold transition cursor-pointer ${
                ratio === "landscape"
                  ? "bg-j-ink text-white shadow-2xs"
                  : "bg-slate-100 text-j-ink-soft hover:bg-slate-200 hover:text-j-ink"
              }`}
            >
              16:9 Landscape (1200×675)
            </button>
          </div>

          {/* Theme Selector */}
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-j-ink-soft flex items-center gap-1 mr-1">
              <Sparkles className="size-3.5 text-amber-500" />
              <span>থিম:</span>
            </span>
            {(["navy", "emerald", "crimson"] as PosterThemeId[]).map(tId => {
              const th = POSTER_THEMES[tId];
              return (
                <button
                  key={tId}
                  type="button"
                  onClick={() => setTheme(tId)}
                  className={`px-2.5 py-1 rounded-lg text-2xs font-bold transition cursor-pointer ${
                    theme === tId
                      ? "ring-2 ring-offset-1 ring-j-ink font-extrabold text-white"
                      : "opacity-75 hover:opacity-100 text-white"
                  }`}
                  style={{
                    backgroundColor: tId === "navy" ? "#0f172a" : tId === "emerald" ? "#064e3b" : "#4c0519",
                  }}
                >
                  {tId === "navy" ? "Navy" : tId === "emerald" ? "Emerald" : "Crimson"}
                </button>
              );
            })}
          </div>
        </div>

        {/* Canvas Live Preview Container */}
        <div className="flex-1 overflow-auto p-4 sm:p-6 bg-slate-900/90 flex items-center justify-center min-h-[360px] max-h-[58vh]">
          {isGenerating ? (
            <div className="flex flex-col items-center gap-2 text-white">
              <LoadingCradle className="size-8" />
              <span className="text-xs font-semibold">ব্যানার প্রস্তুত হচ্ছে…</span>
            </div>
          ) : null}
          <canvas
            ref={canvasRef}
            className={`rounded-2xl shadow-2xl max-w-full max-h-[52vh] object-contain border border-white/10 ${
              isGenerating ? "hidden" : "block"
            }`}
            style={{
              aspectRatio: ratio === "square" ? "1 / 1" : "16 / 9",
            }}
          />
        </div>

        {/* Modal Footer Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 px-6 py-4 border-t border-j-border bg-slate-50">
          <div className="flex items-center gap-2 text-2xs text-j-ink-soft">
            <span className="inline-block size-2 rounded-full bg-emerald-500" />
            <span>BTPA-077 সদস্য কোড ও লাইভ QR কোড স্বয়ংক্রিয়ভাবে সংযুক্ত করা হয়েছে।</span>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              type="button"
              onClick={handleCopyImage}
              disabled={isCopying}
              className={`inline-flex items-center justify-center gap-1.5 rounded-xl border px-4 py-2 text-xs font-bold transition shadow-2xs ${
                isCopied
                  ? "border-emerald-600 bg-emerald-50 text-emerald-700"
                  : "border-j-border bg-white text-j-ink hover:bg-slate-100 active:scale-95 disabled:opacity-60"
              }`}
            >
              {isCopying ? (
                <LoadingCradle className="size-3.5" />
              ) : isCopied ? (
                <Check className="size-3.5" />
              ) : (
                <Copy className="size-3.5" />
              )}
              <span>{isCopied ? "Copied Image!" : "Copy Image (ক্লিপবোর্ডে কপি)"}</span>
            </button>

            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-[#1877f2] bg-[#1877f2] px-4 py-2 text-xs font-bold text-white hover:bg-[#166fe5] active:scale-95 transition shadow-2xs cursor-pointer"
            >
              <Download className="size-3.5" />
              <span>Download PNG (ডাউনলোড)</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
