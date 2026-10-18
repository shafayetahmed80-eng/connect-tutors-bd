import { useState } from "react";
import { Archive, ArchiveRestore, ChevronDown, Plus, Star, Trash2 } from "lucide-react";
import { normalizeHexColour } from "@shared/colour-contrast";
import {
  checkColourPair,
  findStudioColour,
  visibleStudioColours,
  type StudioColour,
  type StudioColourMarks,
} from "@/lib/image-studio-colours";

function Swatch({ colour }: { colour: StudioColour }) {
  return <span className="flex shrink-0 overflow-hidden rounded-md border border-j-border" aria-hidden="true">
    <i className="block size-6" style={{ background: colour.ground }} />
    <i className="block size-6" style={{ background: colour.text }} />
    <i className="block size-6" style={{ background: colour.accent }} />
  </span>;
}

/** A colour field: the native picker and a hex box that stay in step; an unfinished hex never reaches the picker. */
function ColourField({ id, label, value, onChange }: { id: string; label: string; value: string; onChange: (hex: string) => void }) {
  const [draft, setDraft] = useState(value);
  return <div className="flex items-center gap-2">
    <label htmlFor={id} className="w-20 shrink-0 text-xs font-bold text-j-ink-soft">{label}</label>
    <input type="color" aria-label={`${label} colour`} value={value} onChange={event => { setDraft(event.target.value); onChange(event.target.value); }} className="h-control w-12 shrink-0 cursor-pointer rounded-lg border border-j-border bg-white p-1" />
    <input id={id} value={draft} maxLength={7} onChange={event => {
      setDraft(event.target.value);
      const hex = normalizeHexColour(event.target.value);
      if (hex) onChange(hex);
    }} className="h-control min-w-0 flex-1 rounded-xl border border-j-border px-3 text-sm tabular-nums" />
  </div>;
}

/** The Owner\x27s "Add colour" form: three colours, a name, and the contrast the pair really has. */
function AddColourForm({ onAdd, busy, onClose }: { onAdd: (colour: { name: string; ground: string; text: string; accent: string }) => void; busy: boolean; onClose: () => void }) {
  const [name, setName] = useState("");
  const [ground, setGround] = useState("#0b4b86");
  const [text, setText] = useState("#ffffff");
  const [accent, setAccent] = useState("#7cc4ff");
  const check = checkColourPair({ ground, text });
  const canSave = check.readable && name.trim().length > 0 && !busy;

  return <form onSubmit={event => { event.preventDefault(); if (canSave) onAdd({ name: name.trim(), ground, text, accent }); }} aria-label="Add colour" className="space-y-2 rounded-xl border border-j-border p-3">
    <label htmlFor="colour-name" className="block text-xs font-bold text-j-ink-soft">Name</label>
    <input id="colour-name" value={name} maxLength={40} onChange={event => setName(event.target.value)} className="h-control w-full rounded-xl border border-j-border px-3 text-sm" />
    <ColourField id="colour-ground" label="Background" value={ground} onChange={setGround} />
    <ColourField id="colour-text" label="Text" value={text} onChange={setText} />
    <ColourField id="colour-accent" label="Highlight" value={accent} onChange={setAccent} />
    <div className="grid place-items-center rounded-xl p-4 text-center text-lg font-bold" style={{ background: ground, color: text }}>
      অভিজ্ঞ শিক্ষক প্রয়োজন
      <span className="mt-2 block h-1.5 w-16 rounded-full" style={{ background: accent }} />
    </div>
    <p role="status" className={`text-xs font-semibold ${check.readable ? "text-emerald-700" : "text-rose-600"}`}>
      Text contrast {check.ratio.toFixed(1)} : 1 {check.readable ? "- readable" : "- too low, needs 4.5 or more"}
    </p>
    <div className="flex gap-2">
      <button type="submit" disabled={!canSave} className="h-control rounded-xl bg-j-accent px-4 text-sm font-bold text-white disabled:opacity-50">{busy ? "Saving…" : "Save colour"}</button>
      <button type="button" disabled={busy} onClick={onClose} className="h-control rounded-xl border border-j-border px-4 text-sm font-bold text-j-ink-soft">Cancel</button>
    </div>
  </form>;
}

export function ImageStudioColourPicker({ value, onChange, marks, canEdit, onMark, onAdd, onDelete, busy = false }: {
  value: string;
  onChange: (id: string) => void;
  marks: StudioColourMarks;
  /** The Project Owner: may star, archive, add and delete for every Admin. */
  canEdit: boolean;
  onMark: (id: string, change: { starred?: boolean; archived?: boolean }) => void;
  onAdd: (colour: { name: string; ground: string; text: string; accent: string }) => void;
  onDelete: (id: string) => void;
  busy?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const [showArchived, setShowArchived] = useState(false);
  const [adding, setAdding] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  const current = findStudioColour(value);
  const colours = visibleStudioColours({ marks, showArchived });
  const archivedCount = visibleStudioColours({ marks, showArchived: true }).length;

  return <div className="rounded-xl border border-j-border">
    <button type="button" onClick={() => setOpen(!open)} aria-expanded={open} aria-controls="colour-list" className="flex h-control w-full items-center gap-3 px-3 text-left">
      <span className="shrink-0 text-xs font-bold uppercase tracking-wide text-j-ink-soft">Colour</span>
      {current ? <Swatch colour={current} /> : null}
      <span className="min-w-0 flex-1 truncate text-sm font-semibold text-j-ink">{current ? `${current.code} · ${current.name}` : value}</span>
      <ChevronDown size={16} aria-hidden="true" className={`shrink-0 transition ${open ? "rotate-180" : ""}`} />
    </button>

    {open ? <div id="colour-list" className="space-y-3 border-t border-j-border p-3">
      <div className="flex flex-wrap gap-2">
        {canEdit && !adding ? <button type="button" onClick={() => setAdding(true)} className="inline-flex items-center gap-1.5 rounded-full border border-dashed border-j-accent px-3 py-1 text-xs font-semibold text-j-accent">
          <Plus size={13} aria-hidden="true" /> Add colour
        </button> : null}
        {canEdit && archivedCount > 0 ? <button type="button" aria-pressed={showArchived} onClick={() => setShowArchived(!showArchived)}
          className={`rounded-full border px-3 py-1 text-xs font-semibold ${showArchived ? "border-j-ink bg-j-ink text-white" : "border-j-border text-j-ink-soft"}`}>
          Archived ({archivedCount})
        </button> : null}
      </div>

      {adding ? <AddColourForm busy={busy} onClose={() => setAdding(false)} onAdd={colour => { onAdd(colour); setAdding(false); }} /> : null}

      <ul className="max-h-80 space-y-1 overflow-y-auto" aria-label="Colours">
        {colours.map(colour => {
          const mark = marks.get(colour.id);
          const selected = colour.id === value;
          return <li key={colour.id} className={`flex items-center gap-2 rounded-lg px-2 py-1.5 ${selected ? "bg-j-accent-wash" : "hover:bg-j-surface-sunken"}`}>
            <button type="button" onClick={() => { onChange(colour.id); setOpen(false); }} aria-pressed={selected} className="flex min-w-0 flex-1 items-center gap-2 text-left">
              <span className="w-9 shrink-0 text-xs font-bold tabular-nums text-j-ink-soft">{colour.code}</span>
              <Swatch colour={colour} />
              <span className="min-w-0 truncate text-sm">{colour.name}</span>
            </button>
            {canEdit ? <>
              <button type="button" disabled={busy} onClick={() => onMark(colour.id, { starred: !mark?.starred })} aria-pressed={Boolean(mark?.starred)} aria-label={`${mark?.starred ? "Unstar" : "Star"} ${colour.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-amber-500 hover:bg-white disabled:opacity-50">
                <Star size={16} aria-hidden="true" fill={mark?.starred ? "currentColor" : "none"} />
              </button>
              <button type="button" disabled={busy} onClick={() => onMark(colour.id, { archived: !mark?.archived })} aria-label={`${mark?.archived ? "Restore" : "Archive"} ${colour.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-j-ink-soft hover:bg-white disabled:opacity-50">
                {mark?.archived ? <ArchiveRestore size={16} aria-hidden="true" /> : <Archive size={16} aria-hidden="true" />}
              </button>
              {colour.own ? (confirmDelete === colour.id
                ? <span className="flex shrink-0 items-center gap-1 text-xs font-semibold">
                  <button type="button" disabled={busy} onClick={() => { onDelete(colour.id); setConfirmDelete(null); }} className="rounded-lg bg-rose-600 px-2 py-1 text-white">Delete</button>
                  <button type="button" onClick={() => setConfirmDelete(null)} className="rounded-lg border border-j-border px-2 py-1 text-j-ink-soft">Keep</button>
                </span>
                : <button type="button" disabled={busy} onClick={() => setConfirmDelete(colour.id)} aria-label={`Delete ${colour.name}`} className="grid size-8 shrink-0 place-items-center rounded-lg text-rose-600 hover:bg-white disabled:opacity-50">
                  <Trash2 size={16} aria-hidden="true" />
                </button>) : null}
            </> : mark?.starred ? <Star size={14} aria-label="Starred" className="shrink-0 text-amber-500" fill="currentColor" /> : null}
          </li>;
        })}
        {colours.length === 0 ? <li className="px-2 py-3 text-sm text-j-ink-soft">No colours here.</li> : null}
      </ul>
    </div> : null}
  </div>;
}
