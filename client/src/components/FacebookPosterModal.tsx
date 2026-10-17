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
  MAX_TALL_TUITIONS,
  MIST_DEFAULT_GROUND,
  normalizeHex,
  posterDimensions,
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

type PosterPrefs = {
  locale: PosterLocale;
  size: PosterSize;
  singleTheme: SinglePosterTheme;
  combinedTheme: CombinedPosterTheme;
  /** The ground colour the Admin picked, or null for the design's own colours. */
  ground: string | null;
};

const DEFAULT_PREFS: PosterPrefs = { locale: "bn", size: "square", singleTheme: "navy", combinedTheme: "navy", ground: null };

/** What is stored, or null when nothing is or the browser will not say (a private window). */
function readStoredPrefs(): PosterPrefs | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<PosterPrefs> | null;
    if (!saved) return null;
    return {
      locale: saved.locale === "en" ? "en" : "bn",
      size: saved.size === "landscape" || saved.size === "tall" ? saved.size : "square",
      singleTheme: SINGLE_POSTER_THEMES.includes(saved.singleTheme as SinglePosterTheme) ? (saved.singleTheme as SinglePosterTheme) : "navy",
      combinedTheme: COMBINED_POSTER_THEMES.includes(saved.combinedTheme as CombinedPosterTheme) ? (saved.combinedTheme as CombinedPosterTheme) : "navy",
      ground: typeof saved.ground === "string" ? normalizeHex(saved.ground) : null,
    };
  } catch {
    return null;
  }
}

const readPrefs = () => readStoredPrefs() ?? DEFAULT_PREFS;

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
  mist: { label: "Mist", swatch: MIST_DEFAULT_GROUND },
};

/** Colours to start from: deep ones first, then light ones. Anything else is the Custom swatch. */
const GROUND_PRESETS: Array<{ label: string; hex: string }> = [
  { label: "Navy", hex: "#0e2442" },
  { label: "Emerald", hex: "#0b3d2e" },
  { label: "Crimson", hex: "#3a0b17" },
  { label: "Plum", hex: "#2e1a47" },
  { label: "Teal", hex: "#0e3b43" },
  { label: "Slate", hex: "#1e293b" },
  { label: "Mist", hex: "#e2eef3" },
  { label: "Cream", hex: "#fffefa" },
  { label: "Rose", hex: "#f7e3e7" },
  { label: "Sage", hex: "#ddebdd" },
  { label: "Sand", hex: "#f1e7d3" },
];

const labelClass = "w-20 shrink-0 text-xs font-semibold text-j-ink-soft";

/** One labelled row of choices, read by a screen reader as a radio group. */
function ChoiceRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; swatch?: string }>; onChange: (value: T) => void }) {
  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={labelClass}>{label}</span>
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

/**
 * The ground colour: the design's own, one of the presets, or any colour the
 * Admin picks. The poster behind it redraws with every change, and the colours
 * on it follow (see lib/poster/palette.ts).
 */
export function PosterColourRow({ ground, defaultGround, onChange }: { ground: string | null; defaultGround: string; onChange: (ground: string | null) => void }) {
  const preset = ground ? GROUND_PRESETS.find(item => item.hex === ground) : undefined;
  const custom = Boolean(ground) && !preset;
  const [draft, setDraft] = useState(ground ?? "");

  // A swatch or the picker changed the colour from outside the text box.
  useEffect(() => {
    setDraft(ground ?? "");
  }, [ground]);

  const commitDraft = (text: string) => {
    setDraft(text);
    const hex = normalizeHex(text);
    if (hex) onChange(hex);
  };

  const swatch = (selected: boolean) =>
    cn("inline-grid size-9 shrink-0 place-items-center rounded-full border border-black/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/50", selected && "ring-2 ring-[#1877f2] ring-offset-2");

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className={labelClass}>Colour</span>
      <div role="radiogroup" aria-label="Colour" className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          role="radio"
          aria-checked={ground === null}
          aria-label="Design's own colour"
          title="Design's own colour"
          onClick={() => onChange(null)}
          className={cn(swatch(ground === null), "relative overflow-hidden")}
          style={{ backgroundColor: defaultGround }}
        >
          <span aria-hidden="true" className="absolute h-px w-[140%] -rotate-45 bg-white/80 mix-blend-difference" />
        </button>
        {GROUND_PRESETS.map(item => (
          <button
            key={item.hex}
            type="button"
            role="radio"
            aria-checked={ground === item.hex}
            aria-label={item.label}
            title={item.label}
            onClick={() => onChange(item.hex)}
            className={swatch(ground === item.hex)}
            style={{ backgroundColor: item.hex }}
          />
        ))}
        <label
          title="Custom colour"
          className={cn(swatch(custom), "relative cursor-pointer overflow-hidden")}
          style={{ background: custom && ground ? ground : "conic-gradient(#f44, #fd4, #4d6, #4cf, #64f, #f4c, #f44)" }}
        >
          <input
            type="color"
            aria-label="Custom colour"
            value={ground ?? defaultGround}
            onChange={event => onChange(normalizeHex(event.target.value))}
            className="absolute inset-0 size-full cursor-pointer opacity-0"
          />
        </label>
        <input
          type="text"
          aria-label="Colour code"
          inputMode="text"
          autoComplete="off"
          spellCheck={false}
          maxLength={7}
          placeholder="#RRGGBB"
          value={draft}
          onChange={event => commitDraft(event.target.value)}
          onBlur={() => setDraft(ground ?? "")}
          className="h-control w-28 rounded-xl border border-j-border bg-white px-3 text-xs font-semibold tabular-nums text-j-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40"
        />
      </div>
    </div>
  );
}

export function FacebookPosterModal({ isOpen, onClose, job, jobs }: { isOpen: boolean; onClose: () => void; job?: FacebookPosterJob | null; jobs?: FacebookPosterJob[] | null }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefs, setPrefs] = useState<PosterPrefs>(readPrefs);
  const [fonts, setFonts] = useState({ sans: false, serif: false });
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const isCombined = Boolean(jobs && jobs.length > 0);
  // One tuition has no tall list; a tall list is Mist's alone.
  const size: PosterSize = !isCombined && prefs.size === "tall" ? "square" : prefs.size;
  const theme: SinglePosterTheme | CombinedPosterTheme = isCombined ? (size === "tall" ? "mist" : prefs.combinedTheme) : prefs.singleTheme;
  const shown = isCombined ? Math.min(jobs!.length, size === "tall" ? MAX_TALL_TUITIONS : MAX_COMBINED_TUITIONS) : 0;
  const needsSerif = theme === "mist";

  // The page holds two of these windows (one tuition, and the bulk poster), each with its own state.
  // A window reads what is stored when it opens, and a change is made on what is stored now rather
  // than on what it read earlier - so a colour picked in one is there in the other, and neither
  // writes the other's choices back over.
  useEffect(() => {
    const stored = isOpen ? readStoredPrefs() : null;
    if (stored) setPrefs(stored);
  }, [isOpen]);

  const update = (patch: Partial<PosterPrefs>) => {
    // Where storage is refused, the window's own state is all there is to build on.
    setPrefs(current => {
      const next = { ...(readStoredPrefs() ?? current), ...patch };
      savePrefs(next);
      return next;
    });
  };

  useEffect(() => {
    if (!isOpen || (fonts.sans && (!needsSerif || fonts.serif))) return;
    let alive = true;
    void loadPosterFonts(4000, { serif: needsSerif }).then(() => {
      if (alive) setFonts(current => ({ sans: true, serif: current.serif || needsSerif }));
    });
    return () => {
      alive = false;
    };
  }, [isOpen, fonts, needsSerif]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!isOpen || !canvas) return;
    try {
      if (isCombined) renderCombinedTuitionsPoster(canvas, jobs!, { theme: theme as CombinedPosterTheme, size, locale: prefs.locale, ground: prefs.ground });
      else if (job) renderSingleTuitionPoster(canvas, job, { theme: theme as SinglePosterTheme, size, locale: prefs.locale, ground: prefs.ground });
    } catch (error) {
      console.error("Poster render failed", error);
      toast.error("পোস্টার তৈরি করতে সমস্যা হয়েছে।");
    }
  }, [isOpen, fonts, prefs, job, jobs, isCombined, theme, size]);

  if (!isOpen || (!job && !isCombined)) return null;

  const fileName = isCombined
    ? posterFileName({ count: shown }, theme, prefs.locale, size)
    : posterFileName({ jobId: job!.jobId }, theme, prefs.locale, size);

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

  const themeIds: Array<SinglePosterTheme | CombinedPosterTheme> = size === "tall" ? ["mist"] : isCombined ? COMBINED_POSTER_THEMES : SINGLE_POSTER_THEMES;
  const themeOptions = themeIds.map(id => ({ value: id, ...THEME_LABELS[id] }));
  const sizeOptions: Array<{ value: PosterSize; label: string }> = [
    { value: "square", label: "Square 1080×1080" },
    { value: "landscape", label: "Landscape 1200×675" },
    ...(isCombined ? [{ value: "tall" as const, label: "Tall list" }] : []),
  ];
  const { width, height } = posterDimensions(size, isCombined ? jobs! : [], prefs.locale);

  return (
    <Modal onClose={onClose} kind="facebook-poster">
      <ModalHeader
        title={isCombined ? "Facebook Multi-Tuition Banner" : "Facebook Poster"}
        meta={isCombined ? `${shown} ${shown === 1 ? "tuition" : "tuitions"}` : <JobIdTag jobId={job!.jobId} colon={false} copyable={false} />}
      />
      <ModalBody>
        <div className="space-y-2.5">
          <ChoiceRow label="Language" value={prefs.locale} options={[{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }]} onChange={locale => update({ locale })} />
          <ChoiceRow label="Size" value={size} options={sizeOptions} onChange={next => update({ size: next })} />
          <ChoiceRow
            label="Theme"
            value={theme}
            options={themeOptions}
            onChange={next => (isCombined ? update({ combinedTheme: next as CombinedPosterTheme }) : update({ singleTheme: next as SinglePosterTheme }))}
          />
          <PosterColourRow ground={prefs.ground} defaultGround={THEME_LABELS[theme].swatch} onChange={ground => update({ ground })} />
        </div>
        <div className="mt-4 flex justify-center rounded-2xl border border-j-border bg-j-border-light/40 p-3">
          <canvas
            ref={canvasRef}
            role="img"
            aria-label={isCombined ? "Multi-tuition poster preview" : `Poster preview for job ${job!.jobId}`}
            className={cn("h-auto w-auto max-w-full rounded-lg shadow-sm", size === "tall" ? "max-h-[60vh]" : "max-h-[52vh]")}
            style={{ aspectRatio: `${width} / ${height}` }}
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
