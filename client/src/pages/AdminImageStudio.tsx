import { useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useParams } from "wouter";
import { Download } from "lucide-react";
import { toast } from "sonner";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { ImageStudioColourPicker } from "@/components/ImageStudioColourPicker";
import { LogoStudioContent } from "@/pages/AdminLogoStudio";
import { PosterStudioContent } from "@/pages/AdminPosterStudio";
import { ImageStudioFontPicker } from "@/components/ImageStudioFontPicker";
import { trpc } from "@/lib/trpc";
import { loadPosterFonts } from "@/lib/poster/canvas-kit";
import { DEFAULT_STUDIO_COLOUR, findStudioColour, setOwnStudioColours, type StudioColourMarks } from "@/lib/image-studio-colours";
import {
  DEFAULT_BANGLA_FONT,
  DEFAULT_ENGLISH_FONT,
  findStudioFont,
  loadStudioFont,
  setUploadedStudioFonts,
  studioFontBoldWeight,
  studioFontFamily,
  studioFontPairs,
  type StudioFontMarks,
} from "@/lib/image-studio-fonts";
import {
  canvasToImageBlob,
  drawTestPlate,
  imageExportScales,
  imageFileName,
  imageStudioSectionLabels,
  imageStudioSizes,
  isImageStudioSection,
  maxScaleFor,
  saveBlob,
  type ImageExportFormat,
  type ImageExportScale,
  type ImageStudioSection,
  type PlateText,
  type PlateTextMode,
} from "@/lib/image-studio";

const chip = (active: boolean) =>
  `h-control rounded-xl border px-3 text-sm font-semibold transition ${active ? "border-j-accent bg-j-accent text-white" : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"} disabled:cursor-not-allowed disabled:opacity-40`;

const TEXT_CHOICE_KEY = "connect-image-studio-text-v1";
type TextChoice = { mode: PlateTextMode; bn: string; en: string; colour: string };
const DEFAULT_TEXT_CHOICE: TextChoice = { mode: "bn", bn: DEFAULT_BANGLA_FONT, en: DEFAULT_ENGLISH_FONT, colour: DEFAULT_STUDIO_COLOUR };

/** The last language and faces this Admin used, on this device only; anything unknown falls back to the defaults. */
function readTextChoice(): TextChoice {
  try {
    const saved = JSON.parse(window.localStorage.getItem(TEXT_CHOICE_KEY) ?? "null") as Partial<TextChoice> | null;
    if (!saved) return DEFAULT_TEXT_CHOICE;
    return {
      mode: saved.mode === "en" || saved.mode === "mixed" ? saved.mode : "bn",
      bn: saved.bn && findStudioFont(saved.bn)?.script === "bn" ? saved.bn : DEFAULT_BANGLA_FONT,
      en: saved.en && findStudioFont(saved.en)?.script === "en" ? saved.en : DEFAULT_ENGLISH_FONT,
      colour: saved.colour && findStudioColour(saved.colour) ? saved.colour : DEFAULT_STUDIO_COLOUR,
    };
  } catch {
    return DEFAULT_TEXT_CHOICE;
  }
}

function plateTextFor(choice: TextChoice): PlateText {
  return {
    mode: choice.mode,
    bnFamily: studioFontFamily(choice.bn),
    bnWeight: studioFontBoldWeight(choice.bn),
    enFamily: studioFontFamily(choice.en),
    enWeight: studioFontBoldWeight(choice.en),
  };
}

const modeLabels: Record<PlateTextMode, string> = { bn: "বাংলা", en: "English", mixed: "মিশ্র" };

/** One studio, three sections: the preview on top, then the size, the file type and the sharpness, then Download. */
export function ImageStudioContent({ section }: { section: ImageStudioSection }) {
  const sizes = imageStudioSizes[section];
  const [sizeId, setSizeId] = useState(sizes[0].id);
  const [format, setFormat] = useState<ImageExportFormat>("png");
  const [scale, setScale] = useState<ImageExportScale>(2);
  const [saving, setSaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);
  const [choice, setChoice] = useState<TextChoice>(readTextChoice);
  const [textFontsReady, setTextFontsReady] = useState(0);
  const utils = trpc.useUtils();
  const marksQuery = trpc.imageStudio.marks.useQuery();
  const uploadedQuery = trpc.imageStudio.uploadedFonts.useQuery();
  const deleteFont = trpc.imageStudio.deleteFont.useMutation({
    onSuccess: () => {
      void utils.imageStudio.uploadedFonts.invalidate();
      void utils.imageStudio.marks.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  // The Owner's uploads join the library before anything below reads it (cheap, and the same list gives the same result).
  setUploadedStudioFonts(uploadedQuery.data ?? []);
  const onUploaded = () => {
    void utils.imageStudio.uploadedFonts.invalidate();
    toast.success("Font added.");
  };
  const onDelete = (id: string) => {
    deleteFont.mutate({ id });
    setChoice(previous => ({ ...previous, bn: previous.bn === id ? DEFAULT_BANGLA_FONT : previous.bn, en: previous.en === id ? DEFAULT_ENGLISH_FONT : previous.en }));
  };
  const setMark = trpc.imageStudio.setMark.useMutation({
    onSuccess: () => void utils.imageStudio.marks.invalidate(),
    onError: error => toast.error(error.message),
  });
  const ownColoursQuery = trpc.imageStudio.ownColours.useQuery();
  const addColour = trpc.imageStudio.addColour.useMutation({
    onSuccess: () => {
      void utils.imageStudio.ownColours.invalidate();
      toast.success("Colour saved.");
    },
    onError: error => toast.error(error.message),
  });
  const deleteColour = trpc.imageStudio.deleteColour.useMutation({
    onSuccess: () => {
      void utils.imageStudio.ownColours.invalidate();
      void utils.imageStudio.marks.invalidate();
    },
    onError: error => toast.error(error.message),
  });
  setOwnStudioColours(ownColoursQuery.data ?? []);
  const colourMarks: StudioColourMarks = useMemo(
    () => new Map((marksQuery.data?.marks ?? []).filter(mark => mark.kind === "colour").map(mark => [mark.itemId, { starred: mark.starred, archived: mark.archived }])),
    [marksQuery.data],
  );
  const marks: StudioFontMarks = useMemo(
    () => new Map((marksQuery.data?.marks ?? []).filter(mark => mark.kind === "font").map(mark => [mark.itemId, { starred: mark.starred, archived: mark.archived }])),
    [marksQuery.data],
  );
  const canEdit = Boolean(marksQuery.data?.canEdit);
  const plateText = useMemo(() => plateTextFor(choice), [choice]);
  const onMark = (itemId: string, change: { starred?: boolean; archived?: boolean }) => setMark.mutate({ kind: "font", itemId, ...change });
  const onColourMark = (itemId: string, change: { starred?: boolean; archived?: boolean }) => setMark.mutate({ kind: "colour", itemId, ...change });
  const onDeleteColour = (id: string) => {
    deleteColour.mutate({ id });
    setChoice(previous => (previous.colour === id ? { ...previous, colour: DEFAULT_STUDIO_COLOUR } : previous));
  };
  const colours = findStudioColour(choice.colour) ?? findStudioColour(DEFAULT_STUDIO_COLOUR);
  const pairs = studioFontPairs.filter(pair => !marks.get(pair.bn)?.archived && !marks.get(pair.en)?.archived);

  const updateChoice = (next: Partial<TextChoice>) => setChoice(previous => {
    const merged = { ...previous, ...next };
    try {
      window.localStorage.setItem(TEXT_CHOICE_KEY, JSON.stringify(merged));
    } catch {
      // Without storage the choice simply resets next visit.
    }
    return merged;
  });

  // The picked faces are fetched before they are drawn, so the preview never shows a stand-in font.
  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadStudioFont(choice.bn), loadStudioFont(choice.en)]).then(() => {
      if (!cancelled) setTextFontsReady(count => count + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [choice.bn, choice.en]);

  const size = useMemo(() => sizes.find(item => item.id === sizeId) ?? sizes[0], [sizes, sizeId]);
  const largest = maxScaleFor(size);
  const exportScale = Math.min(scale, largest) as ImageExportScale;

  // A new section starts from its own first size.
  useEffect(() => setSizeId(imageStudioSizes[section][0].id), [section]);

  useEffect(() => {
    let cancelled = false;
    void loadPosterFonts().then(() => {
      if (!cancelled) setFontsReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (preview.current) drawTestPlate(preview.current, section, size, 1, plateText, colours);
  }, [section, size, fontsReady, plateText, textFontsReady, colours]);

  const download = async () => {
    setSaving(true);
    try {
      await Promise.all([loadStudioFont(choice.bn), loadStudioFont(choice.en)]);
      const canvas = document.createElement("canvas");
      drawTestPlate(canvas, section, size, exportScale, plateText, colours);
      saveBlob(await canvasToImageBlob(canvas, format), imageFileName(section, size, format, exportScale));
    } catch (error) {
      toast.error((error as Error).message || "The image could not be made.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-4">
    <div className="grid place-items-center rounded-xl border border-j-border bg-j-surface-sunken p-3 sm:p-5">
      <canvas
        ref={preview}
        data-testid="image-studio-preview"
        aria-label={`${imageStudioSectionLabels[section]} preview, ${size.width} by ${size.height}`}
        className="h-auto max-h-[60vh] w-auto max-w-full rounded-lg shadow-sm"
      />
    </div>

    <div className="space-y-4 rounded-xl border border-j-border bg-white p-4">
      <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Text</legend>
        <div className="flex flex-wrap gap-2">
          {(["bn", "en", "mixed"] as const).map(mode => <button key={mode} type="button" aria-pressed={mode === choice.mode} onClick={() => updateChoice({ mode })} className={chip(mode === choice.mode)}>{modeLabels[mode]}</button>)}
        </div>
        {choice.mode !== "en" ? <ImageStudioFontPicker label="বাংলা" script="bn" value={choice.bn} onChange={bn => updateChoice({ bn })} marks={marks} canEdit={canEdit} onMark={onMark} onUploaded={onUploaded} onDelete={onDelete} busy={setMark.isPending || deleteFont.isPending} /> : null}
        {choice.mode !== "bn" ? <ImageStudioFontPicker label="English" script="en" value={choice.en} onChange={en => updateChoice({ en })} marks={marks} canEdit={canEdit} onMark={onMark} onUploaded={onUploaded} onDelete={onDelete} busy={setMark.isPending || deleteFont.isPending} /> : null}
        {choice.mode === "mixed" && pairs.length > 0 ? <div className="flex flex-wrap gap-2" role="group" aria-label="Font pairs">
          {pairs.map(pair => {
            const active = pair.bn === choice.bn && pair.en === choice.en;
            return <button key={pair.code} type="button" aria-pressed={active} onClick={() => updateChoice({ bn: pair.bn, en: pair.en })}
              className={`rounded-full border px-3 py-1 text-xs font-semibold ${active ? "border-j-accent bg-j-accent text-white" : "border-j-border text-j-ink"}`}>
              {pair.code} · {findStudioFont(pair.bn)?.name} + {findStudioFont(pair.en)?.name}
            </button>;
          })}
        </div> : null}
      </fieldset>

      <ImageStudioColourPicker
        value={choice.colour}
        onChange={colour => updateChoice({ colour })}
        marks={colourMarks}
        canEdit={canEdit}
        onMark={onColourMark}
        onAdd={colour => addColour.mutate(colour)}
        onDelete={onDeleteColour}
        busy={setMark.isPending || addColour.isPending || deleteColour.isPending}
      />

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Size</legend>
        <div className="flex flex-wrap gap-2">
          {sizes.map(item => <button key={item.id} type="button" aria-pressed={item.id === size.id} onClick={() => setSizeId(item.id)} className={chip(item.id === size.id)}>
            {item.label} <span className="font-normal opacity-80">{item.width}×{item.height}</span>
          </button>)}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-6">
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Format</legend>
          <div className="flex gap-2">
            {(["png", "jpg"] as const).map(item => <button key={item} type="button" aria-pressed={item === format} onClick={() => setFormat(item)} className={chip(item === format)}>{item.toUpperCase()}</button>)}
          </div>
        </fieldset>
        <fieldset>
          <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Scale</legend>
          <div className="flex gap-2">
            {imageExportScales.map(item => <button key={item} type="button" aria-pressed={item === exportScale} disabled={item > largest} onClick={() => setScale(item)} className={chip(item === exportScale)}>{item}×</button>)}
          </div>
        </fieldset>
      </div>

      <button type="button" onClick={() => void download()} disabled={saving} className="inline-flex h-control w-full items-center justify-center gap-2 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-60 sm:w-auto">
        <Download size={16} aria-hidden="true" />
        Download {format.toUpperCase()} · {size.width * exportScale}×{size.height * exportScale}
      </button>
    </div>
  </div>;
}

export default function AdminImageStudio() {
  const { section } = useParams<{ section: string }>();
  if (!isImageStudioSection(section)) return <Redirect to="/admin/images/poster" />;
  return <AdminWorkspaceLayout title={imageStudioSectionLabels[section]}>
    {section === "logo" ? <LogoStudioContent /> : section === "poster" ? <PosterStudioContent /> : <ImageStudioContent section={section} />}
  </AdminWorkspaceLayout>;
}
