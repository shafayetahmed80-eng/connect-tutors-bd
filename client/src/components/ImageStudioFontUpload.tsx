import { useState } from "react";
import { Upload } from "lucide-react";
import { studioFontCategoryLabels, type StudioFontCategory, type StudioFontScript } from "@/lib/image-studio-fonts";

const ACCEPT = ".ttf,.otf,.woff,.woff2";
const MAX_BYTES = 10 * 1024 * 1024;

/** A file's name without its extension and with separators as spaces: "Li-Ador-Noirrit.ttf" -> "Li Ador Noirrit". */
export function fontNameFromFile(fileName: string) {
  return fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").trim().slice(0, 60);
}

/** The Owner's "Add font" form inside the font list: the file, its name, and its type. The language is the list's own. */
export function ImageStudioFontUpload({ script, onUploaded }: { script: StudioFontScript; onUploaded: () => void }) {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [name, setName] = useState("");
  const [category, setCategory] = useState<StudioFontCategory>("sans");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!open) {
    return <button type="button" onClick={() => setOpen(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-j-accent px-3 py-1 text-xs font-semibold text-j-accent">
      <Upload size={13} aria-hidden="true" /> Add font
    </button>;
  }

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!file) return setError("Choose a font file.");
    if (file.size > MAX_BYTES) return setError("Fonts must be 10 MB or smaller.");
    setBusy(true);
    setError(null);
    try {
      const form = new FormData();
      form.append("name", name.trim() || fontNameFromFile(file.name));
      form.append("script", script);
      form.append("category", category);
      form.append("font", file);
      const response = await fetch("/api/admin/image-studio/fonts", { method: "POST", body: form, credentials: "include" });
      const body = await response.json().catch(() => null) as { error?: string } | null;
      if (!response.ok) throw new Error(body?.error ?? "Unable to upload the font. Please try again.");
      setOpen(false);
      setFile(null);
      setName("");
      onUploaded();
    } catch (failure) {
      setError((failure as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const fileInputId = `font-upload-file-${script}`;
  const nameInputId = `font-upload-name-${script}`;
  return <form onSubmit={event => void submit(event)} className="space-y-2 rounded-xl border border-j-border p-3" aria-label="Add font">
    <label htmlFor={fileInputId} className="block text-xs font-bold text-j-ink-soft">Font file (.ttf, .otf, .woff, .woff2)</label>
    <input id={fileInputId} type="file" accept={ACCEPT} onChange={event => {
      const picked = event.target.files?.[0] ?? null;
      setFile(picked);
      if (picked && !name) setName(fontNameFromFile(picked.name));
    }} className="block w-full text-sm" />
    <label htmlFor={nameInputId} className="block text-xs font-bold text-j-ink-soft">Name</label>
    <input id={nameInputId} value={name} maxLength={60} onChange={event => setName(event.target.value)} className="h-control w-full rounded-xl border border-j-border px-3 text-sm" />
    <div className="flex flex-wrap gap-2" role="group" aria-label="Type of the new font">
      {(Object.keys(studioFontCategoryLabels) as StudioFontCategory[]).map(item => <button key={item} type="button" aria-pressed={item === category} onClick={() => setCategory(item)}
        className={`rounded-full border px-3 py-1 text-xs font-semibold ${item === category ? "border-j-accent bg-j-accent text-white" : "border-j-border text-j-ink"}`}>
        {studioFontCategoryLabels[item]}
      </button>)}
    </div>
    {error ? <p role="alert" className="text-xs font-semibold text-rose-600">{error}</p> : null}
    <div className="flex gap-2">
      <button type="submit" disabled={busy} className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-60">{busy ? "Uploading…" : "Upload"}</button>
      <button type="button" disabled={busy} onClick={() => { setOpen(false); setError(null); }} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
    </div>
  </form>;
}
