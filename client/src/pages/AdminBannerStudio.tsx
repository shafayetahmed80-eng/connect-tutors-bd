import { useEffect, useMemo, useRef, useState } from "react";
import { Check, Copy, Download, Eye, EyeOff, RotateCcw } from "lucide-react";
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
  bannerTemplates,
  bannerThemes,
  findBannerTemplate,
  findBannerTheme,
  formatBannerPhone,
  getBannerSafeZone,
  renderBanner,
  type BannerContent,
  type BannerPill,
  type BannerRenderInput,
  type BannerSizeId,
  type BannerThemeId,
} from "@/lib/banner-studio";
import { posterIconNames, type PosterIconName } from "@/lib/poster-studio";

const DRAFT_KEY = "connect-banner-studio-v1";

type FontChoice = {
  headline: string;
  body: string;
  english: string;
};

const DEFAULT_FONTS: FontChoice = {
  headline: "anek-bangla",
  body: "noto-sans-bengali",
  english: "dm-sans",
};

type BannerDraft = {
  templateId: string;
  themeId: BannerThemeId;
  sizeId: BannerSizeId;
  content: BannerContent;
  fonts: FontChoice;
};

const chip = (active: boolean) =>
  `h-control rounded-xl border px-3 text-sm font-semibold transition ${
    active ? "border-j-accent bg-j-accent text-white" : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"
  } disabled:cursor-not-allowed disabled:opacity-40`;

const field = "h-control w-full rounded-xl border border-j-border px-3 text-sm text-j-ink focus:border-j-accent focus:outline-none focus:ring-1 focus:ring-j-accent";
const label = "mb-1 block text-xs font-bold text-j-ink-soft";
const legend = "mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft";

function readDraft(): BannerDraft {
  const defaultTemplate = bannerTemplates[0];
  const fresh: BannerDraft = {
    templateId: defaultTemplate.id,
    themeId: defaultTemplate.defaultTheme,
    sizeId: "facebook-cover",
    content: defaultTemplate.content,
    fonts: DEFAULT_FONTS,
  };

  try {
    const saved = JSON.parse(window.localStorage.getItem(DRAFT_KEY) ?? "null") as Partial<BannerDraft> | null;
    if (!saved || !saved.templateId || !findBannerTemplate(saved.templateId)) return fresh;

    const template = findBannerTemplate(saved.templateId);
    const knownFont = (id: string | undefined, script: "bn" | "en", fallback: string) =>
      id && findStudioFont(id)?.script === script ? id : fallback;

    return {
      templateId: template.id,
      themeId: saved.themeId && bannerThemes.some(t => t.id === saved.themeId) ? saved.themeId : template.defaultTheme,
      sizeId: saved.sizeId && ["facebook-cover", "share-banner", "youtube-banner"].includes(saved.sizeId)
        ? saved.sizeId
        : "facebook-cover",
      content: { ...template.content, ...(saved.content ?? {}) },
      fonts: {
        headline: knownFont(saved.fonts?.headline, "bn", DEFAULT_FONTS.headline),
        body: knownFont(saved.fonts?.body, "bn", DEFAULT_FONTS.body),
        english: knownFont(saved.fonts?.english, "en", DEFAULT_FONTS.english),
      },
    };
  } catch {
    return fresh;
  }
}

/**
 * The Banner Studio: allows admins to create and download high-resolution
 * Facebook Covers, Link Share banners and YouTube channel art with brand themes,
 * safe-zone guides and 1-click clipboard copy.
 */
export function BannerStudioContent() {
  const [draft, setDraft] = useState<BannerDraft>(readDraft);
  const [format, setFormat] = useState<ImageExportFormat>("png");
  const [scale, setScale] = useState<ImageExportScale>(1);
  const [saving, setSaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const [showSafeZone, setShowSafeZone] = useState(false);
  const [fontsReady, setFontsReady] = useState(0);
  const preview = useRef<HTMLCanvasElement>(null);
  const contact = useSiteContact();

  const utils = trpc.useUtils();
  const marksQuery = trpc.imageStudio.marks.useQuery();
  const uploadedQuery = trpc.imageStudio.uploadedFonts.useQuery();
  const setMark = trpc.imageStudio.setMark.useMutation({
    onSuccess: () => void utils.imageStudio.marks.invalidate(),
    onError: error => toast.error(error.message),
  });
  const deleteFont = trpc.imageStudio.deleteFont.useMutation({
    onSuccess: () => {
      void utils.imageStudio.uploadedFonts.invalidate();
      void utils.imageStudio.marks.invalidate();
    },
    onError: error => toast.error(error.message),
  });

  setUploadedStudioFonts(uploadedQuery.data ?? []);
  const marks: StudioFontMarks = useMemo(
    () =>
      new Map(
        (marksQuery.data?.marks ?? [])
          .filter(mark => mark.kind === "font")
          .map(mark => [mark.itemId, { starred: mark.starred, archived: mark.archived }]),
      ),
    [marksQuery.data],
  );
  const canEdit = Boolean(marksQuery.data?.canEdit);

  const template = findBannerTemplate(draft.templateId);
  const theme = findBannerTheme(draft.themeId);
  const sizes = imageStudioSizes.banner;
  const size = sizes.find(item => item.id === draft.sizeId) ?? sizes[0];
  const largest = maxScaleFor(size);
  const exportScale = Math.min(scale, largest) as ImageExportScale;
  const safeZone = getBannerSafeZone(draft.sizeId, size.width, size.height);

  const save = (next: BannerDraft) => {
    setDraft(next);
    try {
      window.localStorage.setItem(DRAFT_KEY, JSON.stringify(next));
    } catch {
      // Without storage, draft is maintained in state
    }
  };

  const editContent = (change: Partial<BannerContent>) =>
    save({ ...draft, content: { ...draft.content, ...change } });

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

  const renderInput = (renderScale: number, withOverlay = showSafeZone): BannerRenderInput => ({
    width: size.width,
    height: size.height,
    scale: renderScale,
    sizeId: draft.sizeId,
    template,
    theme,
    content: {
      ...draft.content,
      phone: draft.content.phone || formatBannerPhone(contact.number),
    },
    fonts: {
      headline: studioFontFamily(draft.fonts.headline),
      headlineWeight: studioFontBoldWeight(draft.fonts.headline),
      body: studioFontFamily(draft.fonts.body),
      bodyWeight: studioFontRegularWeight(draft.fonts.body),
      english: studioFontFamily(draft.fonts.english),
      englishWeight: studioFontBoldWeight(draft.fonts.english),
    },
    showSafeZoneOverlay: withOverlay,
  });

  useEffect(() => {
    if (preview.current) {
      renderBanner(preview.current, renderInput(1, showSafeZone));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [draft, size, fontsReady, showSafeZone, contact.number]);

  const selectTemplate = (templateId: string) => {
    const picked = findBannerTemplate(templateId);
    save({
      ...draft,
      templateId,
      themeId: picked.defaultTheme,
      content: { ...picked.content },
    });
    toast.success(`Template applied: ${picked.name}`);
  };

  const resetToTemplate = () => {
    save({
      ...draft,
      themeId: template.defaultTheme,
      content: { ...template.content },
      fonts: DEFAULT_FONTS,
    });
    toast.success("Draft reset to template defaults.");
  };

  const copyToClipboard = async () => {
    if (typeof ClipboardItem === "undefined" || !navigator.clipboard?.write) {
      toast.error("Clipboard image copy is not supported in this browser.");
      return;
    }
    try {
      await Promise.all(fontIds.map(id => loadStudioFont(id)));
      const canvas = document.createElement("canvas");
      // Render without safe-zone overlay when exporting
      renderBanner(canvas, renderInput(1, false));
      const blob = await canvasToImageBlob(canvas, "png");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
      setCopied(true);
      toast.success("Banner image copied to clipboard! Ready to paste (Ctrl+V).");
      setTimeout(() => setCopied(false), 2500);
    } catch (err) {
      toast.error("Could not copy image to clipboard: " + (err as Error).message);
    }
  };

  const download = async () => {
    setSaving(true);
    try {
      await Promise.all(fontIds.map(id => loadStudioFont(id)));
      const canvas = document.createElement("canvas");
      // Render without safe-zone overlay when exporting
      renderBanner(canvas, renderInput(exportScale, false));
      const blob = await canvasToImageBlob(canvas, format);
      const filename = `connect-tutors-banner-${draft.sizeId}-${size.width * exportScale}x${size.height * exportScale}.${format}`;
      saveBlob(blob, filename);
      toast.success(`Banner downloaded (${size.width * exportScale}×${size.height * exportScale})`);
    } catch (error) {
      toast.error((error as Error).message || "The banner could not be made.");
    } finally {
      setSaving(false);
    }
  };

  const updatePill = (index: number, change: Partial<BannerPill>) => {
    const pills = draft.content.pills.map((pill, idx) => (idx === index ? { ...pill, ...change } : pill));
    editContent({ pills });
  };

  const addPill = () => {
    if (draft.content.pills.length >= 4) {
      toast.error("Maximum 4 pills allowed for visual balance.");
      return;
    }
    editContent({
      pills: [...draft.content.pills, { icon: "star", text: "নতুন ফিচার বা পয়েন্ট" }],
    });
  };

  const removePill = (index: number) => {
    if (draft.content.pills.length <= 1) {
      toast.error("At least 1 pill is recommended.");
      return;
    }
    editContent({
      pills: draft.content.pills.filter((_, idx) => idx !== index),
    });
  };

  return (
    <div className="space-y-5">
      {/* 1. Preview Stage */}
      <div className="relative flex flex-col items-center justify-center rounded-2xl border border-j-border bg-j-surface-sunken p-3 sm:p-6 shadow-sm">
        <div className="mb-3 flex w-full flex-wrap items-center justify-between gap-2 px-1">
          <div className="flex items-center gap-2 text-xs font-semibold text-j-ink">
            <span className="rounded-md bg-white px-2.5 py-1 border border-j-border shadow-2xs">
              {size.label} · {size.width}×{size.height}
            </span>
            {showSafeZone && (
              <span className="inline-flex items-center gap-1 rounded-md bg-amber-50 px-2 py-0.5 text-amber-800 border border-amber-200">
                Safe-Zone Active
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setShowSafeZone(v => !v)}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border bg-white px-2.5 text-xs font-semibold text-j-ink hover:bg-j-surface-sunken transition shadow-2xs"
              title="Toggle safe zone guide overlay"
            >
              {showSafeZone ? <EyeOff size={14} /> : <Eye size={14} />}
              <span>{showSafeZone ? "Hide Safe Area" : "Show Safe Area"}</span>
            </button>
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-j-border bg-white px-2.5 text-xs font-semibold text-j-ink hover:bg-j-surface-sunken transition shadow-2xs"
              title="Copy image to clipboard"
            >
              {copied ? <Check size={14} className="text-emerald-600" /> : <Copy size={14} />}
              <span>{copied ? "Copied!" : "Copy Image"}</span>
            </button>
          </div>
        </div>

        <canvas
          ref={preview}
          data-testid="banner-studio-preview"
          aria-label={`Banner preview, ${size.width} by ${size.height}`}
          className="h-auto max-h-[55vh] w-auto max-w-full rounded-xl border border-j-border/60 shadow-md"
        />

        {showSafeZone && (
          <p className="mt-2 text-center text-xs font-medium text-amber-700">
            ℹ️ {safeZone.description}
          </p>
        )}
      </div>

      {/* 2. Control Panels */}
      <div className="space-y-6 rounded-2xl border border-j-border bg-white p-4 sm:p-6 shadow-2xs">
        {/* Template Selector */}
        <fieldset>
          <legend className={legend}>Templates (রেডিমেড ডিজাইন টেমপ্লেট)</legend>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {bannerTemplates.map(tmpl => {
              const active = tmpl.id === draft.templateId;
              return (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => selectTemplate(tmpl.id)}
                  className={`flex flex-col items-start rounded-xl border p-3 text-left transition ${
                    active
                      ? "border-j-accent bg-blue-50/50 ring-2 ring-j-accent/20"
                      : "border-j-border bg-white hover:border-j-ink/30 hover:bg-j-surface-sunken"
                  }`}
                >
                  <span className={`text-sm font-bold ${active ? "text-j-accent" : "text-j-ink"}`}>
                    {tmpl.name}
                  </span>
                  <span className="mt-0.5 line-clamp-1 text-xs text-j-ink-soft">
                    {tmpl.content.headlineMain}
                  </span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Banner Platform Size Selector */}
        <fieldset>
          <legend className={legend}>Banner Platform & Size (প্ল্যাটফর্ম ও সাইজ)</legend>
          <div className="flex flex-wrap gap-2">
            {sizes.map(item => {
              const active = item.id === draft.sizeId;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => save({ ...draft, sizeId: item.id as BannerSizeId })}
                  className={chip(active)}
                >
                  {item.label} <span className="font-normal opacity-75">{item.width}×{item.height}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Theme / Colourways */}
        <fieldset>
          <legend className={legend}>Color Theme (ব্র্যান্ড কালার থিম)</legend>
          <div className="flex flex-wrap gap-2.5">
            {bannerThemes.map(th => {
              const active = th.id === draft.themeId;
              return (
                <button
                  key={th.id}
                  type="button"
                  onClick={() => save({ ...draft, themeId: th.id })}
                  className={`inline-flex items-center gap-2 rounded-xl border px-3 py-2 text-sm font-semibold transition ${
                    active ? "border-j-accent bg-blue-50/60 ring-2 ring-j-accent/20" : "border-j-border bg-white hover:bg-j-surface-sunken"
                  }`}
                >
                  <span
                    className="h-4 w-4 rounded-full border border-black/10 shadow-2xs"
                    style={{ background: `linear-gradient(135deg, ${th.gradientStops[0][1]}, ${th.accent})` }}
                  />
                  <span className={active ? "text-j-accent font-bold" : "text-j-ink"}>{th.name}</span>
                </button>
              );
            })}
          </div>
        </fieldset>

        {/* Typography / Font Pickers */}
        <fieldset className="space-y-3">
          <legend className={legend}>Typography (টাইপোগ্রাফি ও ফন্ট)</legend>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <ImageStudioFontPicker
              label="হেডলাইন ফন্ট (বাংলা)"
              script="bn"
              value={draft.fonts.headline}
              onChange={headline => save({ ...draft, fonts: { ...draft.fonts, headline } })}
              marks={marks}
              canEdit={canEdit}
              onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })}
              onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()}
              onDelete={id => deleteFont.mutate({ id })}
              busy={setMark.isPending || deleteFont.isPending}
            />
            <ImageStudioFontPicker
              label="বডি ও বিবরণ ফন্ট (বাংলা)"
              script="bn"
              value={draft.fonts.body}
              onChange={body => save({ ...draft, fonts: { ...draft.fonts, body } })}
              marks={marks}
              canEdit={canEdit}
              onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })}
              onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()}
              onDelete={id => deleteFont.mutate({ id })}
              busy={setMark.isPending || deleteFont.isPending}
            />
            <ImageStudioFontPicker
              label="English Font"
              script="en"
              value={draft.fonts.english}
              onChange={english => save({ ...draft, fonts: { ...draft.fonts, english } })}
              marks={marks}
              canEdit={canEdit}
              onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })}
              onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()}
              onDelete={id => deleteFont.mutate({ id })}
              busy={setMark.isPending || deleteFont.isPending}
            />
          </div>
        </fieldset>

        {/* Content Details */}
        <div className="space-y-4 border-t border-j-border pt-5">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-j-ink">Banner Content (ব্যানারের তথ্যাবলি)</h3>
            <button
              type="button"
              onClick={resetToTemplate}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-j-ink-soft hover:text-j-ink"
            >
              <RotateCcw size={13} />
              <span>Reset to template defaults</span>
            </button>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className={label}>ট্যাগলাইন / ব্র্যান্ড ব্যাজ</label>
              <input
                type="text"
                value={draft.content.tagline}
                onChange={e => editContent({ tagline: e.target.value })}
                className={field}
                placeholder="কানেক্ট টিউটরস · বিশ্বস্ত গৃহশিক্ষক ম্যাচিং প্ল্যাটফর্ম"
              />
            </div>
            <div>
              <label className={label}>ট্রাস্ট ব্যাজ (Official Seal / Trust Line)</label>
              <input
                type="text"
                value={draft.content.badge}
                onChange={e => editContent({ badge: e.target.value })}
                className={field}
                placeholder="Since 2015 | BTPA Member · Code: BTPA-077"
              />
            </div>

            <div>
              <label className={label}>মূল হেডলাইন (Line 1 - White)</label>
              <input
                type="text"
                value={draft.content.headlineMain}
                onChange={e => editContent({ headlineMain: e.target.value })}
                className={field}
                placeholder="আপনার সন্তানের জন্য"
              />
            </div>
            <div>
              <label className={label}>অ্যাকসেন্ট হেডলাইন (Line 2 - Highlight)</label>
              <input
                type="text"
                value={draft.content.headlineAccent}
                onChange={e => editContent({ headlineAccent: e.target.value })}
                className={field}
                placeholder="সেরা শিক্ষক খুঁজুন"
              />
            </div>

            <div className="sm:col-span-2">
              <label className={label}>সাব-লাইন / সংক্ষিপ্ত বিবরণ</label>
              <textarea
                rows={2}
                value={draft.content.subline}
                onChange={e => editContent({ subline: e.target.value })}
                className="w-full rounded-xl border border-j-border p-3 text-sm text-j-ink focus:border-j-accent focus:outline-none focus:ring-1 focus:ring-j-accent"
                placeholder="সারা বাংলাদেশে অভিজ্ঞ ও যাচাইকৃত বিশ্ববিদ্যালয় পড়ুয়া টিউটর এক ঠিকানায়।"
              />
            </div>
          </div>

          {/* Feature Pills */}
          <div className="space-y-2.5 rounded-xl border border-j-border/80 bg-j-surface-sunken/40 p-3.5">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wide text-j-ink-soft">
                Feature Highlights / Pills (বৈশিষ্ট্য ও সেবা চিপস)
              </span>
              {draft.content.pills.length < 4 && (
                <button
                  type="button"
                  onClick={addPill}
                  className="text-xs font-bold text-j-accent hover:underline"
                >
                  + Add Point
                </button>
              )}
            </div>

            <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
              {draft.content.pills.map((pill, idx) => (
                <div key={idx} className="flex items-center gap-2">
                  <select
                    value={pill.icon}
                    onChange={e => updatePill(idx, { icon: e.target.value as PosterIconName })}
                    className="h-9 rounded-lg border border-j-border bg-white px-2 text-xs font-medium text-j-ink"
                  >
                    {posterIconNames.map(name => (
                      <option key={name} value={name}>
                        {name}
                      </option>
                    ))}
                  </select>
                  <input
                    type="text"
                    value={pill.text}
                    onChange={e => updatePill(idx, { text: e.target.value })}
                    className="h-9 flex-1 rounded-lg border border-j-border bg-white px-2.5 text-xs text-j-ink"
                    placeholder="পয়েন্টের বিবরণ..."
                  />
                  {draft.content.pills.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removePill(idx)}
                      className="px-1.5 text-xs font-bold text-red-500 hover:text-red-700"
                      title="Remove point"
                    >
                      ×
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Contact & CTA settings */}
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className={label}>কল-টু-অ্যাকশন (CTA Button)</label>
              <input
                type="text"
                value={draft.content.ctaText}
                onChange={e => editContent({ ctaText: e.target.value })}
                className={field}
                placeholder="টিউশন রিকোয়েস্ট দিন"
              />
            </div>
            <div>
              <label className={label}>হটলাইন / হোয়াটসঅ্যাপ নম্বর</label>
              <input
                type="text"
                value={draft.content.phone}
                onChange={e => editContent({ phone: e.target.value })}
                className={field}
                placeholder="+880 1516-131411"
              />
            </div>
            <div>
              <label className={label}>ওয়েবসাইট ঠিকানা</label>
              <input
                type="text"
                value={draft.content.website}
                onChange={e => editContent({ website: e.target.value })}
                className={field}
                placeholder="connecttutorsbd.com"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4 pt-1">
            <label className="flex cursor-pointer items-center gap-2 text-xs font-semibold text-j-ink">
              <input
                type="checkbox"
                checked={draft.content.showQr}
                onChange={e => editContent({ showQr: e.target.checked })}
                className="h-4 w-4 rounded border-j-border text-j-accent focus:ring-j-accent"
              />
              <span>কিউআর কোড (QR Tile) প্রদর্শন করুন</span>
            </label>

            {draft.content.showQr && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-j-ink-soft">ক্যাপশন:</span>
                <input
                  type="text"
                  value={draft.content.qrCaption}
                  onChange={e => editContent({ qrCaption: e.target.value })}
                  className="h-8 rounded-lg border border-j-border px-2 text-xs text-j-ink"
                  placeholder="স্ক্যান করুন"
                />
              </div>
            )}
          </div>
        </div>

        {/* 3. Export & Download Bar */}
        <div className="flex flex-wrap items-end justify-between gap-4 border-t border-j-border pt-5">
          <div className="flex flex-wrap items-center gap-5">
            <fieldset>
              <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Format</legend>
              <div className="flex gap-1.5">
                {(["png", "jpg"] as const).map(item => (
                  <button
                    key={item}
                    type="button"
                    onClick={() => setFormat(item)}
                    className={chip(item === format)}
                  >
                    {item.toUpperCase()}
                  </button>
                ))}
              </div>
            </fieldset>

            <fieldset>
              <legend className="mb-1 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Sharpness / Scale</legend>
              <div className="flex gap-1.5">
                {imageExportScales.map(item => (
                  <button
                    key={item}
                    type="button"
                    disabled={item > largest}
                    onClick={() => setScale(item)}
                    className={chip(item === exportScale)}
                  >
                    {item}×
                  </button>
                ))}
              </div>
            </fieldset>
          </div>

          <div className="flex w-full flex-wrap gap-2.5 sm:w-auto">
            <button
              type="button"
              onClick={copyToClipboard}
              className="inline-flex h-control w-full items-center justify-center gap-2 rounded-xl border border-j-border bg-white px-4 text-sm font-bold text-j-ink hover:bg-j-surface-sunken sm:w-auto transition shadow-2xs"
            >
              {copied ? <Check size={16} className="text-emerald-600" /> : <Copy size={16} />}
              <span>{copied ? "Copied!" : "Copy Image"}</span>
            </button>

            <button
              type="button"
              onClick={() => void download()}
              disabled={saving}
              className="inline-flex h-control w-full items-center justify-center gap-2 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-60 sm:w-auto transition shadow-sm"
            >
              <Download size={16} aria-hidden="true" />
              <span>
                Download {format.toUpperCase()} · {size.width * exportScale}×{size.height * exportScale}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
