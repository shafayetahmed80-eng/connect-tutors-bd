import { Copy, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { JobIdTag } from "@/components/JobIdTag";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import {
  COMBINED_POSTER_THEMES,
  copyCanvasImageToClipboard,
  downloadCanvasImage,
  loadPosterFonts,
  MAX_COMBINED_TUITIONS,
  posterFileName,
  renderCombinedTuitionsPoster,
  renderSingleTuitionPoster,
  SINGLE_POSTER_THEMES,
  type CombinedPosterTheme,
  type FacebookPosterJob,
  type PosterLocale,
  type PosterSize,
  type SinglePosterTheme,
} from "@/lib/facebook-poster";
import { cn } from "@/lib/utils";

const PREFS_KEY = "connect_tutors_fb_poster_prefs_v1";

type PosterPrefs = { locale: PosterLocale; size: PosterSize; singleTheme: SinglePosterTheme; combinedTheme: CombinedPosterTheme };

const DEFAULT_PREFS: PosterPrefs = { locale: "bn", size: "square", singleTheme: "navy", combinedTheme: "navy" };

function readPrefs(): PosterPrefs {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<PosterPrefs> | null;
    if (!saved) return DEFAULT_PREFS;
    return {
      locale: saved.locale === "en" ? "en" : "bn",
      size: saved.size === "landscape" ? "landscape" : "square",
      singleTheme: SINGLE_POSTER_THEMES.includes(saved.singleTheme as SinglePosterTheme) ? (saved.singleTheme as SinglePosterTheme) : "navy",
      combinedTheme: COMBINED_POSTER_THEMES.includes(saved.combinedTheme as CombinedPosterTheme) ? (saved.combinedTheme as CombinedPosterTheme) : "navy",
    };
  } catch {
    return DEFAULT_PREFS;
  }
}

function savePrefs(prefs: PosterPrefs) {
  try {
    localStorage.setItem(PREFS_KEY, JSON.stringify(prefs));
  } catch {
    // A private window may refuse storage; the choice just is not remembered.
  }
}

const THEME_LABELS: Record<SinglePosterTheme | CombinedPosterTheme, { label: string; swatch: string }> = {
  navy: { label: "Navy", swatch: "#0E2442" },
  cream: { label: "Cream", swatch: "#FFFEFA" },
  emerald: { label: "Emerald", swatch: "#0B3D2E" },
  crimson: { label: "Crimson", swatch: "#A3122F" },
};

/** One labelled row of choices, read by a screen reader as a radio group. */
function ChoiceRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; swatch?: string }>; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="w-20 shrink-0 text-xs font-semibold text-j-ink-soft">{label}</span>
      <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
        {options.map(option => {
          const selected = option.value === value;
          return (
            <button
              key={option.value}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => onChange(option.value)}
              className={cn(
                "inline-flex h-control items-center gap-2 rounded-xl border px-3.5 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40",
                selected ? "border-[#1877f2] bg-[#1877f2] text-white" : "border-j-border bg-white text-j-ink hover:bg-j-border-light/60",
              )}
            >
              {option.swatch ? <span aria-hidden="true" className="size-3.5 rounded-full border border-black/15" style={{ backgroundColor: option.swatch }} /> : null}
              {option.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function FacebookPosterModal({ isOpen, onClose, job, jobs }: { isOpen: boolean; onClose: () => void; job?: FacebookPosterJob | null; jobs?: FacebookPosterJob[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefs, setPrefs] = useState<PosterPrefs>(readPrefs);
  const [fontsReady, setFontsReady] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const combinedJobs = jobs?.slice(0, MAX_COMBINED_TUITIONS) ?? [];
  const isCombined = combinedJobs.length > 0;
  const theme = isCombined ? prefs.combinedTheme : prefs.singleTheme;

  const update = (patch: Partial<PosterPrefs>) => {
    setPrefs(current => {
      const next = { ...current, ...patch };
      savePrefs(next);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen || fontsReady) return;
    let alive = true;
    void loadPosterFonts().then(() => {
      if (alive) setFontsReady(true);
    });
    return () => {
      alive = false;
    };
  }, [isOpen, fontsReady]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isOpen || !canvas) return;
    try {
      if (isCombined) renderCombinedTuitionsPoster(canvas, combinedJobs, { theme: prefs.combinedTheme, size: prefs.size, locale: prefs.locale });
      else if (job) renderSingleTuitionPoster(canvas, job, { theme: prefs.singleTheme, size: prefs.size, locale: prefs.locale });
    } catch (error) {
      console.error("Poster render failed", error);
      toast.error("পোস্টার তৈরি করতে সমস্যা হয়েছে।");
    }
    // combinedJobs is derived from jobs on every render; jobs is the real input.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, fontsReady, prefs, job, jobs, isCombined]);

  if (!isOpen || (!job && !isCombined)) return null;

  const fileName = isCombined
    ? posterFileName({ count: combinedJobs.length }, theme, prefs.locale, prefs.size)
    : posterFileName({ jobId: job!.jobId }, theme, prefs.locale, prefs.size);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;
    setIsSaving(true);
    const saved = await downloadCanvasImage(canvas, fileName);
    setIsSaving(false);
    if (saved) toast.success("পোস্টার ডাউনলোড হয়েছে।");
    else toast.error("পোস্টারের ছবি তৈরি করা যায়নি।");
  };

  const handleCopy = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isCopying) return;
    setIsCopying(true);
    const result = await copyCanvasImageToClipboard(canvas);
    setIsCopying(false);
    if (result === "copied") {
      toast.success("ছবি কপি হয়েছে। Facebook-এ পেস্ট করুন।");
      return;
    }
    if (result === "unsupported") {
      toast.info("এই ব্রাউজার ছবি কপি করতে পারে না, তাই ছবিটা ডাউনলোড হচ্ছে।");
      await handleDownload();
      return;
    }
    toast.error("ছবি কপি করা যায়নি। ডাউনলোড করে নিন।");
  };

  const themeOptions = (isCombined ? COMBINED_POSTER_THEMES : SINGLE_POSTER_THEMES).map(id => ({ value: id, ...THEME_LABELS[id] }));

  return (
    <Modal onClose={onClose} kind="facebook-poster">
      <ModalHeader
        title={isCombined ? "Facebook Multi-Tuition Banner" : "Facebook Poster"}
        meta={isCombined ? `${combinedJobs.length} ${combinedJobs.length === 1 ? "tuition" : "tuitions"}` : <JobIdTag jobId={job!.jobId} colon={false} copyable={false} />}
      />
      <ModalBody>
        <div className="space-y-2.5">
          <ChoiceRow label="Language" value={prefs.locale} options={[{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }]} onChange={locale => update({ locale })} />
          <ChoiceRow label="Size" value={prefs.size} options={[{ value: "square", label: "Square 1080×1080" }, { value: "landscape", label: "Landscape 1200×675" }]} onChange={size => update({ size })} />
          <ChoiceRow
            label="Theme"
            value={theme}
            options={themeOptions}
            onChange={next => (isCombined ? update({ combinedTheme: next as CombinedPosterTheme }) : update({ singleTheme: next as SinglePosterTheme }))}
          />
        </div>
        <div className="mt-4 flex justify-center rounded-2xl border border-j-border bg-j-border-light/40 p-3">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={isCombined ? "Multi-tuition poster preview" : `Poster preview for job ${job!.jobId}`}
            className="h-auto max-h-[52vh] w-auto max-w-full rounded-lg shadow-sm"
            style={{ aspectRatio: prefs.size === "square" ? "1 / 1" : "16 / 9" }}
          />
        </div>
      </ModalBody>
      <ModalFooter>
        <button
          type="button"
          onClick={handleCopy}
          disabled={isCopying}
          className="inline-flex h-control items-center gap-1.5 rounded-xl border border-j-border bg-white px-4 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60 disabled:opacity-60"
        >
          <Copy className="size-3.5" strokeWidth={1.5} />
          Copy image
        </button>
        <button
          type="button"
          onClick={handleDownload}
          disabled={isSaving}
          className="inline-flex h-control items-center gap-1.5 rounded-xl border border-[#1877f2] bg-[#1877f2] px-4 text-xs font-bold text-white transition hover:bg-[#166fe5] disabled:opacity-60"
        >
          <Download className="size-3.5" strokeWidth={1.5} />
          Download PNG
        </button>
      </ModalFooter>
    </Modal>
  );
}
