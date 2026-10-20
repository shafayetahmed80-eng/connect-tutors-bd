import { useEffect, useMemo, useState } from "react";
import { Download, Package } from "lucide-react";
import { toast } from "sonner";
import { ImageStudioFontPicker } from "@/components/ImageStudioFontPicker";
import { trpc } from "@/lib/trpc";
import {
  DEFAULT_BANGLA_FONT,
  DEFAULT_ENGLISH_FONT,
  findStudioFont,
  loadStudioFont,
  setUploadedStudioFonts,
  studioFontBoldWeight,
  studioFontFamily,
  studioFontRegularWeight,
  type StudioFontMarks,
} from "@/lib/image-studio-fonts";
import { saveBlob } from "@/lib/image-studio";
import { logoPngBlob, renderLogoSvg } from "@/lib/logo-export";
import {
  allLogoVariants,
  logoColourways,
  logoFileName,
  logoFormLabels,
  logoForms,
  type LogoForm,
  type LogoNameMode,
} from "@/lib/logo-studio";
import { buildZip } from "@/lib/zip";

const CHOICE_KEY = "connect-logo-studio-v1";
type Choice = { form: LogoForm; colourway: string; name: LogoNameMode; bn: string; en: string };
const DEFAULT_CHOICE: Choice = { form: "horizontal", colourway: "site-blue", name: "mixed", bn: DEFAULT_BANGLA_FONT, en: DEFAULT_ENGLISH_FONT };
const nameLabels: Record<LogoNameMode, string> = { bn: "বাংলা", en: "English", mixed: "মিশ্র" };
const scales = [1, 2, 3] as const;

const chip = (active: boolean) =>
  `h-control rounded-xl border px-3 text-sm font-semibold transition ${active ? "border-j-accent bg-j-accent text-white" : "border-j-border bg-white text-j-ink hover:bg-j-surface-sunken"} disabled:cursor-not-allowed disabled:opacity-40`;

function readChoice(): Choice {
  try {
    const saved = JSON.parse(window.localStorage.getItem(CHOICE_KEY) ?? "null") as Partial<Choice> | null;
    if (!saved) return DEFAULT_CHOICE;
    return {
      form: logoForms.includes(saved.form as LogoForm) ? (saved.form as LogoForm) : DEFAULT_CHOICE.form,
      colourway: logoColourways.some(way => way.id === saved.colourway) ? (saved.colourway as string) : DEFAULT_CHOICE.colourway,
      name: saved.name === "bn" || saved.name === "en" ? saved.name : "mixed",
      bn: saved.bn && findStudioFont(saved.bn)?.script === "bn" ? saved.bn : DEFAULT_BANGLA_FONT,
      en: saved.en && findStudioFont(saved.en)?.script === "en" ? saved.en : DEFAULT_ENGLISH_FONT,
    };
  } catch {
    return DEFAULT_CHOICE;
  }
}

/** The logo studio: the cradle mark in four forms and five colour ways, with the name in Bangla, English or both. */
export function LogoStudioContent() {
  const [choice, setChoice] = useState<Choice>(readChoice);
  const [scale, setScale] = useState<(typeof scales)[number]>(2);
  const [preview, setPreview] = useState<{ url: string; width: number; height: number } | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [ready, setReady] = useState(0);

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

  const update = (next: Partial<Choice>) => setChoice(previous => {
    const merged = { ...previous, ...next };
    try {
      window.localStorage.setItem(CHOICE_KEY, JSON.stringify(merged));
    } catch {
      // Without storage the choice resets next visit.
    }
    return merged;
  });

  const colourway = logoColourways.find(way => way.id === choice.colourway) ?? logoColourways[0];
  const fonts = useMemo(() => ({
    bnFamily: studioFontFamily(choice.bn),
    bnWeight: studioFontBoldWeight(choice.bn),
    enFamily: studioFontFamily(choice.en),
    enRegular: studioFontRegularWeight(choice.en),
    enBold: studioFontBoldWeight(choice.en),
  }), [choice.bn, choice.en, ready]);

  useEffect(() => {
    let cancelled = false;
    void Promise.all([loadStudioFont(choice.bn), loadStudioFont(choice.en)]).then(() => {
      if (!cancelled) setReady(count => count + 1);
    });
    return () => {
      cancelled = true;
    };
  }, [choice.bn, choice.en]);

  useEffect(() => {
    let cancelled = false;
    let url: string | null = null;
    void renderLogoSvg({ form: choice.form, name: choice.name, colourway, fonts, bnId: choice.bn, enId: choice.en }).then(built => {
      if (cancelled) return;
      url = URL.createObjectURL(new Blob([built.svg], { type: "image/svg+xml" }));
      setPreview({ url, width: built.width, height: built.height });
    }).catch(() => {
      if (!cancelled) setPreview(null);
    });
    return () => {
      cancelled = true;
      if (url) URL.revokeObjectURL(url);
    };
  }, [choice.form, choice.name, colourway, fonts, choice.bn, choice.en]);

  const build = (form: LogoForm, way = colourway) => renderLogoSvg({ form, name: choice.name, colourway: way, fonts, bnId: choice.bn, enId: choice.en });
  const run = async (what: string, work: () => Promise<void>) => {
    setBusy(what);
    try {
      await Promise.all([loadStudioFont(choice.bn), loadStudioFont(choice.en)]);
      await work();
    } catch (error) {
      toast.error((error as Error).message || "The logo could not be made.");
    } finally {
      setBusy(null);
    }
  };

  const downloadPng = () => run("png", async () => {
    const built = await build(choice.form);
    saveBlob(await logoPngBlob(built, scale), logoFileName(choice.form, colourway.id, choice.name, "png", scale));
  });
  const downloadSvg = () => run("svg", async () => {
    const built = await build(choice.form);
    saveBlob(new Blob([built.svg], { type: "image/svg+xml" }), logoFileName(choice.form, colourway.id, choice.name, "svg"));
  });
  const downloadAll = () => run("zip", async () => {
    const encoder = new TextEncoder();
    const entries: { path: string; data: Uint8Array }[] = [];
    for (const variant of allLogoVariants()) {
      const built = await build(variant.form, variant.colourway);
      const folder = `connect-tutors-logo/${variant.form}`;
      entries.push({ path: `${folder}/${logoFileName(variant.form, variant.colourway.id, choice.name, "svg")}`, data: encoder.encode(built.svg) });
      entries.push({ path: `${folder}/${logoFileName(variant.form, variant.colourway.id, choice.name, "png", scale)}`, data: new Uint8Array(await (await logoPngBlob(built, scale)).arrayBuffer()) });
    }
    saveBlob(new Blob([buildZip(entries) as BlobPart], { type: "application/zip" }), "connect-tutors-logo.zip");
  });

  const darkBackdrop = colourway.ink === "#ffffff" && colourway.ground === null;
  const showName = choice.form !== "icon";
  const pickers = (
    <>
      {choice.name !== "en" ? <ImageStudioFontPicker label="বাংলা" script="bn" value={choice.bn} onChange={bn => update({ bn })} marks={marks} canEdit={canEdit} onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })} onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()} onDelete={id => deleteFont.mutate({ id })} busy={setMark.isPending || deleteFont.isPending} /> : null}
      {choice.name !== "bn" ? <ImageStudioFontPicker label="English" script="en" value={choice.en} onChange={en => update({ en })} marks={marks} canEdit={canEdit} onMark={(id, change) => setMark.mutate({ kind: "font", itemId: id, ...change })} onUploaded={() => void utils.imageStudio.uploadedFonts.invalidate()} onDelete={id => deleteFont.mutate({ id })} busy={setMark.isPending || deleteFont.isPending} /> : null}
    </>
  );

  return <div className="space-y-4">
    <div className={`grid min-h-64 place-items-center rounded-xl border border-j-border p-4 sm:p-8 ${darkBackdrop ? "bg-[#0f2742]" : "bg-j-surface-sunken"}`}>
      {preview ? <img src={preview.url} alt={`${logoFormLabels[choice.form]} logo, ${colourway.label}`} data-testid="logo-preview" width={preview.width} height={preview.height} className="h-auto max-h-[50vh] w-auto max-w-full" /> : <p className="text-sm text-j-ink-soft">Drawing the logo…</p>}
    </div>

    <div className="space-y-4 rounded-xl border border-j-border bg-white p-4">
      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Form</legend>
        <div className="flex flex-wrap gap-2">
          {logoForms.map(form => <button key={form} type="button" aria-pressed={form === choice.form} onClick={() => update({ form })} className={chip(form === choice.form)}>{logoFormLabels[form]}</button>)}
        </div>
      </fieldset>

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Colour</legend>
        <div className="flex flex-wrap gap-2">
          {logoColourways.map(way => <button key={way.id} type="button" aria-pressed={way.id === choice.colourway} onClick={() => update({ colourway: way.id })} className={chip(way.id === choice.colourway)}>{way.label}</button>)}
        </div>
      </fieldset>

      {showName ? <fieldset className="space-y-3">
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Name</legend>
        <div className="flex flex-wrap gap-2">
          {(["mixed", "en", "bn"] as const).map(name => <button key={name} type="button" aria-pressed={name === choice.name} onClick={() => update({ name })} className={chip(name === choice.name)}>{nameLabels[name]}</button>)}
        </div>
        {pickers}
      </fieldset> : null}

      <fieldset>
        <legend className="mb-2 text-xs font-bold uppercase tracking-wide text-j-ink-soft">PNG scale</legend>
        <div className="flex gap-2">
          {scales.map(item => <button key={item} type="button" aria-pressed={item === scale} onClick={() => setScale(item)} className={chip(item === scale)}>{item}×</button>)}
        </div>
      </fieldset>

      <div className="flex flex-wrap gap-2">
        <button type="button" onClick={() => void downloadPng()} disabled={busy !== null} className="inline-flex h-control items-center gap-2 rounded-xl bg-j-accent px-5 text-sm font-bold text-white hover:bg-j-accent-hover disabled:opacity-60">
          <Download size={16} aria-hidden="true" /> Download PNG{preview ? ` · ${preview.width * scale}×${preview.height * scale}` : ""}
        </button>
        <button type="button" onClick={() => void downloadSvg()} disabled={busy !== null} className="inline-flex h-control items-center gap-2 rounded-xl border border-j-accent px-5 text-sm font-bold text-j-accent disabled:opacity-60">
          <Download size={16} aria-hidden="true" /> Download SVG
        </button>
        <button type="button" onClick={() => void downloadAll()} disabled={busy !== null} className="inline-flex h-control items-center gap-2 rounded-xl border border-j-border px-5 text-sm font-bold text-j-ink disabled:opacity-60">
          <Package size={16} aria-hidden="true" /> {busy === "zip" ? "Packing…" : "Download all (ZIP)"}
        </button>
      </div>
    </div>
  </div>;
}
