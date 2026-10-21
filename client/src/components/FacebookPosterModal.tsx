import { ChevronDown, ChevronLeft, ChevronRight, Copy, Download, FileText, Image as ImageIcon, SlidersHorizontal } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { JobIdTag } from "@/components/JobIdTag";
import { Modal, ModalBody, ModalFooter, ModalHeader } from "@/components/ui/modal";
import { copyToClipboard } from "@/lib/copyToClipboard";
import {
  autoPosterGround,
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

export type PosterPrefs = {
  locale: PosterLocale;
  size: PosterSize;
  singleTheme: SinglePosterTheme;
  combinedTheme: CombinedPosterTheme;
  /** The ground colour the Admin picked, "auto" for the curriculum's own, or null for the design's own colours. */
  ground: string | null;
};

/** What is stored as the ground when the Admin chose Auto. */
export const AUTO = "auto";

/** The Auto swatch: the curriculum colours in one disc, since it is every one of them. */
const AUTO_SWATCH = "conic-gradient(#0e2442 0 25%, #0e3b43 0 50%, #0b3d2e 0 75%, #3a0b17 0)";

const DEFAULT_PREFS: PosterPrefs = { locale: "bn", size: "square", singleTheme: "navy", combinedTheme: "navy", ground: null };

/** What is stored, or null when nothing is or the browser will not say (a private window). */
export function readStoredPrefs(): PosterPrefs | null {
  try {
    const saved = JSON.parse(localStorage.getItem(PREFS_KEY) ?? "null") as Partial<PosterPrefs> | null;
    if (!saved) return null;
    return {
      locale: saved.locale === "en" ? "en" : "bn",
      size: saved.size === "landscape" || saved.size === "tall" ? saved.size : "square",
      singleTheme: SINGLE_POSTER_THEMES.includes(saved.singleTheme as SinglePosterTheme) ? (saved.singleTheme as SinglePosterTheme) : "navy",
      combinedTheme: COMBINED_POSTER_THEMES.includes(saved.combinedTheme as CombinedPosterTheme) ? (saved.combinedTheme as CombinedPosterTheme) : "navy",
      ground: saved.ground === AUTO ? AUTO : typeof saved.ground === "string" ? normalizeHex(saved.ground) : null,
    };
  } catch {
    return null;
  }
}

export const readPrefs = () => readStoredPrefs() ?? DEFAULT_PREFS;

export function savePrefs(prefs: PosterPrefs) {
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

// On a phone the label sits over its row, so every row starts at the same edge; beside it from `sm` up.
const rowClass = "flex flex-col gap-1.5 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2";
const labelClass = "text-xs font-semibold text-j-ink-soft sm:w-20 sm:shrink-0";

/**
 * One labelled row of choices, read by a screen reader as a radio group. On a
 * phone the choices share the row's width equally and never wrap; `detail` is
 * the small print after a label (a size's pixels), which a phone has no room for.
 */
export function ChoiceRow<T extends string>({ label, value, options, onChange }: { label: string; value: T; options: Array<{ value: T; label: string; detail?: string; swatch?: string }>; onChange: (value: T) => void }) {
  return (
    <div className={rowClass}>
      <span className={labelClass}>{label}</span>
      <div role="radiogroup" aria-label={label} className="grid auto-cols-fr grid-flow-col gap-1.5 sm:flex sm:flex-wrap sm:gap-2">
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
                "inline-flex h-control min-w-0 items-center justify-center gap-1 rounded-xl border px-1 text-xs font-semibold transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40 sm:gap-2 sm:px-3.5",
                selected ? "border-[#1877f2] bg-[#1877f2] text-white" : "border-j-border bg-white text-j-ink hover:bg-j-border-light/60",
              )}
            >
              {option.swatch ? <span aria-hidden="true" className="size-3 shrink-0 rounded-full border border-black/15 sm:size-3.5" style={{ backgroundColor: option.swatch }} /> : null}
              <span className="truncate">{option.label}</span>
              {option.detail ? (
                <>
                  {" "}
                  <span className="max-sm:hidden">{option.detail}</span>
                </>
              ) : null}
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
export function PosterColourRow({ ground, defaultGround, resolvedAuto = null, onChange }: {
  ground: string | null;
  defaultGround: string;
  /** What Auto resolves to for this poster, shown in the colour box while Auto is chosen. */
  resolvedAuto?: string | null;
  onChange: (ground: string | null) => void;
}) {
  const auto = ground === AUTO;
  const hex = auto ? null : ground;
  const preset = hex ? GROUND_PRESETS.find(item => item.hex === hex) : undefined;
  const custom = Boolean(hex) && !preset;
  const [draft, setDraft] = useState(hex ?? "");

  // A swatch or the picker changed the colour from outside the text box.
  useEffect(() => {
    setDraft(hex ?? "");
  }, [hex]);

  const commitDraft = (text: string) => {
    setDraft(text);
    const typed = normalizeHex(text);
    if (typed) onChange(typed);
  };

  const swatch = (selected: boolean) =>
    cn("inline-grid size-9 shrink-0 place-items-center rounded-full border border-black/15 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/50", selected && "ring-2 ring-[#1877f2] ring-offset-2");

  // On a phone the thirteen swatches run along one line that slides sideways, and the custom colour
  // and its code have a line of their own; from `sm` up (`contents`) all of them flow in one row.
  return (
    <div className={rowClass}>
      <span className={labelClass}>Colour</span>
      <div role="radiogroup" aria-label="Colour" className="flex min-w-0 flex-col gap-1 sm:flex-row sm:flex-wrap sm:items-center sm:gap-2">
        <div className="-mx-1 flex min-w-0 snap-x items-center gap-2 overflow-x-auto px-1 py-1.5 sm:contents">
          <button
            type="button"
            role="radio"
            aria-checked={ground === null}
            aria-label="Design's own colour"
            title="Design's own colour"
            onClick={() => onChange(null)}
            className={cn(swatch(ground === null), "relative snap-start overflow-hidden")}
            style={{ backgroundColor: defaultGround }}
          >
            <span aria-hidden="true" className="absolute h-px w-[140%] -rotate-45 bg-white/80 mix-blend-difference" />
          </button>
          <button
            type="button"
            role="radio"
            aria-checked={auto}
            aria-label="Auto"
            title="Auto: the colour of the curriculum"
            onClick={() => onChange(AUTO)}
            className={cn(swatch(auto), "snap-start")}
            style={{ background: AUTO_SWATCH }}
          />
          {GROUND_PRESETS.map(item => (
            <button
              key={item.hex}
              type="button"
              role="radio"
              aria-checked={hex === item.hex}
              aria-label={item.label}
              title={item.label}
              onClick={() => onChange(item.hex)}
              className={cn(swatch(hex === item.hex), "snap-start")}
              style={{ backgroundColor: item.hex }}
            />
          ))}
        </div>
        <div className="flex items-center gap-2 sm:contents">
          <label
            title="Custom colour"
            className={cn(swatch(custom), "relative cursor-pointer overflow-hidden")}
            style={{ background: custom && hex ? hex : "conic-gradient(#f44, #fd4, #4d6, #4cf, #64f, #f4c, #f44)" }}
          >
            <input
              type="color"
              aria-label="Custom colour"
              value={hex ?? resolvedAuto ?? defaultGround}
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
            placeholder={auto && resolvedAuto ? resolvedAuto : "#RRGGBB"}
            value={draft}
            onChange={event => commitDraft(event.target.value)}
            onBlur={() => setDraft(hex ?? "")}
            className="h-control min-w-0 flex-1 rounded-xl border border-j-border bg-white px-3 text-xs font-semibold tabular-nums text-j-ink focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40 sm:w-28 sm:flex-none"
          />
        </div>
      </div>
    </div>
  );
}

export function FacebookPosterModal({ isOpen, onClose, job, jobs, caption }: {
  isOpen: boolean;
  onClose: () => void;
  job?: FacebookPosterJob | null;
  jobs?: FacebookPosterJob[] | null;
  /**
   * The text post that goes with this poster, given how many tuitions the poster
   * holds (one for a single tuition; four in a square or landscape, up to twelve in
   * the tall list). Where the page gives none, the window has no caption button.
   */
  caption?: (shown: number, range?: { start: number; end: number }) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefs, setPrefs] = useState<PosterPrefs>(readPrefs);
  const [fonts, setFonts] = useState({ sans: false, serif: false });
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // On a phone, tabs cleanly switch between the poster preview and settings so neither overlaps or covers the other.
  const [mobileTab, setMobileTab] = useState<"preview" | "settings">("preview");

  const isCombined = Boolean(jobs && jobs.length > 0);
  const size: PosterSize = !isCombined && prefs.size === "tall" ? "square" : prefs.size;
  const theme: SinglePosterTheme | CombinedPosterTheme = isCombined ? prefs.combinedTheme : prefs.singleTheme;
  const isCarousel = isCombined && size !== "tall" && (jobs?.length ?? 0) > 4;
  const totalSlides = isCarousel ? Math.ceil(jobs!.length / 4) : 1;
  const [activeSlide, setActiveSlide] = useState(0);

  useEffect(() => {
    if (activeSlide >= totalSlides) {
      setActiveSlide(0);
    }
  }, [totalSlides, activeSlide]);

  const slideStart = isCarousel ? activeSlide * 4 : 0;
  const slideEnd = isCarousel ? Math.min(slideStart + 4, jobs!.length) : (size === "tall" ? MAX_TALL_TUITIONS : MAX_COMBINED_TUITIONS);
  const currentSlideJobs = isCombined
    ? (size === "tall" ? jobs!.slice(0, MAX_TALL_TUITIONS) : jobs!.slice(slideStart, slideEnd))
    : [];
  const shown = isCombined ? currentSlideJobs.length : 0;
  const needsSerif = theme === "mist";
  // The tuitions this window draws, which Auto reads the curriculum from.
  const drawn = isCombined ? currentSlideJobs : job ? [job] : [];
  const resolvedAuto = autoPosterGround(drawn);
  const ground = prefs.ground === AUTO ? resolvedAuto : prefs.ground;

  // The page holds two of these windows (one tuition, and the bulk poster), each with its own state.
  // A window reads what is stored when it opens, and a change is made on what is stored now rather
  // than on what it read earlier - so a colour picked in one is there in the other, and neither
  // writes the other's choices back over.
  useEffect(() => {
    const stored = isOpen ? readStoredPrefs() : null;
    if (stored) setPrefs(stored);
    if (isOpen) setMobileTab("preview");
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
      if (isCombined) renderCombinedTuitionsPoster(canvas, currentSlideJobs, { theme: theme as CombinedPosterTheme, size, locale: prefs.locale, ground });
      else if (job) renderSingleTuitionPoster(canvas, job, { theme: theme as SinglePosterTheme, size, locale: prefs.locale, ground });
    } catch (error) {
      console.error("Poster render failed", error);
      toast.error("পোস্টার তৈরি করতে সমস্যা হয়েছে।");
    }
  }, [isOpen, fonts, prefs, job, jobs, isCombined, theme, size, ground, currentSlideJobs, mobileTab]);

  if (!isOpen || (!job && !isCombined)) return null;

  const fileName = isCombined
    ? (isCarousel
        ? `connect-tutors-slide-${activeSlide + 1}-of-${totalSlides}-${theme}-${prefs.locale}-${size}.png`
        : posterFileName({ count: shown }, theme, prefs.locale, size))
    : posterFileName({ jobId: job!.jobId }, theme, prefs.locale, size);

  const handleDownload = async () => {
    const canvas = canvasRef.current;
    if (!canvas || isSaving) return;
    setIsSaving(true);
    const saved = await downloadCanvasImage(canvas, fileName);
    setIsSaving(false);
    if (saved) toast.success(isCarousel ? `স্লাইড ${activeSlide + 1} ডাউনলোড হয়েছে।` : "পোস্টার ডাউনলোড হয়েছে।");
    else toast.error("পোস্টারের ছবি তৈরি করা যায়নি।");
  };

  const handleDownloadAll = async () => {
    if (!isCombined || !jobs || isSaving) return;
    setIsSaving(true);
    try {
      const offscreen = document.createElement("canvas");
      for (let i = 0; i < totalSlides; i++) {
        const start = i * 4;
        const end = Math.min(start + 4, jobs.length);
        const slideJobs = jobs.slice(start, end);
        renderCombinedTuitionsPoster(offscreen, slideJobs, {
          theme: theme as CombinedPosterTheme,
          size,
          locale: prefs.locale,
          ground,
        });
        const name = `connect-tutors-slide-${i + 1}-of-${totalSlides}-${theme}-${prefs.locale}-${size}.png`;
        await downloadCanvasImage(offscreen, name);
        if (i < totalSlides - 1) {
          await new Promise(r => setTimeout(r, 250));
        }
      }
      toast.success(`${totalSlides}টি স্লাইড সফলভাবে ডাউনলোড হয়েছে।`);
    } catch (err) {
      console.error("Download all failed", err);
      toast.error("সবগুলো স্লাইড ডাউনলোড করতে সমস্যা হয়েছে।");
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopyCaption = async (range?: { start: number; end: number }) => {
    if (!caption) return;
    const count = range ? range.end - range.start : (isCombined ? (isCarousel ? slideEnd - slideStart : shown) : 1);
    const text = range !== undefined ? caption(count, range) : caption(count);
    const copied = await copyToClipboard(text);
    if (copied) toast.success("ক্যাপশন কপি হয়েছে। ছবির সাথে পেস্ট করুন।");
    else toast.error("ক্যাপশন কপি করা যায়নি।");
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

  const themeIds: Array<SinglePosterTheme | CombinedPosterTheme> = isCombined ? COMBINED_POSTER_THEMES : SINGLE_POSTER_THEMES;
  const themeOptions = themeIds.map(id => ({ value: id, ...THEME_LABELS[id] }));
  const sizeOptions: Array<{ value: PosterSize; label: string; detail?: string }> = [
    { value: "square", label: "Square", detail: "1080×1080" },
    { value: "landscape", label: "Landscape", detail: "1200×675" },
    ...(isCombined ? [{ value: "tall" as const, label: "Tall list" }] : []),
  ];
  const { width, height } = posterDimensions(size, isCombined ? jobs! : [], prefs.locale);
  // What the folded settings still say on their bar.
  const settingsSummary = [prefs.locale === "bn" ? "বাংলা" : "English", sizeOptions.find(option => option.value === size)?.label, THEME_LABELS[theme].label].join(" · ");

  return (
    <Modal onClose={onClose} kind="facebook-poster">
      <ModalHeader
        title={isCombined ? "Facebook Multi-Tuition Banner" : "Facebook Poster"}
        meta={
          isCombined ? (
            isCarousel ? (
              <span className="flex items-center gap-1.5 font-medium">
                <span className="rounded-md bg-j-border-light px-2 py-0.5 text-xs font-bold text-j-ink">
                  Slide {activeSlide + 1} of {totalSlides}
                </span>
                <span className="text-j-ink-soft">({jobs!.length} total)</span>
              </span>
            ) : (
              `${shown} ${shown === 1 ? "tuition" : "tuitions"}`
            )
          ) : (
            <JobIdTag jobId={job!.jobId} colon={false} copyable={false} />
          )
        }
      />
      <ModalBody className="max-sm:pt-2">
        {/* Mobile Tab Switcher: Preview ↔ Settings */}
        <div
          role="tablist"
          aria-label="Poster view"
          className="mb-3 grid grid-cols-2 gap-1 rounded-xl border border-j-border bg-j-border-light/60 p-1 sm:hidden"
        >
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "preview"}
            aria-controls="poster-preview-panel"
            onClick={() => setMobileTab("preview")}
            className={cn(
              "flex h-8 items-center justify-center gap-1.5 rounded-lg text-xs font-bold transition",
              mobileTab === "preview"
                ? "bg-white text-j-ink shadow-2xs"
                : "text-j-ink-soft hover:text-j-ink",
            )}
          >
            <ImageIcon className="size-3.5" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mobileTab === "settings"}
            aria-expanded={mobileTab === "settings"}
            aria-controls="poster-settings"
            onClick={() => setMobileTab(tab => (tab === "settings" ? "preview" : "settings"))}
            className={cn(
              "flex h-8 min-w-0 items-center justify-center gap-1.5 rounded-lg px-2 text-xs font-bold transition",
              mobileTab === "settings"
                ? "bg-white text-j-ink shadow-2xs"
                : "text-j-ink-soft hover:text-j-ink",
            )}
          >
            <SlidersHorizontal className="size-3.5 shrink-0" />
            <span className="shrink-0">Settings</span>
            <span className="truncate text-3xs font-medium text-j-ink-muted">({settingsSummary})</span>
          </button>
        </div>

        <div className="flex flex-col">
          {/* Settings Section (desktop: sm:order-1 sm:block; mobile: mobileTab === 'settings' ? 'block' : 'max-sm:hidden') */}
          <div
            id="poster-settings"
            className={cn(
              "space-y-3 sm:order-1 sm:mb-4 sm:space-y-2.5",
              mobileTab === "settings" ? "block" : "max-sm:hidden sm:block",
            )}
          >
            <ChoiceRow label="Language" value={prefs.locale} options={[{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }]} onChange={locale => update({ locale })} />
            <ChoiceRow label="Size" value={size} options={sizeOptions} onChange={next => update({ size: next })} />
            <ChoiceRow
              label="Theme"
              value={theme}
              options={themeOptions}
              onChange={next => (isCombined ? update({ combinedTheme: next as CombinedPosterTheme }) : update({ singleTheme: next as SinglePosterTheme }))}
            />
            <PosterColourRow ground={prefs.ground} defaultGround={THEME_LABELS[theme].swatch} resolvedAuto={resolvedAuto} onChange={next => update({ ground: next })} />

            {/* Mobile button to return to Preview */}
            <div className="pt-2 sm:hidden">
              <button
                type="button"
                onClick={() => setMobileTab("preview")}
                className="flex h-control w-full items-center justify-center gap-2 rounded-xl bg-[#1877f2] text-xs font-bold text-white shadow-2xs transition hover:bg-[#166fe5]"
              >
                <ImageIcon className="size-3.5" />
                <span>View Updated Poster</span>
              </button>
            </div>
          </div>

          {/* Preview Section (desktop: sm:order-2 sm:block; mobile: mobileTab === 'preview' ? 'block' : 'max-sm:hidden') */}
          <div
            id="poster-preview-panel"
            className={cn(
              "sm:order-2",
              mobileTab === "preview" ? "block" : "max-sm:hidden sm:block",
            )}
          >
            {isCarousel ? (
              <div className="mb-2.5 flex flex-wrap items-center justify-between gap-2 rounded-xl border border-j-border bg-white p-2 shadow-2xs">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs font-bold text-j-ink">Slides:</span>
                  <div className="flex flex-wrap items-center gap-1">
                    {Array.from({ length: totalSlides }, (_, i) => {
                      const from = i * 4 + 1;
                      const to = Math.min((i + 1) * 4, jobs!.length);
                      const isActive = activeSlide === i;
                      return (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setActiveSlide(i)}
                          className={cn(
                            "inline-flex h-7 items-center justify-center rounded-lg px-2.5 text-xs font-bold transition",
                            isActive
                              ? "bg-[#1877f2] text-white shadow-xs"
                              : "border border-j-border bg-white text-j-ink hover:bg-j-border-light/70",
                          )}
                        >
                          Slide {i + 1} <span className="ml-1 text-[11px] opacity-80">({from}–{to})</span>
                        </button>
                      );
                    })}
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button
                    type="button"
                    disabled={activeSlide === 0}
                    onClick={() => setActiveSlide(s => Math.max(0, s - 1))}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-j-border bg-white text-j-ink transition hover:bg-j-border-light disabled:opacity-40"
                    aria-label="Previous slide"
                  >
                    <ChevronLeft className="size-4" />
                  </button>
                  <button
                    type="button"
                    disabled={activeSlide >= totalSlides - 1}
                    onClick={() => setActiveSlide(s => Math.min(totalSlides - 1, s + 1))}
                    className="inline-flex size-7 items-center justify-center rounded-lg border border-j-border bg-white text-j-ink transition hover:bg-j-border-light disabled:opacity-40"
                    aria-label="Next slide"
                  >
                    <ChevronRight className="size-4" />
                  </button>
                </div>
              </div>
            ) : null}

            <div className="flex justify-center rounded-xl border border-j-border bg-j-border-light/40 p-3">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={isCombined ? "Multi-tuition poster preview" : `Poster preview for job ${job!.jobId}`}
                className={cn(
                  "h-auto w-auto max-w-full rounded-lg shadow-sm",
                  size === "tall" ? "max-sm:max-h-[55dvh] sm:max-h-[60vh]" : "max-sm:max-h-[46dvh] sm:max-h-[52vh]",
                )}
                style={{ aspectRatio: `${width} / ${height}` }}
              />
            </div>

            {/* Quick action button on mobile to jump directly to Settings */}
            <button
              type="button"
              onClick={() => setMobileTab("settings")}
              className="mt-3 flex w-full items-center justify-between rounded-xl border border-j-border bg-white px-3.5 py-2.5 text-xs font-semibold text-j-ink shadow-2xs transition hover:bg-j-border-light/60 sm:hidden"
            >
              <span className="flex items-center gap-2">
                <SlidersHorizontal className="size-3.5 text-[#1877f2]" />
                <span>Customize Settings</span>
              </span>
              <span className="flex min-w-0 items-center gap-1.5 text-j-ink-soft">
                <span className="truncate max-w-[150px]">{settingsSummary}</span>
                <ChevronRight className="size-3.5" />
              </span>
            </button>
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        {/* On a phone the copy buttons share one line and Download PNG has the next to itself; from `sm` up they sit in a row. */}
        <div className="grid flex-1 grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:justify-end">
          {caption ? (
            isCarousel ? (
              <>
                <button
                  type="button"
                  onClick={() => handleCopyCaption({ start: slideStart, end: slideEnd })}
                  className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-3 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60"
                  title="Copy caption for only this slide"
                >
                  <FileText className="size-3.5" strokeWidth={1.5} />
                  Copy Slide ({slideEnd - slideStart})
                </button>
                <button
                  type="button"
                  onClick={() => handleCopyCaption({ start: 0, end: jobs!.length })}
                  className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-3 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60"
                  title="Copy caption for all tuitions"
                >
                  <FileText className="size-3.5" strokeWidth={1.5} />
                  Copy All ({jobs!.length})
                </button>
              </>
            ) : (
              <button
                type="button"
                onClick={() => handleCopyCaption()}
                className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-4 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60"
              >
                <FileText className="size-3.5" strokeWidth={1.5} />
                Copy caption
              </button>
            )
          ) : null}
          <button
            type="button"
            onClick={handleCopy}
            disabled={isCopying}
            className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-j-border bg-white px-4 text-xs font-bold text-j-ink transition hover:bg-j-border-light/60 disabled:opacity-60"
          >
            <Copy className="size-3.5" strokeWidth={1.5} />
            Copy image
          </button>
          <button
            type="button"
            onClick={handleDownload}
            disabled={isSaving}
            className={cn(
              "inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-[#1877f2] bg-[#1877f2] px-4 text-xs font-bold text-white transition hover:bg-[#166fe5] disabled:opacity-60",
              caption && "col-span-2 sm:col-span-1",
            )}
          >
            <Download className="size-3.5" strokeWidth={1.5} />
            {isCarousel ? `Download Slide ${activeSlide + 1} PNG` : "Download PNG"}
          </button>
          {isCarousel ? (
            <button
              type="button"
              onClick={handleDownloadAll}
              disabled={isSaving}
              className="inline-flex h-control items-center justify-center gap-1.5 rounded-xl border border-emerald-600 bg-emerald-600 px-4 text-xs font-bold text-white shadow-2xs transition hover:bg-emerald-700 disabled:opacity-60 col-span-2 sm:col-span-1"
              title="Download all slides as individual PNG files"
            >
              <Download className="size-3.5" strokeWidth={1.5} />
              Download All ({totalSlides} Slides)
            </button>
          ) : null}
        </div>
      </ModalFooter>
    </Modal>
  );
}
