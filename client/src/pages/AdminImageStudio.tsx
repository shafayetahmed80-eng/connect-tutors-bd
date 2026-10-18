import { useEffect, useMemo, useRef, useState } from "react";
import { Redirect, useParams } from "wouter";
import { Download } from "lucide-react";
import { toast } from "sonner";
import AdminWorkspaceLayout from "@/components/AdminWorkspaceLayout";
import { loadPosterFonts } from "@/lib/poster/canvas-kit";
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
} from "@/lib/image-studio";

const chip = (active: boolean) =>
  `h-control rounded-xl border px-3 text-sm font-semibold transition ${active ? "border-j-accent bg-j-accent text-white" : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"} disabled:cursor-not-allowed disabled:opacity-40`;

/** One studio, three sections: the preview on top, then the size, the file type and the sharpness, then Download. */
export function ImageStudioContent({ section }: { section: ImageStudioSection }) {
  const sizes = imageStudioSizes[section];
  const [sizeId, setSizeId] = useState(sizes[0].id);
  const [format, setFormat] = useState<ImageExportFormat>("png");
  const [scale, setScale] = useState<ImageExportScale>(2);
  const [saving, setSaving] = useState(false);
  const [fontsReady, setFontsReady] = useState(false);
  const preview = useRef<HTMLCanvasElement>(null);

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
    if (preview.current) drawTestPlate(preview.current, section, size, 1);
  }, [section, size, fontsReady]);

  const download = async () => {
    setSaving(true);
    try {
      const canvas = document.createElement("canvas");
      drawTestPlate(canvas, section, size, exportScale);
      saveBlob(await canvasToImageBlob(canvas, format), imageFileName(section, size, format, exportScale));
    } catch (error) {
      toast.error((error as Error).message || "The image could not be made.");
    } finally {
      setSaving(false);
    }
  };

  return <div className="space-y-4">
    <div className="grid place-items-center rounded-2xl border border-j-border bg-j-surface-sunken p-3 sm:p-5">
      <canvas
        ref={preview}
        data-testid="image-studio-preview"
        aria-label={`${imageStudioSectionLabels[section]} preview, ${size.width} by ${size.height}`}
        className="h-auto max-h-[60vh] w-auto max-w-full rounded-lg shadow-sm"
      />
    </div>

    <div className="space-y-4 rounded-2xl border border-j-border bg-white p-4">
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
    <ImageStudioContent section={section} />
  </AdminWorkspaceLayout>;
}
