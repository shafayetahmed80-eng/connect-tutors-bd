import { ChevronDown, Copy, Download, FileText } from "lucide-react";
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
  caption?: (shown: number) => string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [prefs, setPrefs] = useState<PosterPrefs>(readPrefs);
  const [fonts, setFonts] = useState({ sans: false, serif: false });
  const [isCopying, setIsCopying] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  // Only a phone folds the settings away (from `sm` up they are always shown): the poster comes first there.
  const [settingsOpen, setSettingsOpen] = useState(false);

  const isCombined = Boolean(jobs && jobs.length > 0);
  // One tuition has no tall list; a tall list is Mist's alone.
  const size: PosterSize = !isCombined && prefs.size === "tall" ? "square" : prefs.size;
  const theme: SinglePosterTheme | CombinedPosterTheme = isCombined ? (size === "tall" ? "mist" : prefs.combinedTheme) : prefs.singleTheme;
  const shown = isCombined ? Math.min(jobs!.length, size === "tall" ? MAX_TALL_TUITIONS : MAX_COMBINED_TUITIONS) : 0;
  const needsSerif = theme === "mist";
  // The tuitions this window draws, which Auto reads the curriculum from.
  const drawn = isCombined ? jobs!.slice(0, shown) : job ? [job] : [];
  const resolvedAuto = autoPosterGround(drawn);
  const ground = prefs.ground === AUTO ? resolvedAuto : prefs.ground;

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
      if (isCombined) renderCombinedTuitionsPoster(canvas, jobs!, { theme: theme as CombinedPosterTheme, size, locale: prefs.locale, ground });
      else if (job) renderSingleTuitionPoster(canvas, job, { theme: theme as SinglePosterTheme, size, locale: prefs.locale, ground });
    } catch (error) {
      console.error("Poster render failed", error);
      toast.error("পোস্টার তৈরি করতে সমস্যা হয়েছে।");
    }
  }, [isOpen, fonts, prefs, job, jobs, isCombined, theme, size, ground]);

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

  const handleCopyCaption = async () => {
    if (!caption) return;
    const copied = await copyToClipboard(caption(isCombined ? shown : 1));
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

  const themeIds: Array<SinglePosterTheme | CombinedPosterTheme> = size === "tall" ? ["mist"] : isCombined ? COMBINED_POSTER_THEMES : SINGLE_POSTER_THEMES;
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
        meta={isCombined ? `${shown} ${shown === 1 ? "tuition" : "tuitions"}` : <JobIdTag jobId={job!.jobId} colon={false} copyable={false} />}
      />
      <ModalBody className="max-sm:pt-0">
        <div className="flex flex-col">
          {/* A phone shows the poster first and keeps it in view while the settings below scroll. */}
          <div className="order-1 max-sm:sticky max-sm:top-0 max-sm:z-10 max-sm:-mx-4 max-sm:bg-background max-sm:px-4 max-sm:py-3 sm:order-2 sm:mt-4">
            <div className="flex justify-center rounded-2xl border border-j-border bg-j-border-light/40 p-3">
              <canvas
                ref={canvasRef}
                role="img"
                aria-label={isCombined ? "Multi-tuition poster preview" : `Poster preview for job ${job!.jobId}`}
                className={cn(
                  "h-auto w-auto max-w-full rounded-lg shadow-sm",
                  settingsOpen ? "max-sm:max-h-[30dvh]" : "max-sm:max-h-[46dvh]",
                  size === "tall" ? "sm:max-h-[60vh]" : "sm:max-h-[52vh]",
                )}
                style={{ aspectRatio: `${width} / ${height}` }}
              />
            </div>
          </div>
          <button
            type="button"
            aria-expanded={settingsOpen}
            aria-controls="poster-settings"
            onClick={() => setSettingsOpen(open => !open)}
            className="order-2 flex h-control w-full items-center justify-between gap-3 rounded-xl border border-j-border bg-white px-3.5 text-xs font-semibold text-j-ink transition hover:bg-j-border-light/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#1877f2]/40 sm:hidden"
          >
            <span>Settings</span>
            <span className="flex min-w-0 items-center gap-2 font-medium text-j-ink-soft">
              <span className="truncate">{settingsSummary}</span>
              <ChevronDown className={cn("size-4 shrink-0 transition-transform motion-reduce:transition-none", settingsOpen && "rotate-180")} strokeWidth={1.5} />
            </span>
          </button>
          <div id="poster-settings" className={cn("order-3 mt-3 space-y-3 sm:order-1 sm:mt-0 sm:space-y-2.5", !settingsOpen && "max-sm:hidden")}>
            <ChoiceRow label="Language" value={prefs.locale} options={[{ value: "bn", label: "বাংলা" }, { value: "en", label: "English" }]} onChange={locale => update({ locale })} />
            <ChoiceRow label="Size" value={size} options={sizeOptions} onChange={next => update({ size: next })} />
            <ChoiceRow
              label="Theme"
              value={theme}
              options={themeOptions}
              onChange={next => (isCombined ? update({ combinedTheme: next as CombinedPosterTheme }) : update({ singleTheme: next as SinglePosterTheme }))}
            />
            <PosterColourRow ground={prefs.ground} defaultGround={THEME_LABELS[theme].swatch} resolvedAuto={resolvedAuto} onChange={next => update({ ground: next })} />
          </div>
        </div>
      </ModalBody>
      <ModalFooter>
        {/* On a phone the copy buttons share one line and Download PNG has the next to itself; from `sm` up they sit in a row. */}
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
            Download PNG
          </button>
        </div>
      </ModalFooter>
    </Modal>
  );
}
