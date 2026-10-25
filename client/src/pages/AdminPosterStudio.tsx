import { useEffect, useMemo, useRef, useState } from "react";
import { Copy, Download, ImagePlus, RotateCcw, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { ImageStudioFontPicker } from "@/components/ImageStudioFontPicker";
import { trpc } from "@/lib/trpc";
import { useSiteContact } from "@/lib/siteContent";
import {
  findStudioFont,
  loadStudioFont,
  setUploadedStudioFonts,
  studioFontBoldWeight,
  studioFontFamily,
  studioFontRegularWeight,
  type StudioFontMarks,
} from "@/lib/image-studio-fonts";
import {
  canvasToImageBlob,
  imageExportScales,
  imageStudioSizes,
  maxScaleFor,
  saveBlob,
  type ImageExportFormat,
  type ImageExportScale,
} from "@/lib/image-studio";
import {
  findPosterTemplate,
  formatPosterPhone,
  posterFileName,
  posterIconNames,
  posterIcons,
  posterTemplates,
  renderPoster,
  type PosterContent,
  type PosterIconName,
  type PosterContact,
  type PosterLayout,
  type PosterTextSize,
  defaultPosterTextSize,
  type PosterPhoto,
  type PosterTone,
} from "@/lib/poster-studio";

const DRAFT_KEY = "connect-poster-studio-v1";
type FontChoice = { headline: string; body: string; english: string };
const DEFAULT_FONTS: FontChoice = { headline: "anek-bangla", body: "noto-sans-bengali", english: "dm-sans" };
const ACCENTS = ["#e5246b", "#ef6c00", "#d32f2f", "#00897b", "#f5a623", "#6d4bd8"];
const MAX_FEATURES = 4;

const chip = (active: boolean) =>
  `h-control rounded-xl border px-3 text-sm font-semibold transition ${active ? "border-j-accent bg-j-accent text-white" : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"} disabled:cursor-not-allowed disabled:opacity-40`;
const field = "h-control w-full rounded-xl border border-j-border px-3 text-sm";
const label = "mb-1 block text-xs font-bold text-j-ink-soft";
const legend = "mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft";

type Draft = { templateId: string; content: PosterContent; fonts: FontChoice; accent: string | null; layout: PosterLayout; textSize: PosterTextSize };

const SIZE_STEPS = [["Small", 0.9], ["Normal", 1], ["Large", 1.12], ["Extra large", 1.25]] as const;
const SIZE_PARTS = [["headline", "Headline"], ["subline", "Line under the headline"], ["points", "Points"], ["button", "Button"], ["contact", "Contact line"]] as const;

function cleanTextSize(saved: Partial<PosterTextSize> | undefined): PosterTextSize {
  const clean = (value: unknown) => (typeof value === "number" && value >= 0.5 && value <= 1.6 ? value : 1);
  return {
    all: clean(saved?.all),
    headline: clean(saved?.headline),
    subline: clean(saved?.subline),
    points: clean(saved?.points),
    button: clean(saved?.button),
    contact: clean(saved?.contact),
  };
}

function readDraft(): Draft {
  const template = posterTemplates[0];
  const fresh: Draft = { templateId: template.id, content: template.content, fonts: DEFAULT_FONTS, accent: null, layout: "photo", textSize: defaultPosterTextSize };
  try {
    const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<Draft> | null;
    if (!saved || !saved.templateId || !findPosterTemplate(saved.templateId) || !saved.content) return fresh;
    const known = (id: string | undefined, script: "bn" | "en", fallback: string) => (id && findStudioFont(id)?.script === script ? id : fallback);
    return {
      templateId: saved.templateId,
      content: { ...findPosterTemplate(saved.templateId)!.content, ...saved.content },
      fonts: {
        headline: known(saved.fonts?.headline, "bn", DEFAULT_FONTS.headline),
        body: known(saved.fonts?.body, "bn", DEFAULT_FONTS.body),
        english: known(saved.fonts?.english, "en", DEFAULT_FONTS.english),
      },
      layout: saved.layout === "plain" ? "plain" : "photo",
      textSize: cleanTextSize(saved.textSize),
      accent: typeof saved.accent === "string" && /^#[0-9a-f]{6}$/i.test(saved.accent) ? saved.accent : null,
    };
  } catch {
    return fresh;
  }
}

/** The poster studio: a template the Admin fills in - photo, words, points, fonts, colour - then downloads. */
export function PosterStudioContent() {
  const [draft, setDraft] = useState<Draft>(readDraft);
  const [photo, setPhoto] = useState<PosterPhoto | null>(null);
  const [sizeId, setSizeId] = useState("portrait-post");
  const [format, setFormat] = useState<ImageExportFormat>("png");
  const [scale, setScale] = useState<ImageExportScale>(2);
  const [saving, setSaving] = useState(false);
  const [copying, setCopying] = useState(false);
  const [fontsReady, setFontsReady] = useState(0);
  const preview = useRef<HTMLCanvasElement>(null);
  const drag = useRef<{ x: number; y: number } | null>(null);
  const contact = useSiteContact();

  const utils = trpc.useUtils();
  const marksQuery = trpc.imageStudio.marks.useQuery();
  const uploadedQuery = trpc.imageStudio.uploadedFonts.useQuery();
  const setMark = trpc.imageStudio.setMark.useMutation({ onSuccess: () => void utils.imageStudio.marks.invalidate(), onError: error => toast.error(error.message) });
  const deleteFont = trpc.imageStudio.deleteFont.useMutation({
    onSuccess: () => {
      void utils.imageStudio.uploadedFonts.invalidate();
      void utils.imageStudio.marks.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  setUploadedStudioFonts(uploadedQuery.data ?? []);
  const marks: StudioFontMarks = useMemo(
    () => new Map((marksQuery.data?.marks ?? []).filter(mark => mark.kind === "font").map(mark => [mark.itemId, { starred: mark.starred, archived: mark.archived }])),
    [marksQuery.data],
  );
  const canEdit = Boolean(marksQuery.data?.canEdit);

  const template = findPosterTemplate(draft.templateId) ?? posterTemplates[0];
  const sizes = imageStudioSizes.poster;
  const size = sizes.find(item => item.id === sizeId) ?? sizes[0];
  const largest = maxScaleFor(size);
  const exportScale = Math.min(scale, largest) as ImageExportScale;
  const content = draft.content;

  const save = (next: Draft) => {
    setDraft(next);
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Without storage the words reset next visit; nothing else is lost.
    }
  };
  const edit = (change: Partial<PosterContent>) => save({ ...draft, content: { ...content, ...change } });

  const fontIds = [draft.fonts.headline, draft.fonts.body, draft.fonts.english];
  useEffect(() => {
    let cancelled = false;
    void Promise.all(fontIds.map(id => loadStudioFont(id))).then(() => {
      if (!cancelled) setFontsReady(count => count + 1);
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, fontIds);

  const renderInput = (width: number, height: number, renderScale: number) => ({
    width,
    height,
    scale: renderScale,
    template,
    content,
    accent: draft.accent ?? undefined,
    whatsapp: formatPosterPhone(contact.number),
    qrUrl: typeof window === "undefined" ? "" : `${window.location.origin}/request-tutor`,
    photo,
    layout: draft.layout,
    textSize: draft.textSize,
    fonts: {
      headline: studioFontFamily(draft.fonts.headline),
      headlineWeight: studioFontBoldWeight(draft.fonts.headline),
      body: studioFontFamily(draft.fonts.body),
      bodyWeight: studioFontRegularWeight(draft.fonts.body),
      english: studioFontFamily(draft.fonts.english),
      englishWeight: studioFontBoldWeight(draft.fonts.english),
    },
  });

  useEffect(() => {
    if (preview.current) renderPoster(preview.current, renderInput(size.width, size.height, 1));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, photo, size, fontsReady, contact.number]);

  const choosePhoto = (file: File | undefined) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Choose a picture file.");
      return;
    }
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => setPhoto({ source: image, zoom: 1, x: 0, y: 0 });
    image.onerror = () => toast.error("This picture could not be opened.");
    image.src = url;
  };

  // Dragging the preview moves the photo inside its frame, the way a phone's photo crop does.
  const onPointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo || draft.layout !== "photo") return;
    drag.current ={ x: event.clientX, y: event.clientY };
    event.currentTarget.setPointerCapture?.(event.pointerId);
  };
  const onPointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (!photo || !drag.current) return;
    const rect = event.currentTarget.getBoundingClientRect();
    const dx = (event.clientX - drag.current.x) / (rect.width * 0.66);
    const dy = (event.clientY - drag.current.y) / rect.height;
    drag.current = { x: event.clientX, y: event.clientY };
    const clamp = (value: number) => Math.min(1, Math.max(-1, value));
    setPhoto({ ...photo, x: clamp(photo.x - dx * 2), y: clamp(photo.y - dy * 2) });
  };
  const onPointerUp = () => {
    drag.current = null;
  };

  const download = async () => {
    setSaving(true);
    try {
      await Promise.all(fontIds.map(id => loadStudioFont(id)));
      const canvas = document.createElement("canvas");
      renderPoster(canvas, renderInput(size.width, size.height, exportScale));
      saveBlob(await canvasToImageBlob(canvas, format), posterFileName(template.id, size, format, exportScale));
    } catch (error) {
      toast.error((error as Error).message || "The poster could not be made.");
    } finally {
      setSaving(false);
    }
  };

  const copyImage = async () => {
    setCopying(true);
    try {
      await Promise.all(fontIds.map(id => loadStudioFont(id)));
      const canvas = document.createElement("canvas");
      renderPoster(canvas, renderInput(size.width, size.height, 1));
      const blob = await canvasToImageBlob(canvas, "png");
      if (typeof ClipboardItem !== "undefined" && navigator.clipboard?.write) {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        toast.success("Image copied to clipboard! You can paste it into Facebook or WhatsApp.");
      } else {
        toast.error("Clipboard copy is not supported in this browser. Please use Download.");
      }
    } catch (error) {
      toast.error((error as Error).message || "The poster could not be copied.");
    } finally {
      setCopying(false);
    }
  };

  const setLine = (index: number, change: { text?: string; tone?: PosterTone }) => {
    const headline = content.headline.map((line, at) => (at === index ? { ...line, ...change } : line));
    edit({ headline });
  };
  const setFeature = (index: number, change: { text?: string; icon?: PosterIconName }) => {
    edit({ features: content.features.map((feature, at) => (at === index ? { ...feature, ...change } : feature)) });
  };
  const fontPicker = (role: keyof FontChoice, title: string, script: "bn" | "en") => (
    <ImageStudioFontPicker
      label={title}
      script={script}
      value={draft.fonts[role]}
      onChange={id => save({ ...draft, fonts: { ...draft.fonts, [role]: id } })}
      marks={marks}
      canEdit={canEdit}
      onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })}
      onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()}
      onDelete={id => deleteFont.mutate({ id })}
      busy={setMark.isPending || deleteFont.isPending}
    />
  );

  return <div className="space-y-4">
    <div className="grid place-items-center rounded-xl border border-j-border bg-j-surface-sunken p-3 sm:p-5">
      <canvas
        ref={preview}
        data-testid="poster-preview"
        aria-label={`${template.name} poster preview, ${size.width} by ${size.height}`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        className={`h-auto max-h-[70vh] w-auto max-w-full touch-none rounded-lg shadow-sm ${photo && draft.layout === "photo" ? "cursor-grab active:cursor-grabbing" : ""}`}
      />
    </div>

    <div className="space-y-5 rounded-xl border border-j-border bg-white p-4">
      <fieldset>
        <legend className={legend}>Template</legend>
        <div className="flex flex-wrap gap-2">
          {posterTemplates.map(item => <button key={item.id} type="button" aria-pressed={item.id === template.id} onClick={() => save({ ...draft, templateId: item.id, content: item.content, accent: null })} className={chip(item.id === template.id)}>{item.name}</button>)}
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Layout</legend>
        <div className="flex flex-wrap gap-2">
          {([["photo", "With photo"], ["plain", "Without photo"]] as const).map(([value, name]) => <button key={value} type="button" aria-pressed={draft.layout === value} onClick={() => save({ ...draft, layout: value })} className={chip(draft.layout === value)}>{name}</button>)}
        </div>
      </fieldset>

      {draft.layout === "photo" ? <fieldset className="space-y-3">
        <legend className={legend}>Photo</legend>
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex h-control cursor-pointer items-center gap-2 rounded-xl border border-j-accent px-4 text-sm font-bold text-j-accent">
            <ImagePlus size={16} aria-hidden="true" /> {photo ? "Change photo" : "Add photo"}
            <input type="file" accept="image/*" className="sr-only" aria-label="Poster photo" onChange={event => { choosePhoto(event.target.files?.[0]); event.target.value = ""; }} />
          </label>
          {photo ? <button type="button" onClick={() => setPhoto(null)} className="inline-flex h-control items-center gap-2 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">
            <Trash2 size={16} aria-hidden="true" /> Remove photo
          </button> : null}
        </div>
        {photo ? <div className="grid gap-3 sm:grid-cols-3">
          {([["zoom", "Zoom", 1, 3, 0.01], ["x", "Left / right", -1, 1, 0.01], ["y", "Up / down", -1, 1, 0.01]] as const).map(([key, name, min, max, step]) => (
            <label key={key} className="block">
              <span className={label}>{name}</span>
              <input type="range" min={min} max={max} step={step} value={photo[key]} onChange={event => setPhoto({ ...photo, [key]: Number(event.target.value) })} className="w-full accent-[var(--j-accent)]" />
            </label>
          ))}
        </div> : null}
      </fieldset> : null}

      <fieldset className="space-y-3">
        <legend className={legend}>Headline</legend>
        {content.headline.map((line, index) => <div key={index} className="flex flex-wrap items-center gap-2">
          <input aria-label={`Headline line ${index + 1}`} value={line.text} maxLength={40} onChange={event => setLine(index, { text: event.target.value })} className={`${field} min-w-0 flex-1`} />
          <div className="flex gap-1" role="group" aria-label={`Colour of line ${index + 1}`}>
            {(["navy", "accent"] as const).map(tone => <button key={tone} type="button" aria-pressed={line.tone === tone} onClick={() => setLine(index, { tone })} aria-label={tone === "navy" ? "Navy" : "Accent"}
              className={`size-10 rounded-xl border-2 ${line.tone === tone ? "border-j-ink" : "border-transparent"}`}
              style={{ background: tone === "navy" ? template.theme.navy : (draft.accent ?? template.theme.accent) }} />)}
          </div>
        </div>)}
        <label className="block">
          <span className={label}>Line under the headline</span>
          <textarea value={content.subline} maxLength={120} rows={2} onChange={event => edit({ subline: event.target.value })} className="w-full rounded-xl border border-j-border px-3 py-2 text-sm" />
        </label>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>Points</legend>
        {content.features.map((feature, index) => <div key={index} className="space-y-2 rounded-xl border border-j-border p-2">
          <div className="flex items-center gap-2">
            <input aria-label={`Point ${index + 1}`} value={feature.text} maxLength={50} onChange={event => setFeature(index, { text: event.target.value })} className={`${field} min-w-0 flex-1`} />
            <button type="button" aria-label={`Remove point ${index + 1}`} onClick={() => edit({ features: content.features.filter((_, at) => at !== index) })} className="grid size-10 shrink-0 place-items-center rounded-xl text-rose-600 hover:bg-rose-50">
              <Trash2 size={16} aria-hidden="true" />
            </button>
          </div>
          <div className="flex flex-wrap gap-1" role="group" aria-label={`Icon of point ${index + 1}`}>
            {posterIconNames.map(icon => <button key={icon} type="button" aria-pressed={feature.icon === icon} aria-label={icon} onClick={() => setFeature(index, { icon })}
              className={`grid size-9 place-items-center rounded-lg border ${feature.icon === icon ? "border-j-accent bg-j-accent text-white" : "border-j-border text-j-ink"}`}>
              <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                {posterIcons[icon].map(d => <path key={d} d={d} />)}
              </svg>
            </button>)}
          </div>
        </div>)}
        {content.features.length < MAX_FEATURES ? <button type="button" onClick={() => edit({ features: [...content.features, { icon: "star", text: "" }] })} className="rounded-full border border-dashed border-j-accent px-3 py-1 text-xs font-semibold text-j-accent">+ Add point</button> : null}
      </fieldset>

      <fieldset className="grid gap-3 sm:grid-cols-2">
        <legend className={legend}>Badge, button and QR</legend>
        <label className="block">
          <span className={label}>Badge</span>
          <input value={content.badge} maxLength={60} onChange={event => edit({ badge: event.target.value })} className={field} />
        </label>
        <label className="block">
          <span className={label}>Button</span>
          <input value={content.cta} maxLength={24} onChange={event => edit({ cta: event.target.value })} className={field} />
        </label>
        <label className="block">
          <span className={label}>Tagline under the logo</span>
          <input value={content.tagline} maxLength={40} onChange={event => edit({ tagline: event.target.value })} className={field} />
        </label>
        <div className="space-y-1">
          <label className="flex items-center gap-2 text-sm font-semibold text-j-ink">
            <input type="checkbox" checked={content.showQr} onChange={event => edit({ showQr: event.target.checked })} className="size-4" /> QR code to Request a Tutor
          </label>
          {content.showQr ? <input aria-label="QR caption" value={content.qrCaption} maxLength={24} onChange={event => edit({ qrCaption: event.target.value })} className={field} /> : null}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>Contact line</legend>
        <div className="flex flex-wrap gap-2">
          {([["whatsapp", "WhatsApp"], ["website", "Website"]] as const).map(([value, name]) => <button key={value} type="button" aria-pressed={content.contact === value} onClick={() => edit({ contact: content.contact === value ? "none" : (value as PosterContact) })} className={chip(content.contact === value)}>{name}</button>)}
        </div>
        {content.contact === "website" ? <input aria-label="Website address" value={content.website} maxLength={60} onChange={event => edit({ website: event.target.value })} className={field} /> : null}
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>Text size</legend>
        <div className="flex flex-wrap gap-2">
          {SIZE_STEPS.map(([name, value]) => <button key={name} type="button" aria-pressed={draft.textSize.all === value} onClick={() => save({ ...draft, textSize: { ...draft.textSize, all: value } })} className={chip(draft.textSize.all === value)}>{name}</button>)}
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          {SIZE_PARTS.map(([key, name]) => (
            <label key={key} className="block">
              <span className={label}>{name} <span className="font-normal">{Math.round(draft.textSize[key] * 100)}%</span></span>
              <input type="range" aria-label={name} min={0.7} max={1.4} step={0.05} value={draft.textSize[key]} onChange={event => save({ ...draft, textSize: { ...draft.textSize, [key]: Number(event.target.value) } })} className="w-full accent-[var(--j-accent)]" />
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="space-y-3">
        <legend className={legend}>Fonts</legend>
        {fontPicker("headline", "শিরোনাম", "bn")}
        {fontPicker("body", "লেখা", "bn")}
        {fontPicker("english", "English", "en")}
      </fieldset>

      <fieldset>
        <legend className={legend}>Accent colour</legend>
        <div className="flex flex-wrap items-center gap-2">
          {ACCENTS.map(colour => <button key={colour} type="button" aria-label={`Accent ${colour}`} aria-pressed={(draft.accent ?? template.theme.accent) === colour} onClick={() => save({ ...draft, accent: colour === template.theme.accent ? null : colour })}
            className={`size-10 rounded-full border-2 ${(draft.accent ?? template.theme.accent) === colour ? "border-j-ink" : "border-white shadow"}`} style={{ background: colour }} />)}
          <input type="color" aria-label="Other accent colour" value={draft.accent ?? template.theme.accent} onChange={event => save({ ...draft, accent: event.target.value })} className="h-10 w-12 cursor-pointer rounded-lg border border-j-border bg-white p-1" />
        </div>
      </fieldset>

      <fieldset>
        <legend className={legend}>Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map(item => <button key={item.id} type="button" aria-pressed={item.id === size.id} onClick={() => setSizeId(item.id)} className={chip(item.id === size.id)}>
            {item.label} <span className="font-normal opacity-80">{item.width}×{item.height}</span>
          </button>)}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-6">
        <fieldset>
          <legend className={legend}>Format</legend>
          <div className="flex gap-2">
            {(["png", "jpg"] as const).map(item => <button key={item} type="button" aria-pressed={item === format} onClick={() => setFormat(item)} className={chip(item === format)}>{item.toUpperCase()}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className={legend}>Scale</legend>
          <div className="flex gap-2">
            {imageExportScales.map(item => <button key={item} type="button" aria-pressed={item === exportScale} disabled={item > largest} onClick={() => setScale(item)} className={chip(item === exportScale)}>{item}×</button>)}
          </div>
        </fieldset>
      </div>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void download()} disabled={saving || copying} className="inline-flex h-control items-center justify-center gap-2 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-60">
          <Download size={16} aria-hidden="true" />
          Download {format.toUpperCase()} · {size.width * exportScale}×{size.height * exportScale}
        </button>
        <button
          type="button"
          onClick={() => void copyImage()}
          disabled={copying || saving}
          className="inline-flex h-control items-center justify-center gap-2 rounded-xl border border-j-border bg-white px-4 text-sm font-bold text-j-ink hover:bg-j-surface-sunken disabled:opacity-60"
        >
          <Copy size={16} aria-hidden="true" />
          {copying ? "Copying..." : "Copy Image"}
        </button>
        <button type="button" onClick={() => save({ ...draft, content: template.content, accent: null })} className="inline-flex h-control items-center gap-2 rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">
          <RotateCcw size={16} aria-hidden="true" /> Template text
        </button>
      </div>
    </div>
  </div>;
}
